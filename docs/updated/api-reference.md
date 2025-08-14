# Zzyra Platform - API Reference

## Overview

The Zzyra API is built with NestJS and provides RESTful endpoints for workflow automation, user management, and system administration. The API uses JWT authentication and follows REST conventions.

## Base URL

- **Development**: `http://localhost:3002/api`
- **Production**: `https://api.zzyra.com/api`

## Authentication

### JWT Authentication

The API uses JWT tokens for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Magic SDK Integration

Users authenticate through Magic SDK, which generates a DID token that is validated by the backend to create JWT sessions.

## API Endpoints

### Authentication

#### POST /auth/login

Authenticate user with Magic SDK DID token.

**Request Body:**

```json
{
  "email": "user@example.com",
  "didToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "isOAuth": false,
  "oauthProvider": null,
  "oauthUserInfo": null,
  "callbackUrl": "/dashboard"
}
```

**Response:**

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "session": {
    "expiresAt": "2024-12-31T23:59:59.000Z",
    "user": {
      "id": "user-123",
      "email": "user@example.com",
      "name": "user"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "accessToken": "access-token-123",
    "refreshToken": "refresh-token-123"
  },
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "profile": {
      "id": "profile-123",
      "fullName": "John Doe",
      "subscriptionTier": "free"
    }
  },
  "callbackUrl": "/dashboard"
}
```

#### POST /auth/logout

Logout user and invalidate session.

**Response:**

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### Workflows

#### GET /workflows

Get user's workflows with pagination.

**Query Parameters:**

- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `search` (string): Search term for workflow names
- `tags` (string): Filter by tags (comma-separated)

**Response:**

```json
{
  "data": [
    {
      "id": "workflow-123",
      "name": "DeFi Portfolio Tracker",
      "description": "Track portfolio performance across multiple protocols",
      "nodes": [...],
      "edges": [...],
      "isPublic": false,
      "tags": ["defi", "portfolio"],
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "version": 1
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 10
}
```

#### POST /workflows

Create a new workflow.

**Request Body:**

```json
{
  "name": "New Workflow",
  "description": "Workflow description",
  "nodes": [...],
  "edges": [...],
  "isPublic": false,
  "tags": ["tag1", "tag2"]
}
```

**Response:**

```json
{
  "id": "workflow-123",
  "name": "New Workflow",
  "description": "Workflow description",
  "nodes": [...],
  "edges": [...],
  "isPublic": false,
  "tags": ["tag1", "tag2"],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "version": 1
}
```

#### GET /workflows/:id

Get workflow by ID.

**Response:**

```json
{
  "id": "workflow-123",
  "name": "DeFi Portfolio Tracker",
  "description": "Track portfolio performance across multiple protocols",
  "nodes": [...],
  "edges": [...],
  "isPublic": false,
  "tags": ["defi", "portfolio"],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "version": 1
}
```

#### PUT /workflows/:id

Update workflow.

**Request Body:**

```json
{
  "name": "Updated Workflow Name",
  "description": "Updated description",
  "nodes": [...],
  "edges": [...],
  "isPublic": true,
  "tags": ["updated", "tags"]
}
```

#### DELETE /workflows/:id

Delete workflow.

**Response:**

```json
{
  "success": true,
  "message": "Workflow deleted successfully"
}
```

#### POST /workflows/:id/execute

Execute a workflow.

**Request Body:**

```json
{
  "input": {
    "param1": "value1",
    "param2": "value2"
  }
}
```

**Response:**

```json
{
  "executionId": "execution-123",
  "status": "pending",
  "message": "Workflow execution started"
}
```

### Executions

#### GET /executions

Get workflow executions with pagination.

**Query Parameters:**

- `workflowId` (string): Filter by workflow ID
- `status` (string): Filter by status (pending, running, completed, failed)
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)

**Response:**

```json
{
  "data": [
    {
      "id": "execution-123",
      "workflowId": "workflow-123",
      "status": "completed",
      "startedAt": "2024-01-01T00:00:00.000Z",
      "finishedAt": "2024-01-01T00:01:00.000Z",
      "error": null,
      "input": {...},
      "output": {...}
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 10
}
```

#### GET /executions/:id

Get execution details.

**Response:**

```json
{
  "id": "execution-123",
  "workflowId": "workflow-123",
  "status": "completed",
  "startedAt": "2024-01-01T00:00:00.000Z",
  "finishedAt": "2024-01-01T00:01:00.000Z",
  "error": null,
  "input": {...},
  "output": {...},
  "nodeExecutions": [
    {
      "id": "node-exec-123",
      "nodeId": "node-1",
      "status": "completed",
      "startedAt": "2024-01-01T00:00:00.000Z",
      "completedAt": "2024-01-01T00:00:30.000Z",
      "output": {...},
      "error": null
    }
  ]
}
```

#### POST /executions/:id/retry

Retry failed execution.

**Response:**

```json
{
  "success": true,
  "message": "Execution retry initiated",
  "newExecutionId": "execution-124"
}
```

#### POST /executions/:id/cancel

Cancel running execution.

**Response:**

```json
{
  "success": true,
  "message": "Execution cancelled successfully"
}
```

### Blocks

#### GET /blocks

Get available blocks.

**Query Parameters:**

- `category` (string): Filter by category
- `search` (string): Search term
- `isPublic` (boolean): Filter public blocks only

**Response:**

```json
{
  "data": [
    {
      "id": "block-123",
      "name": "HTTP Request",
      "description": "Make HTTP requests to external APIs",
      "category": "integration",
      "blockType": "http_request",
      "configuration": {...},
      "isPublic": true,
      "rating": 4.5,
      "usageCount": 1250
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 10
}
```

#### GET /blocks/:id

Get block details.

**Response:**

```json
{
  "id": "block-123",
  "name": "HTTP Request",
  "description": "Make HTTP requests to external APIs",
  "category": "integration",
  "blockType": "http_request",
  "configuration": {...},
  "executionCode": "async function execute(input) { ... }",
  "isPublic": true,
  "rating": 4.5,
  "usageCount": 1250,
  "tags": ["http", "api", "integration"]
}
```

### Custom Blocks

#### GET /custom-blocks

Get user's custom blocks.

**Response:**

```json
{
  "data": [
    {
      "id": "custom-block-123",
      "name": "Custom DeFi Block",
      "description": "Custom block for DeFi operations",
      "code": "async function execute(input) { ... }",
      "category": "defi",
      "isPublic": false,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 5,
  "page": 1,
  "limit": 10
}
```

#### POST /custom-blocks

Create custom block.

**Request Body:**

```json
{
  "name": "Custom Block",
  "description": "Block description",
  "code": "async function execute(input) { return { result: 'success' }; }",
  "category": "custom",
  "isPublic": false,
  "tags": ["custom", "block"]
}
```

### User Management

#### GET /user/profile

Get user profile.

**Response:**

```json
{
  "id": "user-123",
  "email": "user@example.com",
  "profile": {
    "id": "profile-123",
    "fullName": "John Doe",
    "avatarUrl": "https://example.com/avatar.jpg",
    "subscriptionTier": "pro",
    "subscriptionStatus": "active",
    "monthlyExecutionQuota": 1000,
    "monthlyExecutionCount": 150,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### PUT /user/profile

Update user profile.

**Request Body:**

```json
{
  "fullName": "John Doe",
  "avatarUrl": "https://example.com/avatar.jpg"
}
```

### Dashboard

#### GET /dashboard/metrics

Get dashboard metrics.

**Response:**

```json
{
  "totalWorkflows": 25,
  "totalExecutions": 150,
  "successRate": 0.95,
  "averageExecutionTime": 45.2,
  "monthlyUsage": {
    "executions": 150,
    "quota": 1000,
    "percentage": 15
  },
  "recentExecutions": [
    {
      "id": "execution-123",
      "workflowName": "DeFi Portfolio Tracker",
      "status": "completed",
      "startedAt": "2024-01-01T00:00:00.000Z",
      "duration": 30
    }
  ]
}
```

### Notifications

#### GET /notifications

Get user notifications.

**Query Parameters:**

- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `unread` (boolean): Filter unread notifications only

**Response:**

```json
{
  "data": [
    {
      "id": "notification-123",
      "title": "Workflow Completed",
      "message": "Your DeFi Portfolio Tracker workflow completed successfully",
      "type": "workflow_completed",
      "read": false,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "data": {
        "workflowId": "workflow-123",
        "executionId": "execution-123"
      }
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 10
}
```

#### PUT /notifications/:id/read

Mark notification as read.

**Response:**

```json
{
  "success": true,
  "message": "Notification marked as read"
}
```

### Billing

#### GET /billing/subscription

Get subscription details.

**Response:**

```json
{
  "id": "subscription-123",
  "status": "active",
  "tier": "pro",
  "currentPeriodStart": "2024-01-01T00:00:00.000Z",
  "currentPeriodEnd": "2024-02-01T00:00:00.000Z",
  "cancelAt": null,
  "pricingTier": {
    "id": "tier-pro",
    "name": "Pro",
    "priceMonthly": 29.99,
    "priceYearly": 299.99,
    "executionLimit": 1000,
    "workflowLimit": 50,
    "features": ["advanced_blocks", "priority_support", "team_collaboration"]
  }
}
```

#### POST /billing/subscription

Create or update subscription.

**Request Body:**

```json
{
  "tierId": "tier-pro",
  "billingCycle": "monthly"
}
```

## Error Responses

### Standard Error Format

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "details": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}
```

### Common HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `422` - Validation Error
- `500` - Internal Server Error

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Authentication endpoints**: 5 requests per minute per IP
- **General endpoints**: 100 requests per minute per user
- **Workflow execution**: 10 executions per minute per user

## WebSocket Support

Real-time updates are available via WebSocket connections for:

- Workflow execution status updates
- Node execution progress
- System notifications

**WebSocket URL**: `ws://localhost:3002/ws`

**Connection Headers**:

```
Authorization: Bearer <jwt-token>
```

## SDK and Client Libraries

### JavaScript/TypeScript

```typescript
import { ZyraClient } from '@zzyra/sdk';

const client = new ZyraClient({
  baseUrl: 'http://localhost:3002/api',
  token: 'your-jwt-token'
});

// Create workflow
const workflow = await client.workflows.create({
  name: 'My Workflow',
  nodes: [...],
  edges: [...]
});

// Execute workflow
const execution = await client.workflows.execute(workflow.id, {
  input: { param1: 'value1' }
});
```

## Testing

### API Testing with Swagger

The API includes interactive documentation via Swagger UI:

- **Development**: `http://localhost:3002/api/docs`
- **Production**: `https://api.zzyra.com/api/docs`

### Example cURL Requests

```bash
# Login
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","didToken":"token"}'

# Create workflow
curl -X POST http://localhost:3002/api/workflows \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Workflow","nodes":[],"edges":[]}'

# Execute workflow
curl -X POST http://localhost:3002/api/workflows/workflow-id/execute \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"input":{"param1":"value1"}}'
```

This API reference covers the core endpoints available in the current Zzyra platform implementation. Additional endpoints may be available based on the specific modules and features enabled in your deployment.
