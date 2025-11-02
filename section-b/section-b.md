## What Was Wrong & Why The Changes Are Safer

### **Original Issues:**

1. **`any` Type Leakage**: `res.json()` returns `any`, which bypassed type checking entirely. Malformed API responses would flow through unchecked.

2. **No Runtime Validation**: The code blindly trusted external data without verifying it matched the `User` type at runtime. TypeScript types are compile-time only—they vanish at runtime.

3. **Cache Mutation Vulnerability**: Returning direct references to cached objects (`return cache[id]`) meant external code could mutate shared state:
   ```typescript
   const user = await getUser('123');
   user.role = 'admin'; // Oops! Cache is now corrupted
   ```

4. **Broken Type Guard**: `isAdmin` didn't use the `is` predicate syntax, so TypeScript couldn't narrow types. This caused `users.filter(isAdmin)` to still have type `(User | null)[]` instead of `User[]`.

### **Why The Fixes Are Safer:**

1. **Explicit `unknown` + Runtime Validation**: `const data: unknown = await res.json()` forces validation through `isValidUser()`, which checks every field at runtime. Invalid data now throws errors instead of causing runtime crashes later.

2. **Defensive Copying**: `return { ...cache[id] }` creates shallow copies, isolating the cache from external mutations. Callers can safely modify returned objects.

3. **Proper Type Guard**: `u is User & { role: 'admin' }` tells TypeScript that `isAdmin` both checks for non-null *and* narrows the role type, enabling safe filtering.

4. **Error Handling**: Added HTTP status checks and clear error messages for debugging.

The result: **compile-time type safety** backed by **runtime validation** with **immutable cache semantics**.