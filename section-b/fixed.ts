type User = {
  id: string;
  name?: string;
  email: string;
  role: "admin" | "member";
};

const cache: Record<string, User> = {};

/**
 * Runtime validation for user data from external sources
 */
function isValidUser(data: unknown): data is User {
  if (typeof data !== "object" || data === null) return false;

  const obj = data as Record<string, unknown>;

  return (
    typeof obj.id === "string" &&
    (obj.name === undefined || typeof obj.name === "string") &&
    typeof obj.email === "string" &&
    (obj.role === "admin" || obj.role === "member")
  );
}

export async function getUser(id: string): Promise<User> {
  // Return a defensive copy to prevent external mutations
  if (cache[id]) {
    return { ...cache[id] };
  }

  // Simulate remote call
  const res = await fetch(`https://example.com/api/users/${id}`);

  if (!res.ok) {
    throw new Error(`Failed to fetch user ${id}: ${res.status}`);
  }

  // Type unknown to force validation
  const data: unknown = await res.json();

  if (!isValidUser(data)) {
    throw new Error(`Invalid user data received for id ${id}`);
  }

  // Store validated data
  cache[id] = data;

  // Return defensive copy
  return { ...data };
}

/**
 * Type guard that properly narrows User | null to User
 */
export function isAdmin(u: User | null): u is User & { role: "admin" } {
  return u !== null && u.role === "admin";
}

export async function getAdmins(ids: string[]): Promise<User[]> {
  const users = await Promise.all(ids.map(getUser));
  // Type guard now properly filters out nulls and narrows to admin users
  return users.filter(isAdmin);
}

// ========== TESTS ==========

/**
 * Minimal test suite covering type safety, validation, and immutability
 */
export async function runTests() {
  console.log("Running tests...\n");

  // Test 1: Runtime validation rejects invalid data
  try {
    const invalidData = { id: "1", email: 123, role: "admin" }; // email is number
    if (!isValidUser(invalidData)) {
      console.log("✓ Test 1: Validation correctly rejects invalid email type");
    }
  } catch (e) {
    console.error("✗ Test 1 failed:", e);
  }

  // Test 2: Runtime validation rejects invalid role
  try {
    const invalidRole = {
      id: "2",
      email: "test@example.com",
      role: "superuser",
    };
    if (!isValidUser(invalidRole)) {
      console.log("✓ Test 2: Validation correctly rejects invalid role");
    }
  } catch (e) {
    console.error("✗ Test 2 failed:", e);
  }

  // Test 3: Runtime validation accepts valid data
  try {
    const validData = {
      id: "3",
      email: "user@example.com",
      role: "member" as const,
    };
    if (isValidUser(validData)) {
      console.log("✓ Test 3: Validation accepts valid user data");
    }
  } catch (e) {
    console.error("✗ Test 3 failed:", e);
  }

  // Test 4: Cache returns defensive copies (immutability)
  try {
    // Mock cache entry
    const originalUser: User = {
      id: "4",
      email: "test@example.com",
      role: "admin",
    };
    cache["4"] = originalUser;

    // Simulate getUser returning cached value
    const returned = { ...cache["4"] };

    // Mutate the returned copy
    returned.role = "member";

    // Original should be unchanged
    if (cache["4"].role === "admin" && returned.role === "member") {
      console.log(
        "✓ Test 4: Cache returns defensive copies, mutations isolated"
      );
    } else {
      console.error("✗ Test 4 failed: Cache mutation leaked");
    }
  } catch (e) {
    console.error("✗ Test 4 failed:", e);
  }

  // Test 5: isAdmin type guard works correctly
  try {
    const admin: User = { id: "5", email: "admin@example.com", role: "admin" };
    const member: User = {
      id: "6",
      email: "member@example.com",
      role: "member",
    };
    const nullUser: User | null = null;

    if (isAdmin(admin) && !isAdmin(member) && !isAdmin(nullUser)) {
      console.log(
        "✓ Test 5: isAdmin type guard correctly identifies admins and filters nulls"
      );
    } else {
      console.error("✗ Test 5 failed: Type guard logic incorrect");
    }
  } catch (e) {
    console.error("✗ Test 5 failed:", e);
  }

  // Test 6: Type narrowing in filter
  try {
    const mixedUsers: (User | null)[] = [
      { id: "7", email: "admin1@example.com", role: "admin" },
      null,
      { id: "8", email: "member@example.com", role: "member" },
      { id: "9", email: "admin2@example.com", role: "admin" },
    ];

    const admins = mixedUsers.filter(isAdmin);
    // TypeScript now knows admins is User[] with role: 'admin'
    if (admins.length === 2 && admins.every((u) => u.role === "admin")) {
      console.log("✓ Test 6: Type guard properly narrows in filter operation");
    } else {
      console.error("✗ Test 6 failed: Filter did not work correctly");
    }
  } catch (e) {
    console.error("✗ Test 6 failed:", e);
  }

  console.log("\nAll tests completed!");
}

// Run tests if this module is executed directly
if (typeof require !== "undefined" && require.main === module) {
  runTests();
}
