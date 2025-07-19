# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Commands
```bash
# Install dependencies
pnpm install

# Start all services in development
pnpm dev

# Build all packages
pnpm build

# Run tests across all packages
pnpm test

# Lint all packages
pnpm lint
```

### Individual Service Commands
```bash
# Frontend development (Next.js)
pnpm dev:ui              # http://localhost:3000

# API development (NestJS)
pnpm dev:api             # http://localhost:3001

# Worker development (NestJS)
pnpm dev:worker          # http://localhost:3005

# Start all services simultaneously
pnpm dev:all
```

### Database Commands
```bash
# Generate Prisma client after schema changes
cd packages/database && pnpm run generate

# Create and apply database migrations
cd packages/database && pnpm run migrate

# Deploy migrations to production
cd packages/database && pnpm run migrate:deploy

# Push schema changes to development database
cd packages/database && pnpm run db:push

# Open Prisma Studio for database management
cd packages/database && pnpm run db:studio
```

### Documentation
```bash
# Generate API documentation (Compodoc)
pnpm docs:generate

# Build and serve documentation
pnpm docs:build && pnpm docs:serve
```

### Testing
```bash
# Run tests with coverage
pnpm test:cov            # Individual packages have this script

# Run end-to-end tests
pnpm test:e2e            # Individual packages have this script
```

## Architecture Overview

### Monorepo Structure
This is a Turbo monorepo with the following structure:

- **`apps/ui/`** - Next.js 15 frontend with App Router, React 19, TypeScript
- **`apps/api/`** - NestJS API server for REST endpoints and authentication
- **`apps/zyra-worker/`** - NestJS worker service for workflow execution and processing
- **`packages/database/`** - Prisma schema, migrations, repositories, and database utilities
- **`packages/types/`** - Shared TypeScript types and schemas across all apps

### Key Technologies
- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS, Radix UI, TanStack Query
- **Backend**: NestJS, TypeScript, Prisma ORM, PostgreSQL
- **Infrastructure**: Docker, Redis, RabbitMQ, WebSockets
- **AI/ML**: OpenRouter, Ollama, various AI SDK providers
- **Blockchain**: Viem, Wagmi, Ethers.js, Magic SDK, Coinbase AgentKit
- **Build System**: Turbo, pnpm workspaces

### Core Business Logic

#### Workflow System
The application is built around an AI-powered workflow automation platform:

1. **Block-Based Architecture**: Workflows are composed of executable "blocks" (nodes)
2. **AI Generation**: Users can create custom blocks using natural language via AI
3. **Visual Builder**: React Flow-based drag-and-drop workflow editor
4. **Execution Engine**: Worker service processes workflows with real-time updates
5. **Multi-Industry Support**: Templates for DeFi, Healthcare, Gaming, Enterprise automation

#### Key Services
- **Workflow Execution**: `apps/zyra-worker/src/workers/workflow-executor.ts`
- **Block Management**: `apps/api/src/blocks/` and `apps/ui/components/blocks/`
- **AI Integration**: `apps/ui/lib/ai/` and AI provider configurations
- **Authentication**: Magic SDK integration with JWT tokens
- **Database Layer**: Repository pattern in `packages/database/src/repositories/`

#### Data Flow
1. **Frontend** creates/edits workflows using visual builder
2. **API** validates and stores workflow definitions 
3. **Worker** executes workflows, processes blocks, sends real-time updates
4. **Database** persists all workflow data, executions, and user information

### Authentication System
- Magic SDK for passwordless authentication
- JWT tokens with refresh token rotation
- Row-level security (RLS) policies in database
- Protected routes with middleware in Next.js

### Development Patterns

#### Frontend (Next.js)
- Server Components by default, Client Components marked with `'use client'`
- App Router with route groups: `(auth)`, `(dashboard)`
- TanStack Query for server state management
- Zustand for client state management
- React Hook Form with Zod validation
- Tailwind CSS with custom component variants using `class-variance-authority`

#### Backend (NestJS)
- Modular architecture with feature-based modules
- Repository pattern for database access
- DTOs with class-validator for input validation
- Guards for authentication and authorization
- Exception filters for database and custom errors
- Health checks for monitoring

#### Database (Prisma)
- PostgreSQL with Prisma ORM
- Row-level security (RLS) for multi-tenant data isolation
- Repository pattern with base repository class
- Comprehensive migration system
- Extensions for analytics, audit logging, caching

### Important File Patterns

#### Configuration Files
- Environment variables: `.env` files in each app directory
- Prisma schema: `packages/database/prisma/schema.prisma`
- Turbo configuration: `turbo.json`
- Package dependencies: Workspace references using `workspace:*`

#### Code Organization
- Shared types: `packages/types/src/`
- Database repositories: `packages/database/src/repositories/`
- Block definitions: `apps/ui/components/blocks/` and `packages/types/src/workflow/`
- AI providers: `apps/ui/lib/ai-providers/`
- Worker execution: `apps/zyra-worker/src/workers/`

### Testing Strategy
- Unit tests using Jest
- Component tests with React Testing Library
- End-to-end tests for critical workflows
- Database tests with transaction rollback
- Coverage thresholds enforced

### Key Development Rules
1. Always run database migrations after schema changes
2. Generate Prisma client after any database changes: `cd packages/database && pnpm run generate`
3. Use workspace dependencies (`workspace:*`) for internal packages
4. Follow the established repository pattern for database access
5. Implement proper error handling with custom exception filters
6. Use TypeScript strict mode and proper type definitions
7. Follow the monorepo dependency guidelines in `.cursor/rules/`

### Environment Setup
1. Copy `.env.example` to `.env` in `apps/ui/` and `apps/zyra-worker/`
2. Start Docker services: `docker-compose -f setup-compose.yml up -d`
3. Run setup script: `./setup.sh` or follow manual setup in README
4. Ensure PostgreSQL, Redis, and RabbitMQ are running for full functionality

### Deployment
- Frontend: Netlify/Vercel with Next.js build
- Backend: Docker containers for API and Worker services
- Database: PostgreSQL with proper connection pooling
- Infrastructure: Docker Compose for local development