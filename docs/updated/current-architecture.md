# Zyra Platform - Current Architecture Documentation

## Overview

Zyra is a Web3 automation platform built as a monorepo with three main components: a Next.js frontend (`ui/`), a NestJS API server (`api/`), and a NestJS worker service (`zyra-worker/`). The platform uses PostgreSQL with Prisma ORM for data persistence and RabbitMQ for message queuing.

## Technology Stack

### Frontend (`apps/ui/`)

- **Framework**: Next.js 15.3.1 (App Router)
- **Language**: TypeScript 5.x
- **UI Library**: React 19.0.0
- **Styling**: Tailwind CSS 3.4.17, Radix UI components
- **State Management**: Zustand 5.0.4 with persistence
- **Authentication**: Magic SDK 29.0.6 (Web3 wallet authentication)
- **Web3 Integration**: Wagmi 2.5.7, Viem 2.8.5, ConnectKit 1.7.1
- **Workflow Builder**: React Flow (@xyflow/react 12.6.0)
- **Code Editor**: CodeMirror 6.x
- **Deployment**: Netlify

### API Server (`apps/api/`)

- **Framework**: NestJS 10.0.0
- **Language**: TypeScript 5.1.3
- **Authentication**: JWT with Passport.js
- **Validation**: class-validator, class-transformer
- **Documentation**: Swagger/OpenAPI
- **AI Integration**: OpenRouter AI SDK

### Worker Service (`apps/zyra-worker/`)

- **Framework**: NestJS 10.0.0
- **Language**: TypeScript 5.1.3
- **Message Queue**: RabbitMQ with amqplib
- **AI Integration**: LangChain, OpenRouter, Ollama
- **Blockchain**: Goat SDK, Ethers.js, Viem
- **Monitoring**: Prometheus, Winston logging
- **Health Checks**: NestJS Terminus

### Database Layer

- **Database**: PostgreSQL 14 (Docker Compose)
- **ORM**: Prisma 5.22.0
- **Schema Location**: `packages/database/prisma/schema.prisma`
- **Migrations**: Prisma migrations
- **Client**: Shared Prisma client in `@zyra/database` package

### Shared Packages

- **`@zyra/database`**: Prisma client, repositories, authentication services
- **`@zyra/types`**: Shared TypeScript types and schemas
- **`@zyra/blocks`**: Block library and utilities

### Infrastructure

- **Package Manager**: pnpm 9.15.2
- **Monorepo**: Turbo 2.5.3
- **Containerization**: Docker Compose
- **Message Queue**: RabbitMQ
- **Development**: Hot reloading, TypeScript compilation

## Architecture Diagram

```mermaid
graph TD
    User[User] --> Browser[Browser: Next.js UI]
    Browser --> API[NestJS API Server]
    API --> DB[(PostgreSQL + Prisma)]
    API --> Worker[NestJS Worker Service]
    Worker --> DB
    Worker --> MQ[RabbitMQ]
    Worker --> External[External APIs: Web3, AI, etc.]
    Browser --> Auth[Magic SDK Auth]
    Auth --> DB
    MQ --> Worker
    DB --> Prisma[Prisma ORM]
```

## Component Breakdown

### 1. Frontend Application (`apps/ui/`)

**Responsibilities:**

- User authentication via Magic SDK
- Workflow builder with drag-and-drop interface
- Block catalog and configuration
- Dashboard and analytics
- Settings and billing management
- Real-time execution monitoring

**Key Features:**

- Visual workflow builder using React Flow
- AI Copilot integration for workflow generation
- Web3 wallet integration
- Real-time execution status updates
- Responsive design with Tailwind CSS

**Directory Structure:**

```
apps/ui/
├── app/                    # Next.js App Router pages
│   ├── dashboard/         # Dashboard pages
│   ├── workflow/          # Workflow builder
│   ├── blocks/           # Block catalog
│   ├── settings/         # User settings
│   └── api/              # API routes
├── components/            # React components
│   ├── ui/               # Radix UI components
│   ├── workflow-builder/ # Workflow builder components
│   ├── blocks/           # Block components
│   └── web3/             # Web3 integration components
├── lib/                  # Core logic and services
│   ├── api/              # API client functions
│   ├── services/         # Business logic services
│   ├── web3/             # Web3 utilities
│   └── ai/               # AI integration
├── hooks/                # Custom React hooks
├── types/                # TypeScript type definitions
└── public/               # Static assets
```

