# Type-Safe Feature Flag System

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Flag Management Service                  │
│  (Central source of truth - versioned flag configurations)  │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTPS/gRPC
                     │ (polling or webhooks)
        ┌────────────┼────────────┬──────────────┐
        │            │            │              │
        ▼            ▼            ▼              ▼
   ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
   │Service A│  │Service B│  │Service C│  │Frontend │
   └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘
        │            │            │              │
        ▼            ▼            ▼              ▼
   [In-Memory]  [In-Memory]  [In-Memory]   [localStorage]
   [Cache]      [Cache]      [Cache]       [Cache]
   5min TTL     5min TTL     5min TTL      5min TTL
```

**Flow:**
1. Services initialize client with defaults (immediate availability)
2. Background fetch updates cache every 60s
3. Requests check cache first (5min TTL), falling back to defaults
4. Graceful degradation on network failures

## Type Safety Features

### 1. Centralized Flag Definitions
```typescript
interface FlagDefinitions {
  'boolean-flag': boolean;
  'config-flag': { timeout: number; retries: number };
}
```
All flags defined in one place. TypeScript enforces:
- Flag names autocomplete
- Payload types match at call sites
- No runtime casting needed

### 2. Type Narrowing
```typescript
// Compiler enforces boolean flags
if (client.isEnabled('boolean-flag')) { }  // ✓
if (client.isEnabled('config-flag')) { }    // ✗ Compile error

// Compiler enforces config flags  
const cfg = client.getConfig('config-flag');  // ✓
const cfg = client.getConfig('boolean-flag'); // ✗ Compile error
```

### 3. Exhaustive Variant Checking
```typescript
const test = client.getConfig('ab-test-pricing');
switch (test.variant) {
  case 'control': break;
  case 'test-a': break;
  case 'test-b': break;
  // Compiler error if variant added but not handled
}
```

## Rollout Safety

### Progressive Rollout Pattern
```typescript
'feature-rollout': {
  enabled: boolean;           // Kill switch
  rolloutPercent: number;     // 0-100
  allowedUserIds?: string[];  // Override list
}
```

**Recommended Rollout Stages:**
1. **0% - Dark launch** (code deployed, flag off everywhere)
2. **1-5% - Canary** (internal users + small production sample)
3. **25% - Early adopters** (monitor error rates, performance)
4. **50% - Majority** (watch for load patterns)
5. **100% - Full rollout**
6. **Code cleanup** (remove flag after 2 weeks stability)

### Circuit Breaker Integration
```typescript
const config = client.getConfig('rate-limit-config');
if (errorRate > threshold) {
  // Auto-disable via admin API
  await updateFlag('feature-name', { enabled: false });
}
```

## Versioning Strategy

### Semantic Versioning for Flags
- **Major (v2.x)**: Breaking schema changes (remove fields, rename flags)
- **Minor (v1.5)**: Add optional fields, new flags
- **Patch (v1.4.1)**: Value updates only

### Backward Compatibility
```typescript
// Old services use v1 schema
'legacy-config': { timeout: number };

// New services use v2 schema  
'legacy-config': { timeout: number; retries?: number };
//                                   ^^^^^^^^ optional
```

**Migration Path:**
1. Add new fields as optional (minor version bump)
2. Deploy all services to support optional fields
3. Update flag service to populate new fields
4. Make fields required after full deployment (major version bump)

### Flag Lifecycle
```
[DRAFT] → [ACTIVE] → [DEPRECATED] → [REMOVED]
  ↓         ↓           ↓              ↓
 dev     production   30 days      60 days
        monitoring   warning     final removal
```

## Testing Strategy

### 1. Unit Tests with Mocks
```typescript
const mockClient = new MockFeatureFlagClient({ /* ... */ });
mockClient.setFlag('new-checkout-flow', true);

// Test both flag states
test('old checkout', () => {
  mockClient.setFlag('new-checkout-flow', false);
  expect(checkout()).toEqual(/* old behavior */);
});

test('new checkout', () => {
  mockClient.setFlag('new-checkout-flow', true);
  expect(checkout()).toEqual(/* new behavior */);
});
```

### 2. Integration Tests
```typescript
// Use environment-specific flag configs
const testFlagClient = new FeatureFlagClient({
  remoteUrl: process.env.FLAG_SERVICE_URL,
  serviceName: 'checkout-service-test',
  defaultFlags: testDefaults,
});
```

### 3. Contract Tests
```typescript
// Validate flag service responses match FlagDefinitions
test('flag service contract', async () => {
  const response = await fetch(flagServiceUrl);
  const data = await response.json();
  
  // Runtime validation (use Zod, io-ts, etc.)
  expect(validateFlagSchema(data)).toBe(true);
});
```

### 4. A/B Test Validation
```typescript
test('A/B variant distribution', () => {
  const variants = { control: 0, 'test-a': 0, 'test-b': 0 };
  
  for (let i = 0; i < 10000; i++) {
    const config = client.getConfig('ab-test-pricing');
    variants[config.variant]++;
  }
  
  // Each variant should be ~33% (±5%)
  Object.values(variants).forEach(count => {
    expect(count).toBeCloseTo(3333, -2);
  });
});
```

## Operational Considerations

### Monitoring
- **Metric**: Flag fetch success rate, cache hit rate, default fallback rate
- **Alert**: Flag service unavailable > 5min (degraded mode tolerable)
- **Dashboard**: Flag state per service, version skew detection

### Cache Invalidation
- Use versioned flag responses with ETags
- Invalidate local cache when version changes
- Max cache age: 5 minutes (balances staleness vs. load)

### Security
- Authenticate service requests (API keys, mTLS)
- Rate limit flag API to prevent abuse
- Audit log for flag changes (who, when, old/new values)

### Performance
- **Latency**: In-memory reads (<1μs), no blocking on network
- **Memory**: ~10KB per 100 flags (negligible)
- **Network**: 1 request/min per service (minimal overhead)

## Migration Guide for Existing Flags

1. **Audit existing flags**: List all boolean env vars, config toggles
2. **Define types**: Add to `FlagDefinitions` with proper payloads
3. **Provide defaults**: Ensure no service breakage during migration
4. **Deploy client**: Roll out `FeatureFlagClient` to all services
5. **Migrate callsites**: Replace old flag checks with typed calls
6. **Remove old system**: Clean up after 1 sprint of stability

---