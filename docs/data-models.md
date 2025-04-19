# Data Models & Schemas

## Workflow
- id, user_id, name, definition (JSON), created_at, updated_at

## Block
- id, type, parameters, position, workflow_id

## User
- id, email/wallet, preferences

## Execution Log
- id, workflow_id, status, error, started_at, finished_at
