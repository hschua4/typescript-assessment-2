## Key Tradeoffs & Limitations:

**1. Branded Types:**
- Zero runtime cost, purely compile-time safety
- Requires explicit casting at boundaries (unavoidable in TypeScript)
- Brand erasure at runtime means validation must happen when creating values

**2. DeepReadonlyExcept:**
- Most complex type due to recursion requirements
- TypeScript has ~50 level recursion limit (rarely hit in practice)
- Doesn't handle Function types specially (treats as objects)
- Performance can degrade with very deep nesting during compilation

**3. Jsonify:**
- Can't capture runtime behaviors like `toJSON()` methods
- Doesn't handle BigInt (would need additional cases)
- Circular references aren't representable in type system
- Optional properties remain optional (JSON.stringify removes undefined)

**4. TypedEventEmitter:**
- Event names must be literal types (can't use string interpolation like `user:${id}`)
- Adding event types dynamically at runtime loses type safety
- Each method call is fully type-checked, which adds compile time
- The `as any` cast in `off` is needed due to array filter inference limitations

The integration example at the end shows how these patterns work together in a realistic scenario. All types are fully functional and the examples demonstrate both correct usage and compile-time error prevention.