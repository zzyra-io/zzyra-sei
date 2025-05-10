# Zyra - AI-Driven Blockchain Workflow Automation Platform

Zyra is a powerful workflow automation platform that integrates AI and blockchain capabilities, allowing users to build, execute, and monitor complex DeFi and blockchain workflows.

## Monorepo Structure

```
zyra/
├─ apps/
│  ├─ ui/           # Next.js frontend with App Router
│  └─ zyra-worker/  # NestJS backend/worker service
├─ packages/
│  ├─ types/        # Shared types, schemas, and interfaces
│  └─ ...           # Future shared packages (utils, etc.)
├─ turbo.json       # Turborepo configuration
└─ pnpm-workspace.yaml # pnpm workspace configuration
```

## Getting Started

### Prerequisites

- Node.js (v18+)
- pnpm (v8+)

### Installation

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Start development servers
pnpm dev
```

### Specific Apps

```bash
# Start only UI
pnpm dev --filter=apps/ui

# Start only worker
pnpm dev --filter=apps/zyra-worker
```

## Shared Types and Schemas

All DeFi block types, interfaces, and validation schemas are centralized in the `@zyra/types` package. This ensures consistency between UI and worker implementations.

Example usage:

```typescript
// In UI or worker code
import { BlockType, ProtocolMonitorConfigSchema } from '@zyra/types';

// Use shared enums
if (node.type === BlockType.PROTOCOL_MONITOR) {
  // ...
}

// Use shared validation schemas
const result = ProtocolMonitorConfigSchema.safeParse(config);
if (!result.success) {
  // Handle validation error
}
```

## Development Workflow

1. Make changes to shared types in `packages/types` when adding or modifying block schemas
2. Run `pnpm build` from the root to compile all packages
3. Use the updated types in both UI and worker applications

## Database Migrations

Database migrations are stored in the `ui/migrations` folder. Use Supabase migration commands:

```bash
# Create a new migration (from ui folder)
pnpm run db:migration:new "migration_name"

# Apply migrations
pnpm run db:push
```

## Production Deployment

See the production readiness documentation for detailed deployment instructions.
