// ============================================================================
// 1) BRANDED TYPES - Prevent cross-entity mixups at compile time
// ============================================================================

type Brand<T, B extends string> = T & { readonly __brand: B };
type UserId = Brand<string, 'UserId'>;
type TaskId = Brand<string, 'TaskId'>;

// Helper functions to create branded values
const createUserId = (id: string): UserId => id as UserId;
const createTaskId = (id: string): TaskId => id as TaskId;

// Usage Example:
const userId = createUserId('user-123');
const taskId = createTaskId('task-456');

// ✅ This works - correct types
function assignTask(userId: UserId, taskId: TaskId): void {
  console.log(`Assigning ${taskId} to ${userId}`);
}
assignTask(userId, taskId);

// ❌ This fails at compile time - prevents mixups!
// assignTask(taskId, userId); // Error: Type 'TaskId' is not assignable to 'UserId'

/**
 * TRADEOFFS:
 * - Pros: Zero runtime cost, catches bugs at compile time
 * - Cons: Requires explicit casting when creating branded values
 * - Limitation: Brand is erased at runtime, so validation must happen at boundaries
 */


// ============================================================================
// 2) DEEP READONLY EXCEPT - Deep readonly with selective shallow keys
// ============================================================================

type DeepReadonlyExcept<T, K extends keyof T> = {
  readonly [P in keyof T]: P extends K 
    ? T[P]  // Keep specified keys shallow (mutable)
    : T[P] extends (infer U)[]
      ? ReadonlyArray<DeepReadonlyObject<U>>  // Arrays become readonly
      : T[P] extends object
        ? DeepReadonlyObject<T[P]>  // Recursively make objects readonly
        : T[P];  // Primitives stay as-is
};

// Helper type for recursion
type DeepReadonlyObject<T> = {
  readonly [P in keyof T]: T[P] extends (infer U)[]
    ? ReadonlyArray<DeepReadonlyObject<U>>
    : T[P] extends object
      ? DeepReadonlyObject<T[P]>
      : T[P];
};

// Usage Example:
interface Config {
  apiKey: string;
  metadata: {
    version: number;
    tags: string[];
  };
  settings: {
    timeout: number;
    retries: number;
  };
}

type RuntimeConfig = DeepReadonlyExcept<Config, 'settings'>;

const config: RuntimeConfig = {
  apiKey: 'secret',
  metadata: { version: 1, tags: ['prod'] },
  settings: { timeout: 5000, retries: 3 }
};

// ❌ Deep properties are readonly
// config.apiKey = 'new'; // Error
// config.metadata.version = 2; // Error
// config.metadata.tags.push('dev'); // Error

// ✅ Excepted keys remain mutable
config.settings = { timeout: 10000, retries: 5 };
config.settings.timeout = 15000;

/**
 * TRADEOFFS:
 * - Pros: Useful for configs where some parts need runtime mutation
 * - Cons: Complex type, can be slow for deeply nested structures
 * - Limitation: TS recursion depth limit (~50 levels), Function types not handled
 */


// ============================================================================
// 3) JSONIFY - Convert types to JSON-serializable representation
// ============================================================================

type Jsonify<T> = T extends string | number | boolean | null
  ? T  // JSON primitives pass through
  : T extends undefined | Function | symbol
    ? never  // These don't survive JSON serialization
    : T extends Date
      ? string  // Dates become ISO strings
      : T extends Map<any, any> | Set<any>
        ? never  // Maps and Sets don't serialize directly
        : T extends (infer U)[]
          ? Jsonify<U>[]  // Recursively jsonify array elements
          : T extends object
            ? { [K in keyof T as T[K] extends never ? never : K]: Jsonify<T[K]> }
            : never;

// Usage Example:
interface UserData {
  id: UserId;
  name: string;
  age: number;
  createdAt: Date;
  metadata?: Map<string, string>;
  calculate?: () => number;
  tags: string[];
  profile: {
    bio: string;
    lastLogin: Date;
  };
}

type SerializedUser = Jsonify<UserData>;
// Result type:
// {
//   id: UserId;
//   name: string;
//   age: number;
//   createdAt: string;  // Date -> string
//   // metadata: removed (Map)
//   // calculate: removed (Function)
//   tags: string[];
//   profile: {
//     bio: string;
//     lastLogin: string;  // Date -> string
//   };
// }

const serialized: SerializedUser = {
  id: createUserId('123'),
  name: 'Alice',
  age: 30,
  createdAt: '2025-11-02T00:00:00.000Z',
  tags: ['admin'],
  profile: {
    bio: 'Developer',
    lastLogin: '2025-11-01T12:00:00.000Z'
  }
};