### 2. API Server (`apps/api/`)

**Responsibilities:**

- RESTful API endpoints
- Authentication and authorization
- Request validation and transformation
- Business logic orchestration
- Database operations via repositories

**Key Modules:**

- **AuthModule**: JWT authentication, Magic SDK integration
- **UserModule**: User management and profiles
- **WorkflowsModule**: Workflow CRUD operations
- **ExecutionsModule**: Execution management
- **BlocksModule**: Block library management
- **NotificationsModule**: Notification system
- **BillingModule**: Subscription and billing
- **AiModule**: AI integration endpoints
- **DashboardModule**: Analytics and metrics

**Directory Structure:**

```
apps/api/src/
├── auth/                 # Authentication module
├── user/                 # User management
├── workflows/            # Workflow operations
├── executions/           # Execution management
├── blocks/               # Block library
├── notifications/        # Notification system
├── billing/              # Billing and subscriptions
├── ai/                   # AI integration
├── dashboard/            # Analytics and metrics
├── database/             # Database configuration
└── main.ts              # Application entry point
```

### 3. Worker Service (`apps/zyra-worker/`)

**Responsibilities:**

- Asynchronous workflow execution
- Message queue processing
- External API integrations
- Blockchain interactions
- AI model interactions
- Execution logging and monitoring

**Key Components:**

- **ExecutionWorker**: Main worker orchestrator
- **WorkflowExecutor**: Workflow execution engine
- **BlockHandlers**: Individual block execution logic
- **RabbitMQService**: Message queue management
- **DatabaseService**: Database operations
- **AIModule**: AI service integrations
- **BlockchainModule**: Web3 interactions

**Directory Structure:**

```
apps/zyra-worker/src/
├── workers/              # Worker implementations
│   ├── execution-worker.ts
│   ├── workflow-executor.ts
│   └── handlers/         # Block handlers
├── services/             # Business services
├── lib/                  # Shared libraries
├── modules/              # Feature modules
├── controllers/          # HTTP controllers
└── main.ts              # Application entry point
```

### 4. Database Layer (`packages/database/`)

**Responsibilities:**

- Prisma schema definition
- Database client management
- Repository pattern implementation
- Authentication services
- Data validation and transformation

**Key Components:**

- **Prisma Schema**: Complete database schema with 20+ models
- **Repositories**: Data access layer for all entities
- **AuthService**: Authentication and session management
- **JwtService**: JWT token management
- **DynamicService**: Dynamic SDK integration

**Database Models:**

- **User & Profile**: User management and profiles
- **Workflow & WorkflowExecution**: Workflow definitions and executions
- **BlockLibrary & CustomBlock**: Block system
- **NodeExecution & ExecutionLog**: Execution tracking
- **Notification & NotificationPreference**: Notification system
- **Subscription & PricingTier**: Billing system
- **Team & TeamMember**: Team collaboration
- **BlockchainTransaction**: Transaction tracking

## Data Flow

### Workflow Execution Flow

1. **User Initiates Execution**: User triggers workflow via UI
2. **API Validation**: API validates request and creates execution record
3. **Queue Message**: Execution details sent to RabbitMQ queue
4. **Worker Processing**: Worker picks up message and claims execution
5. **Node Execution**: Worker executes nodes sequentially
6. **External Calls**: Worker makes API calls to Web3, AI services, etc.
7. **Status Updates**: Worker updates execution status and logs
8. **Real-time Updates**: UI receives updates via polling or WebSocket

### Authentication Flow

1. **Dynamic SDK**: User authenticates via Dynamic SDK (wallet connection)
2. **Token Validation**: Backend validates Dynamic JWT token
3. **User Creation**: User created/retrieved from database
4. **JWT Generation**: Backend generates JWT access token
5. **Session Management**: Refresh tokens managed for session persistence
6. **API Authorization**: JWT used for API endpoint authorization

