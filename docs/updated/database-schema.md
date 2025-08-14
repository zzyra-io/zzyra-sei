# Zzyra Platform - Database Schema

## Overview

The Zzyra platform uses PostgreSQL with Prisma ORM. The schema is located at `packages/database/prisma/schema.prisma` and includes models for users, workflows, executions, blocks, and system management.

## Core Models

### User Management

#### User

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  profile   Profile?
  workflows Workflow[]
  executions WorkflowExecution[]
  customBlocks CustomBlock[]
  notifications Notification[]
  teamMembers TeamMember[]
  sessions Session[]
}
```

#### Profile

```prisma
model Profile {
  id                 String   @id @default(cuid())
  fullName           String?
  avatarUrl          String?
  subscriptionTier   String   @default("free")
  subscriptionStatus String   @default("active")
  monthlyExecutionQuota Int   @default(100)
  monthlyExecutionCount Int   @default(0)
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  // Relations
  userId String @unique
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### Workflow System

#### Workflow

```prisma
model Workflow {
  id          String   @id @default(cuid())
  name        String
  description String?
  nodes       Json     // Array of workflow nodes
  edges       Json     // Array of node connections
  isPublic    Boolean  @default(false)
  tags        String[] @default([])
  version     Int      @default(1)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  executions  WorkflowExecution[]
}
```

#### WorkflowExecution

```prisma
model WorkflowExecution {
  id         String   @id @default(cuid())
  status     String   // pending, running, completed, failed, cancelled
  startedAt  DateTime @default(now())
  finishedAt DateTime?
  error      String?
  input      Json?
  output     Json?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  // Relations
  workflowId String
  workflow   Workflow @relation(fields: [workflowId], references: [id], onDelete: Cascade)
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  nodeExecutions NodeExecution[]
}
```

#### NodeExecution

```prisma
model NodeExecution {
  id          String   @id @default(cuid())
  nodeId      String
  status      String   // pending, running, completed, failed
  startedAt   DateTime @default(now())
  completedAt DateTime?
  output      Json?
  error       String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  executionId String
  execution   WorkflowExecution @relation(fields: [executionId], references: [id], onDelete: Cascade)
}
```

### Block System

#### BlockLibrary

```prisma
model BlockLibrary {
  id            String   @id @default(cuid())
  name          String
  description   String?
  category      String
  blockType     String
  configuration Json?
  executionCode String?
  isPublic      Boolean  @default(true)
  rating        Float    @default(0)
  usageCount    Int      @default(0)
  tags          String[] @default([])
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

#### CustomBlock

```prisma
model CustomBlock {
  id          String   @id @default(cuid())
  name        String
  description String?
  code        String
  category    String
  isPublic    Boolean  @default(false)
  tags        String[] @default([])
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### System Management

#### Session

```prisma
model Session {
  id           String   @id @default(cuid())
  expiresAt    DateTime
  token        String   @unique
  accessToken  String   @unique
  refreshToken String   @unique
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  // Relations
  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

#### Notification

```prisma
model Notification {
  id        String   @id @default(cuid())
  title     String
  message   String
  type      String
  read      Boolean  @default(false)
  data      Json?
  createdAt DateTime @default(now())

  // Relations
  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

#### Team

```prisma
model Team {
  id          String   @id @default(cuid())
  name        String
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  members TeamMember[]
}
```

#### TeamMember

```prisma
model TeamMember {
  id       String   @id @default(cuid())
  role     String   @default("member") // owner, admin, member
  joinedAt DateTime @default(now())

  // Relations
  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  teamId String
  team   Team   @relation(fields: [teamId], references: [id], onDelete: Cascade)

  @@unique([userId, teamId])
}
```

### Billing System

#### PricingTier

```prisma
model PricingTier {
  id              String   @id @default(cuid())
  name            String
  priceMonthly    Float
  priceYearly     Float
  executionLimit  Int
  workflowLimit   Int
  features        String[] @default([])
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relations
  subscriptions Subscription[]
}
```

#### Subscription

```prisma
model Subscription {
  id                String   @id @default(cuid())
  status            String   // active, cancelled, past_due
  currentPeriodStart DateTime
  currentPeriodEnd   DateTime
  cancelAt           DateTime?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  // Relations
  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  tierId String
  tier   PricingTier @relation(fields: [tierId], references: [id])
}
```

### Blockchain Integration

#### BlockchainTransaction

```prisma
model BlockchainTransaction {
  id            String   @id @default(cuid())
  hash          String   @unique
  network       String
  fromAddress   String
  toAddress     String
  value         String
  gasUsed       String?
  gasPrice      String?
  status        String   // pending, confirmed, failed
  blockNumber   Int?
  confirmations Int      @default(0)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

## Key Relationships

### User Workflows

- One user can have many workflows
- Workflows belong to a single user
- Cascade delete when user is deleted

### Workflow Executions

- One workflow can have many executions
- Executions belong to a workflow and user
- Node executions belong to a workflow execution

### Block System

- Block library contains public blocks
- Custom blocks belong to users
- Blocks can be shared across workflows

### Team Collaboration

- Users can belong to multiple teams
- Teams have members with different roles
- Workflows can be shared within teams

## Database Operations

### Common Queries

#### Get User with Profile

```typescript
const user = await prisma.user.findUnique({
  where: { id: userId },
  include: { profile: true },
});
```

#### Get User Workflows with Executions

```typescript
const workflows = await prisma.workflow.findMany({
  where: { userId },
  include: {
    executions: {
      orderBy: { createdAt: "desc" },
      take: 5,
    },
  },
});
```

#### Get Execution with Node Details

```typescript
const execution = await prisma.workflowExecution.findUnique({
  where: { id: executionId },
  include: {
    workflow: true,
    nodeExecutions: {
      orderBy: { startedAt: "asc" },
    },
  },
});
```

### Migrations

#### Create Migration

```bash
cd packages/database
pnpm prisma migrate dev --name add_new_field
```

#### Apply Migrations

```bash
pnpm prisma migrate deploy
```

#### Reset Database

```bash
pnpm prisma migrate reset
```

## Indexes and Performance

### Primary Indexes

- All `id` fields are primary keys
- `User.email` has unique index
- `Session.token`, `Session.accessToken`, `Session.refreshToken` are unique
- `BlockchainTransaction.hash` is unique

### Recommended Indexes

```sql
-- For workflow queries
CREATE INDEX idx_workflow_user_id ON "Workflow"("userId");
CREATE INDEX idx_workflow_created_at ON "Workflow"("createdAt");

-- For execution queries
CREATE INDEX idx_execution_workflow_id ON "WorkflowExecution"("workflowId");
CREATE INDEX idx_execution_user_id ON "WorkflowExecution"("userId");
CREATE INDEX idx_execution_status ON "WorkflowExecution"("status");

-- For notification queries
CREATE INDEX idx_notification_user_read ON "Notification"("userId", "read");
```

## Data Validation

### Prisma Validation

- Email format validation
- Required field constraints
- Foreign key relationships
- Unique constraints

### Application Validation

- Workflow node structure validation
- Execution input/output validation
- Block code validation
- User permission checks

This schema provides the foundation for the Zzyra platform's core functionality. The models support user management, workflow creation and execution, block system, team collaboration, and billing features.
