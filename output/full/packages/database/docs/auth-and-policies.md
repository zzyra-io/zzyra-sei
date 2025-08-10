# Authentication and Policy Enforcement

This document provides an overview of the JWT-based authentication system and policy enforcement mechanisms implemented in the Zzyra platform.

## Overview

The Zzyra platform uses a custom JWT-based authentication system and application-level policy enforcement to secure access to resources. This replaces Supabase's Row-Level Security (RLS) with a more flexible and powerful approach that works with Prisma.

## Authentication

### JWT Service

The `JwtService` handles token generation, verification, and management:

- **Token Generation**: Creates access and refresh tokens for users
- **Token Verification**: Validates tokens and extracts user information
- **Refresh Mechanism**: Allows extending sessions with refresh tokens

### Auth Service

The `AuthService` provides high-level authentication functionality:

- **Email Authentication**: Authenticate users with email and magic links
- **Wallet Authentication**: Authenticate users with blockchain wallets
- **Session Management**: Create, verify, and revoke user sessions

### Auth Middleware

The `auth.middleware.ts` provides middleware for API routes:

- **Token Extraction**: Extracts tokens from request headers or cookies
- **Authentication Verification**: Verifies user authentication
- **User Context Injection**: Injects user context into requests

## Policy Enforcement

### Policy Service

The `PolicyService` centralizes access control logic:

- **Resource Access Checks**: Methods to check access to workflows, executions, teams, etc.
- **Context Creation**: Creates policy contexts with user information
- **Audit Logging**: Logs access control decisions for auditing

### Policy Utilities

The `policy-utils.ts` provides utility functions for policy enforcement:

- **Access Where Clauses**: Generates where clauses for filtering resources
- **Policy Enforcement**: Enforces policies for specific resources
- **Context Creation**: Creates policy contexts from user IDs

### Base Repository

The `BaseRepository` integrates policy enforcement into all database operations:

- **Policy Context Creation**: Creates policy contexts for users
- **Policy Result Checking**: Checks policy results and throws appropriate errors
- **Audit Logging**: Logs database operations for auditing

## Usage Examples

### Authentication

```typescript
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

// Verify a token
const payload = await jwtService.verifyToken(token);

// Sign out
await authService.signOut(userId);
```

### Middleware

```typescript
// In Next.js API route
export const config = {
  matcher: ["/api/workflows/:path*", "/api/executions/:path*"],
};

export async function middleware(req: NextRequest) {
  return authMiddleware(req);
}

export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  const policyContext = await getPolicyContext(req);
  // Handle the request with proper policy enforcement
}
```

### Policy Enforcement

```typescript
// Check access to a workflow
const hasAccess = await policyService.checkWorkflowAccess(
  "workflow-id",
  context
);

// Create a policy context
const context = await policyService.createContext("user-id");

// Enforce a policy
const workflow = await enforcePolicy(
  "workflow-id",
  "user-id",
  (id, context) => policyService.checkWorkflowAccess(id, context),
  "Access to workflow denied"
);
```

### Repository Operations

```typescript
// Find workflows with policy enforcement
const workflows = await workflowRepository.findByUserId("user-id");

// Create a workflow with policy enforcement
const workflow = await workflowRepository.create(
  {
    name: "New Workflow",
    // ... other properties
  },
  "user-id"
);

// Update a workflow with policy enforcement
const updatedWorkflow = await workflowRepository.update(
  "workflow-id",
  { name: "Updated Workflow" },
  "user-id"
);
```

## Best Practices

1. **Always Pass User ID**: Always pass the user ID to repository methods to enforce access control policies
2. **Use Policy Contexts**: Create and use policy contexts for complex authorization scenarios
3. **Handle Access Denied Errors**: Properly handle `AccessDeniedError` exceptions in your application
4. **Audit Sensitive Operations**: Enable audit logging for sensitive operations
5. **Secure Tokens**: Store tokens securely and use HTTPS for all API requests
6. **Validate Inputs**: Validate all inputs before passing them to repository methods
7. **Use Middleware**: Use the authentication middleware for all protected API routes

## Migration from Supabase RLS

If you're migrating from Supabase RLS to this policy enforcement system:

1. Review existing RLS policies and map them to policy service methods
2. Update repository methods to use policy enforcement
3. Replace Supabase Auth with the JWT-based authentication system
4. Update API routes to use the authentication middleware
5. Test thoroughly to ensure all access controls are properly enforced

## Environment Variables

The authentication system requires the following environment variables:

```
JWT_SECRET="your-jwt-secret-key-change-in-production"
JWT_EXPIRES_IN="1d"
REFRESH_TOKEN_EXPIRES_IN="7"
```

Make sure these are properly set in your environment before using the authentication system.