## Development Setup

### Prerequisites

- Node.js 20.3.0+
- pnpm 9.15.2+
- Docker and Docker Compose
- Git

### Environment Setup

1. **Clone Repository**:

   ```bash
   git clone <repository-url>
   cd zyra
   ```

2. **Install Dependencies**:

   ```bash
   pnpm install
   ```

3. **Start Infrastructure**:

   ```bash
   # Start PostgreSQL and RabbitMQ
   docker-compose -f setup-compose.yml up -d
   ```

4. **Database Setup**:

   ```bash
   # Generate Prisma client
   cd packages/database
   pnpm prisma generate

   # Run migrations
   pnpm prisma migrate dev --name init
   ```

5. **Environment Variables**:
   Create `.env` files in each app directory with:

   ```env
   # Database
   DATABASE_URL="postgresql://zzyra:zzyra@localhost:5433/zyra?schema=public"

   # JWT
   JWT_SECRET="your-jwt-secret-key"

   # Dynamic SDK
   NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID="your-dynamic-environment-id"

   # AI Services
   OPENROUTER_API_KEY="your-openrouter-key"

   # RabbitMQ
   RABBIT_MQ_URL="amqp://guest:guest@localhost:5672"
   ```

6. **Start Development Servers**:

   ```bash
   # Start all services
   pnpm dev

   # Or start individually
   pnpm dev:ui        # Frontend
   pnpm dev:api       # API server
   pnpm dev:worker    # Worker service
   ```

## Deployment

### Frontend (Netlify)

- Framework: Next.js
- Build Command: `pnpm build`
- Publish Directory: `apps/ui/.next`
- Environment Variables: Configure in Netlify dashboard

### API Server

- Platform: Node.js server (AWS EC2, Google Cloud, etc.)
- Process Manager: PM2
- Environment: Production environment variables
- Health Checks: `/health` endpoint

### Worker Service

- Platform: Node.js server or container
- Scaling: Multiple instances for high throughput
- Monitoring: Prometheus metrics and health checks
- Logging: Winston with structured logging

### Database

- Platform: PostgreSQL (AWS RDS, Google Cloud SQL, etc.)
- Migrations: Prisma migrations in CI/CD pipeline
- Backups: Automated database backups
- Monitoring: Database performance monitoring

## Security Considerations

- **Authentication**: JWT tokens with secure secrets
- **Authorization**: Role-based access control
- **Data Validation**: Input validation at API layer
- **SQL Injection**: Prisma ORM prevents SQL injection
- **Rate Limiting**: API rate limiting implementation
- **CORS**: Proper CORS configuration
- **Environment Variables**: Secure secret management

## Monitoring and Observability

- **Logging**: Structured logging with Winston
- **Metrics**: Prometheus metrics collection
- **Health Checks**: Health endpoints for all services
- **Error Tracking**: Error monitoring and alerting
- **Performance**: Application performance monitoring
- **Database**: Database performance monitoring

## Migration Notes

### From Supabase to Prisma/PostgreSQL

The platform has migrated from Supabase to a standard PostgreSQL setup with Prisma ORM:

**Key Changes:**

- **Database**: Supabase → PostgreSQL with Docker Compose
- **ORM**: Supabase Client → Prisma ORM
- **Authentication**: Supabase Auth → Magic SDK + JWT
- **Real-time**: Supabase Realtime → Polling/WebSocket
- **Storage**: Supabase Storage → File system or S3

**Remaining Supabase References:**

- Some UI services still reference Supabase (marked for migration)
- Authentication flow partially migrated
- Real-time features need WebSocket implementation

**Migration Status:**

- ✅ Database schema migrated to Prisma
- ✅ API server using Prisma repositories
- ✅ Worker service using Prisma
- 🔄 UI authentication migration in progress
- 🔄 Real-time features migration pending
- 🔄 File storage migration pending

This documentation reflects the current state of the codebase as of the analysis date. The platform is actively being developed and may have additional features or changes not documented here.
