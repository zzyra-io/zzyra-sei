# Zyra API

NestJS backend for the Zyra application.

## Setup

1. Install dependencies:

```bash
cd apps/api
npm install
```

2. Create a `.env` file based on `.env.example`:

```bash
cp src/.env.example .env
```

3. Start the development server:

```bash
npm run start:dev
```

## API Endpoints

### Workflow Executions

- `GET /api/executions` - Get workflow executions
  - Query parameters:
    - `workflowId` (required) - ID of the workflow
    - `limit` - Number of records to return (default: 10)
    - `offset` - Number of records to skip (default: 0)
    - `status` - Filter by status (default: 'all')
    - `sortKey` - Field to sort by (default: 'started_at')
    - `sortOrder` - Sort order (default: 'desc')

### Node Executions

- `GET /api/executions/nodes` - Get node executions for a workflow execution
  - Query parameters:
    - `executionId` (required) - ID of the workflow execution

### Node Logs

- `GET /api/executions/node-logs` - Get logs for a node execution
  - Query parameters:
    - `nodeExecutionId` (required) - ID of the node execution

### Execution Actions

- `POST /api/executions/:id/retry` - Retry a workflow execution
- `POST /api/executions/:id/cancel` - Cancel a workflow execution
- `POST /api/executions/:id/pause` - Pause a workflow execution
- `POST /api/executions/:id/resume` - Resume a workflow execution

## Documentation

API documentation is available at `/api/docs` when the server is running.
