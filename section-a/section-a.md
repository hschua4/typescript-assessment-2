# Section A - Build Task — “Task Tracker” (API + minimal UI)

A production-ready Task Tracker built with TypeScript, Hono, and SQLite with a Nextjs frontend.

## Setup and Installation

### Prerequisites
- Node.js 18+ or 20+
- npm or yarn

### How to run

#### 1. API Server

```bash
# Change to api directory
cd api

# Create .env file
cp .env.example .env

# Install dependencies
npm install

# Run in development mode
npm run dev
```

#### 2. Frontend
```bash
# Change to web directory
cd web

# Create .env file
cp .env.example .env

# Install dependencies
npm install

# Run in development mode
npm run dev
```

## Design Decisions

### Type Safety
- **Strict TypeScript**: `strict: true` with all strict flags enabled
- **No `any` types**: All types explicitly defined
- **Branded types**: `TaskId` is a branded string to prevent accidental string usage
- **Discriminated unions**: Used for error types and task status
- **Runtime validation**: Zod schemas ensure runtime type safety

### Architecture
- **Repository Pattern**: Abstraction layer allows swapping SQLite for other databases
- **Service Layer**: Business logic separated from HTTP concerns
- **Dependency Injection**: Services receive dependencies via constructor
- **Error Handling**: Centralized error handling with custom error classes

### Concurrency Control
Optimistic locking using version numbers:
1. Client reads task with version N
2. Client updates task, sending version N
3. Server checks if current version is still N
4. If yes, update and increment version to N+1
5. If no, return 409 Conflict

### Security
- Bearer token authentication for write operations
- hono/secure-headers for security headers
- Input validation on all endpoints
- SQL injection prevention with parameterized queries

### Observability
- Structured logging with Winston
- Request/response logging
- Error logging with stack traces
- Health check endpoint

## Future Enhancements
- [ ] ETag/If-Match headers for HTTP-level concurrency
- [ ] In-memory caching for GET requests
- [ ] Rate limiting
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Database migrations
- [ ] Task assignment to users
- [ ] Task comments and attachments