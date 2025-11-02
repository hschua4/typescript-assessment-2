// 1) Branded ID to prevent cross-entity mixups
type Brand<T, B extends string> = T & { readonly __brand: B };
type UserId = Brand<string, 'UserId'>;
type TaskId = Brand<string, 'TaskId'>;

// 2) DeepReadonlyExcept<T, K> - deep readonly except keys in K (shallow)
type DeepReadonlyExcept<T, K extends keyof T> = /* your type */;

// 3) Jsonify<T> - converts T into a JSON-serializable structure
type Jsonify<T> = /* your type */;

// 4) TypedEventEmitter<E> where E is a map of event -> payload type
//    on('task:created', (p: { id: TaskId })) => void; etc.
class TypedEventEmitter<E extends Record<string, unknown>> {
  on<K extends keyof E>(event: K, handler: (payload: E[K]) => void): this { /* ... */ return this; }
  emit<K extends keyof E>(event: K, payload: E[K]): boolean { /* ... */ return true; }
}