/**
 * TRADEOFFS:
 * - Pros: Documents what survives JSON.stringify at type level
 * - Cons: Doesn't handle all edge cases (BigInt, circular refs)
 * - Limitation: Can't represent runtime JSON.stringify quirks (toJSON methods, etc.)
 */


// ============================================================================
// 4) TYPED EVENT EMITTER - Type-safe event handling
// ============================================================================

class TypedEventEmitter<E extends Record<string, unknown>> {
  private handlers: {
    [K in keyof E]?: Array<(payload: E[K]) => void>;
  } = {};

  on<K extends keyof E>(event: K, handler: (payload: E[K]) => void): this {
    if (!this.handlers[event]) {
      this.handlers[event] = [];
    }
    this.handlers[event]!.push(handler);
    return this;
  }

  emit<K extends keyof E>(event: K, payload: E[K]): boolean {
    const eventHandlers = this.handlers[event];
    if (!eventHandlers || eventHandlers.length === 0) {
      return false;
    }
    eventHandlers.forEach(handler => handler(payload));
    return true;
  }

  off<K extends keyof E>(event: K, handler: (payload: E[K]) => void): this {
    const eventHandlers = this.handlers[event];
    if (eventHandlers) {
      this.handlers[event] = eventHandlers.filter(h => h !== handler) as any;
    }
    return this;
  }

  removeAllListeners<K extends keyof E>(event?: K): this {
    if (event) {
      delete this.handlers[event];
    } else {
      this.handlers = {};
    }
    return this;
  }
}

// Usage Example:
interface AppEvents {
  'task:created': { id: TaskId; title: string };
  'task:completed': { id: TaskId; completedBy: UserId };
  'user:login': { userId: UserId; timestamp: Date };
  'error': { message: string; code: number };
}

const emitter = new TypedEventEmitter<AppEvents>();

// ✅ Type-safe event handling
emitter.on('task:created', (payload) => {
  // payload is correctly typed as { id: TaskId; title: string }
  console.log(`Task created: ${payload.title} (${payload.id})`);
});

emitter.on('user:login', (payload) => {
  // payload is correctly typed as { userId: UserId; timestamp: Date }
  console.log(`User ${payload.userId} logged in at ${payload.timestamp}`);
});

// ✅ Type-safe emission
emitter.emit('task:created', { 
  id: createTaskId('task-789'), 
  title: 'Build feature' 
});

// ❌ Compile-time errors for wrong payloads
// emitter.emit('task:created', { id: taskId }); // Error: missing 'title'
// emitter.emit('task:completed', { id: userId, completedBy: taskId }); // Error: wrong types

/**
 * TRADEOFFS:
 * - Pros: Full type safety, autocomplete for events and payloads, prevents runtime errors
 * - Cons: More verbose than untyped EventEmitter, can't dynamically add event types
 * - Limitation: Event names must be statically known, can't use string interpolation for event types
 * - Note: Generic 'once' method could be added similarly
 */


// ============================================================================
// INTEGRATION EXAMPLE - All patterns together
// ============================================================================

interface TaskData {
  id: TaskId;
  title: string;
  assignedTo: UserId;
  createdAt: Date;
  config: {
    priority: number;
    tags: string[];
  };
}

// Create a config that's deeply readonly except for runtime-modifiable parts
type TaskConfig = DeepReadonlyExcept<TaskData, 'config'>;

// Define what this looks like when serialized
type SerializedTask = Jsonify<TaskData>;

// Set up events for task lifecycle
interface TaskEvents {
  'created': SerializedTask;
  'updated': { id: TaskId; changes: Partial<SerializedTask> };
}

class TaskManager {
  private events = new TypedEventEmitter<TaskEvents>();

  createTask(data: TaskData): void {
    // Emit serialized version
    const serialized: SerializedTask = {
      id: data.id,
      title: data.title,
      assignedTo: data.assignedTo,
      createdAt: data.createdAt.toISOString(),
      config: data.config
    };
    
    this.events.emit('created', serialized);
  }

  onTaskCreated(handler: (task: SerializedTask) => void): void {
    this.events.on('created', handler);
  }
}

// Usage
const manager = new TaskManager();
manager.onTaskCreated((task) => {
  console.log(`Task ${task.id} created: ${task.title}`);
  console.log(`Created at: ${task.createdAt}`); // string, not Date
});