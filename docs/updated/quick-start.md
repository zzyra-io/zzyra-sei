# Zyra Platform - Quick Start Guide

## Prerequisites

- Node.js 20.3.0+
- pnpm 9.15.2+
- Docker and Docker Compose
- Git

## Quick Setup (5 minutes)

### 1. Clone and Install

```bash
git clone <repository-url>
cd zzyra
pnpm install
```

### 2. Start Infrastructure

```bash
# Start PostgreSQL and RabbitMQ
docker-compose -f setup-compose.yml up -d
```

### 3. Setup Database

```bash
cd packages/database
pnpm prisma generate
pnpm prisma migrate dev --name init
```

### 4. Environment Variables

Create `.env` files in each app directory:

**apps/ui/.env:**

```env
NEXT_PUBLIC_API_URL=http://localhost:3002/api
NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY=your-magic-publishable-key
```

**apps/api/.env:**

```env
DATABASE_URL="postgresql://zzyra:zzyra@localhost:5433/zzyra?schema=public"
JWT_SECRET="your-jwt-secret-key"
MAGIC_SECRET_KEY="your-magic-secret-key"
RABBIT_MQ_URL="amqp://guest:guest@localhost:5672"
```

**apps/zzyra-worker/.env:**

```env
DATABASE_URL="postgresql://zzyra:zzyra@localhost:5433/zzyra?schema=public"
RABBIT_MQ_URL="amqp://guest:guest@localhost:5672"
OPENROUTER_API_KEY="your-openrouter-key"
```

### 5. Start Development

```bash
# Start all services
pnpm dev

# Or individually:
pnpm dev:ui        # Frontend (http://localhost:3000)
pnpm dev:api       # API (http://localhost:3002)
pnpm dev:worker    # Worker service
```

## First Steps

### 1. Access the Application

- **Frontend**: http://localhost:3000
- **API Docs**: http://localhost:3002/api/docs

### 2. Create Your First Workflow

1. Sign up/login using Magic SDK (email or wallet)
2. Navigate to the workflow builder
3. Drag and drop blocks from the catalog
4. Connect blocks to create a workflow
5. Configure block parameters
6. Save and execute

### 3. Example: Simple HTTP Request Workflow

1. Add an "HTTP Request" block
2. Configure the URL and method
3. Add a "Log" block to see the response
4. Connect the blocks
5. Execute the workflow

## Key Features to Try

### Workflow Builder

- Drag-and-drop interface
- Visual node connections
- Real-time validation
- Block configuration panels

### Block Catalog

- Pre-built blocks for common tasks
- HTTP requests, data processing, Web3 interactions
- Custom block creation
- Block sharing and discovery

### Execution Monitoring

- Real-time execution status
- Node-by-node progress tracking
- Execution logs and debugging
- Performance metrics

## Troubleshooting

### Common Issues

**Database Connection Error:**

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Restart if needed
docker-compose -f setup-compose.yml restart postgres
```

**Port Already in Use:**

```bash
# Check what's using the port
lsof -i :3000
lsof -i :3002

# Kill the process or change ports in .env
```

**Magic SDK Issues:**

- Ensure Magic publishable key is set in UI
- Check Magic secret key in API
- Verify domain allowlist in Magic dashboard

### Logs

**API Server:**

```bash
cd apps/api
pnpm dev
# Check console output for errors
```

**Worker Service:**

```bash
cd apps/zzyra-worker
pnpm dev
# Check console output for execution logs
```

**Frontend:**

```bash
cd apps/ui
pnpm dev
# Check browser console for errors
```

## Next Steps

1. **Explore Block Catalog**: Try different block types
2. **Create Custom Blocks**: Build your own reusable blocks
3. **Set Up Web3 Integration**: Connect wallets and DeFi protocols
4. **Configure Notifications**: Set up execution alerts
5. **Team Collaboration**: Invite team members

## Support

- **Documentation**: Check `/docs` folder for detailed guides
- **API Reference**: http://localhost:3002/api/docs
- **Issues**: Create GitHub issues for bugs
- **Discussions**: Use GitHub discussions for questions

This quick start guide gets you up and running with the core Zyra platform. For detailed information about specific features, architecture, or deployment, refer to the other documentation files.
