# @zzyra/database

This package provides a centralized database access layer for the Zzyra platform, replacing Supabase with Prisma. It handles all database operations and is designed to be used by both the UI and worker components.

## Features

- **Type-safe database access**: Leveraging Prisma's type generation for complete type safety
- **Repository pattern**: Clean, consistent interface for database operations
- **Custom authentication**: JWT-based authentication system replacing Supabase Auth
- **Migration utilities**: Tools for migrating data from Supabase to Prisma
- **Validation**: Zod-based validation for all database operations

## Architecture

The package follows a modular architecture with the following components:

### Client

- `prisma`: Singleton instance of PrismaClient for database access

### Repositories

- `BaseRepository`: Abstract base class for all repositories
- `UserRepository`: User management and authentication
- `WorkflowRepository`: Workflow management
- `ExecutionRepository`: Workflow execution tracking
- `WalletRepository`: Blockchain wallet management
- `NotificationRepository`: User notification management

### Authentication

- `JwtService`: JWT token generation and verification
- `AuthService`: User authentication and session management
- `middleware`: Authentication middleware for API routes

### Policy Enforcement

- `PolicyService`: Centralized service for enforcing access control policies
- `policy-utils`: Utility functions for creating policy contexts and enforcing policies
- Application-level access control replacing Supabase Row-Level Security (RLS)

### Utilities

- `validation`: Zod schemas for data validation
- `pagination`: Utilities for paginated queries
- `migration`: Tools for migrating from Supabase to Prisma

## Getting Started

### Installation

```bash
# From the root of the monorepo
npm install
```

### Configuration

Create a `.env` file in the root of the package with the following variables:

```
DATABASE_URL="postgresql://username:password@localhost:5432/zzyra?schema=public"
JWT_SECRET="your-jwt-secret-key-change-in-production"
JWT_EXPIRES_IN="1d"
REFRESH_TOKEN_EXPIRES_IN="7"
```

### Usage

#### Importing the package

```typescript
// Import the entire package
import * as db from "@zzyra/database";

// Or import specific components
import { prisma, UserRepository, WorkflowRepository } from "@zzyra/database";
```

#### Using repositories

```typescript
// Create a repository instance
const userRepo = new UserRepository();

// Find a user by email
const user = await userRepo.findByEmail("user@example.com");

// Create a new user
const newUser = await userRepo.create({
  email: "newuser@example.com",
});
```

#### Authentication

```typescript
// Create an auth service instance
const authService = new AuthService();

// Authenticate with email
const authResult = await authService.authenticateWithMagic({
  email: "user@example.com",
  didToken: "magic-link-token",
});

// Authenticate with wallet
const walletAuthResult = await authService.authenticateWithWallet(
  "0x123456789abcdef",
  "1",
  "ethereum"
);

// Verify a session token
const userId = authService.verifySession(token);
```

#### Using middleware (Next.js)

```typescript
// In your API route
import { authMiddleware, getUserId, getPolicyContext } from "@zzyra/database";

export async function middleware(req: NextRequest) {
  return authMiddleware(req);
}

export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  const policyContext = await getPolicyContext(req);
  // Handle the request with proper policy enforcement
}
```

## Policy Enforcement

The database package includes a robust policy enforcement system to replace Supabase's Row-Level Security (RLS). This system ensures that users can only access resources they are authorized to access.

### Using the PolicyService

```typescript
import { PolicyService, PolicyContext } from "@zzyra/database";

const policyService = new PolicyService();

// Create a policy context
const context: PolicyContext = {
  userId: "user-123",
  isAdmin: false,
  teamIds: ["team-456"],
};

// Check access to a workflow
const hasAccess = await policyService.checkWorkflowAccess(
  "workflow-789",
  context
);

// Check access to an execution
const hasExecutionAccess = await policyService.checkExecutionAccess(
  "execution-123",
  context
);
```

### Policy Enforcement in Repositories

All repositories automatically enforce policies when provided with a user ID:

```typescript
const workflowRepo = new WorkflowRepository();

// This will only return workflows the user has access to
const workflows = await workflowRepo.findByUserId("user-123");

// This will enforce policies during creation
const newWorkflow = await workflowRepo.create(
  {
    name: "New Workflow",
    // ... other properties
  },
  "user-123"
);
```

## Migration from Supabase

To migrate data from Supabase to Prisma:

```typescript
import { MigrationService } from "@zzyra/database";

const migrationService = new MigrationService({
  supabaseUrl: "https://your-project.supabase.co",
  supabaseKey: "your-supabase-key",
});

// Migrate all data
const result = await migrationService.migrateAll();

// Or migrate specific tables
await migrationService.migrateUsers();
await migrationService.migrateWorkflows();
```

## Development

### Building the package

```bash
npm run build
```

### Generating Prisma client

```bash
npm run generate
```

### Running migrations

```bash
npm run migrate
```

### Testing

```bash
npm run test
```

## Best Practices

1. **Always use repositories**: Don't access the Prisma client directly from outside this package
2. **Validate inputs**: Use the validation utilities to validate data before database operations
3. **Handle errors**: Properly handle database errors and provide meaningful error messages
4. **Use transactions**: Use transactions for operations that modify multiple tables
5. **Paginate results**: Use pagination for queries that return large result sets
6. **Keep repositories focused**: Each repository should focus on a specific domain entity
7. **Enforce policies**: Always pass the user ID to repository methods to enforce access control policies
8. **Use policy contexts**: Create and use policy contexts for complex authorization scenarios
