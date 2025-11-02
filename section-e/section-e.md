## Code Review

### 🔴 Critical Issues

**1. Incomplete Code**
```typescript
res.s
```
The final line is truncated. This will cause a syntax error and break the application.

**2. Authentication Logic Inverted**
```typescript
- if (!user || user.password !== hash(password)) {
+ if (!user) return res.status(401).end();
+ if (user.passwordHash == hash(body.password)) {
```
The old code returned 401 when passwords **didn't match**. The new code returns success when they **do match**, but has **no else clause** for mismatched passwords. Failed login attempts will hang or return 200 OK.

**Fix:**
```typescript
if (!user || user.passwordHash !== hash(body.password)) {
  return res.status(401).json({ error: 'Invalid credentials' });
}
```

**3. Loose Equality (`==`) for Security-Critical Comparison**
```typescript
user.passwordHash == hash(body.password)
```
Always use strict equality (`===`) for security checks. Loose equality can cause type coercion issues.

**4. Information Leakage**
```typescript
return res.json({ user });
```
This likely exposes the entire user object including `passwordHash`, email, and other sensitive fields.

**Fix:**
```typescript
return res.json({ 
  user: { 
    id: user.id, 
    email: user.email 
    // only include safe fields
  } 
});
```

**5. Timing Attack Vulnerability**
```typescript
if (!user) return res.status(401).end();
if (user.passwordHash == hash(body.password)) {
```
Early return when user doesn't exist creates timing differences that reveal whether an email is registered.

**Fix:** Always hash the password even if user doesn't exist:
```typescript
const user = await db.users.findOne({ email: body.email });
const passwordHash = hash(body.password);

if (!user || user.passwordHash !== passwordHash) {
  return res.status(401).json({ error: 'Invalid credentials' });
}
```

---

### 🟡 Security Concerns

**6. `httpOnly: false` Removed → Cookie Now httpOnly by Default**
This is actually an **improvement** (httpOnly cookies prevent XSS attacks), but:
- `secure: true` should be added for production
- `sameSite: 'strict'` or `'lax'` should be set for CSRF protection

**Recommendation:**
```typescript
res.cookie('auth', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 24 * 60 * 60 * 1000 // 1 day
});
```

**7. Weak Hashing Function**
The `hash()` function is not shown, but it must use a proper password hashing algorithm (bcrypt, argon2, scrypt) with salt. If it's a simple hash like SHA-256, this is critically insecure.

---

### 🟠 Type Safety Issues

**8. `as any` Defeats Type Safety**
```typescript
const body = req.body as any;
```
This bypasses all type checking. Use proper types or validation:

```typescript
interface LoginRequest {
  email: string;
  password: string;
}

// Option 1: Type assertion with validation
const body = req.body as LoginRequest;
if (!body.email || !body.password) {
  return res.status(400).json({ error: 'Missing fields' });
}

// Option 2: Runtime validation (better)
import { z } from 'zod';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const result = LoginSchema.safeParse(req.body);
if (!result.success) {
  return res.status(400).json({ error: result.error });
}
const { email, password } = result.data;
```

---

### 🔵 Maintainability Issues

**9. Inconsistent Error Responses**
- Old code: `res.status(401).send('invalid')`
- New code: `res.status(401).end()` (no body)

Should use consistent JSON responses:
```typescript
res.status(401).json({ error: 'Invalid credentials' });
```

**10. Missing Input Validation**
No checks for:
- Email format
- Empty strings
- Missing fields
- Injection attacks

**11. Hardcoded JWT Secret Fallback**
```typescript
process.env.JWT_SECRET || 'dev'
```
Should fail hard in production if JWT_SECRET is missing:
```typescript
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error('JWT_SECRET must be set');
}
```

---

### ✅ Suggested Complete Implementation

```typescript
app.post('/login', async (req, res) => {
  try {
    // Validate input
    const { email, password } = req.body;
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Invalid request' });
    }

    // Fetch user and hash password (always hash to prevent timing attacks)
    const [user] = await Promise.all([
      db.users.findOne({ email }),
      // If using async hashing like bcrypt, hash here
    ]);
    const passwordHash = await hash(password); // Use bcrypt.compare in real code

    // Verify credentials
    if (!user || user.passwordHash !== passwordHash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) throw new Error('JWT_SECRET not configured');
    
    const token = jwt.sign(
      { id: user.id }, 
      jwtSecret,
      { expiresIn: '24h' }
    );

    // Set secure cookie
    res.cookie('auth', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000
    });

    // Return safe user data only
    return res.json({ 
      user: { 
        id: user.id, 
        email: user.email 
      } 
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
```