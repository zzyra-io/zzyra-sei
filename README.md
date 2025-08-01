# Zzyra - AI-Driven Blockchain Workflow Automation Platform

https://docs.zzyra.io/

[![Netlify Status](https://api.netlify.com/api/v1/badges/17fcd5ea-3c64-4008-89f8-ea0d64e9ff4f/deploy-status)](https://app.netlify.com/projects/zzyra/deploys)

Zzyra is a revolutionary no-code workflow automation platform that combines AI and blockchain capabilities. Build, execute, and monitor complex workflows across DeFi, Enterprise AI, Gaming, IoT, and 20+ other industries without writing code.

## 🚀 Features

- **AI-Powered Block Generation**: Create custom automation blocks using natural language
- **Visual Workflow Builder**: Drag-and-drop interface for building complex workflows
- **Multi-Industry Support**: Templates for DeFi, Healthcare AI, Gaming, Enterprise, and more
- **Real-time Execution**: Monitor workflow executions with live updates
- **Blockchain Integration**: Native support for Ethereum, Polygon, and other EVM chains
- **Team Collaboration**: Share workflows and collaborate with team members
- **Enterprise Ready**: Scalable architecture with monitoring and analytics

## 📋 Prerequisites

Before installing Zzyra, ensure you have the following installed:

- **Node.js** v20.3.0 or higher
- **pnpm** package manager (`npm install -g pnpm`)
- **Docker** and **Docker Compose** (for local development)
- **Git** for cloning the repository

### Optional (for AI features)

- **OpenRouter API Key** for AI block generation
- **Ollama** for local AI inference (installed via Docker)

## 🛠 Quick Start Installation

### Option 1: Automated Setup (Recommended)

1. **Clone the repository:**

   ```bash
   git clone <your-repository-url>
   cd zyra
   ```

2. **Run the automated setup script:**

   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```

   This script will:

   - Check for required dependencies
   - Start Docker containers (PostgreSQL, pgAdmin, Redis, Ollama)
   - Install all project dependencies
   - Generate Prisma client
   - Set up environment variables
   - Run database migrations

3. **Start the development servers:**
   ```bash
   pnpm dev
   ```

### Option 2: Manual Setup

1. **Clone and install dependencies:**

   ```bash
   git clone <your-repository-url>
   cd zyra
   pnpm install
   ```

2. **Start Docker services:**

   ```bash
   docker-compose -f setup-compose.yml up -d
   ```

3. **Set up environment variables:**

   Create `.env` files in both `apps/ui/` and `apps/zyra-worker/` directories:

   **`apps/ui/.env`:**

   ```env
   # Database
   DATABASE_URL=postgresql://zzyra:zzyra@localhost:5432/zyra?schema=public

   # Authentication
   JWT_SECRET=your-jwt-secret-key-change-in-production
   JWT_EXPIRES_IN=1d
   REFRESH_TOKEN_EXPIRES_IN=7

   # AI Features (Optional)
   NEXT_PUBLIC_OPENROUTER_API_KEY=your_openrouter_api_key

   # Services
   REDIS_URL=redis://localhost:6379
   OLLAMA_URL=http://localhost:11434
   ```

   **`apps/zyra-worker/.env`:**

   ```env
   # Database
   DATABASE_URL=postgresql://zzyra:zzyra@localhost:5432/zyra?schema=public

   # Authentication
   JWT_SECRET=your-jwt-secret-key-change-in-production

   # Services
   REDIS_URL=redis://localhost:6379
   OLLAMA_URL=http://localhost:11434
   ```

4. **Initialize the database:**

   ```bash
   cd packages/database
   pnpm run generate
   pnpm run migrate
   cd ../..
   ```

5. **Build all packages:**

   ```bash
   pnpm build
   ```

6. **Start the development servers:**

   ```bash
   # Start all services
   pnpm dev

   # Or start individually:
   pnpm dev:ui     # Frontend at http://localhost:3000
   pnpm dev:worker # Backend worker service
   ```

## 🏗 Project Structure

```
zyra/
├── apps/
│   ├── ui/                 # Next.js Frontend (App Router)
│   │   ├── app/           # Pages and API routes
│   │   ├── components/    # React components
│   │   ├── lib/          # Core logic, AI providers, utilities
│   │   └── migrations/   # Database migrations
│   └── zyra-worker/       # NestJS Backend Worker
│       ├── src/          # Worker services and controllers
│       └── test/         # Unit and integration tests
├── packages/
│   ├── database/         # Prisma schema and database utilities
│   └── types/           # Shared TypeScript types and schemas
├── docs/                # Documentation
└── scripts/            # Build and deployment scripts
```

## 🔧 Development

### Available Scripts

```bash
# Development
pnpm dev                # Start all services in development mode
pnpm dev:ui            # Start only the frontend
pnpm dev:worker        # Start only the worker service

# Building
pnpm build             # Build all packages
pnpm lint              # Lint all packages
pnpm test              # Run all tests

# Database
pnpm db:push           # Push schema changes to database
pnpm db:studio         # Open Prisma Studio
pnpm db:seed           # Seed the database with sample data

# Cleanup
pnpm clean             # Remove all node_modules, dist, and build artifacts
```

### Database Management

The project uses Prisma with PostgreSQL. Database migrations are located in `packages/database/prisma/migrations/`.

```bash
# Generate Prisma client
cd packages/database && pnpm run generate

# Create a new migration
cd packages/database && pnpm run migrate

# Apply migrations
cd packages/database && pnpm run migrate:deploy

# Reset database (development only)
cd packages/database && pnpm run db:push --force-reset
```

## 🌐 Environment Configuration

### Database Setup

The project uses PostgreSQL with Prisma ORM. The Docker Compose setup provides a local PostgreSQL instance with pgAdmin for database management.

1. **Local Development**: Docker Compose automatically sets up:

   - PostgreSQL database on port 5432
   - pgAdmin web interface on port 8080 (admin: zzyra/zzyra)
   - Database URL: `postgresql://zzyra:zzyra@localhost:5432/zyra?schema=public`

2. **Production Setup**: For production, use a hosted PostgreSQL service:
   - Update `DATABASE_URL` in environment variables
   - Run migrations: `cd packages/database && pnpm run migrate:deploy`

### AI Features Setup (Optional)

For AI-powered block generation:

1. **OpenRouter API Key**: Sign up at [openrouter.ai](https://openrouter.ai)
2. **Local Ollama**: Automatically started with Docker Compose setup

## 🚀 Deployment

### Frontend (Netlify/Vercel)

1. Connect your Git repository
2. Configure build settings:
   - **Framework**: Next.js
   - **Package Manager**: pnpm
   - **Build Command**: `pnpm build`
   - **Publish Directory**: `apps/ui/.next`
3. Set environment variables in your deployment platform

### Backend Worker (Docker)

```bash
# Build Docker image
cd apps/zyra-worker
docker build -t zyra-worker .

# Run with environment variables
docker run -d \
  --name zyra-worker \
  -e DATABASE_URL=your_database_url \
  -e JWT_SECRET=your_jwt_secret \
  zyra-worker
```

## 🔍 Troubleshooting

### Common Issues

1. **Database Connection Errors**:

   - Verify `DATABASE_URL` is correctly formatted
   - Ensure database is running and accessible
   - Check firewall settings for database port

2. **Missing Environment Variables**:

   - Copy `.env.example` files to `.env`
   - Verify all required variables are set
   - Check variable names match exactly

3. **Build Failures**:

   - Clear cache: `pnpm clean`
   - Reinstall dependencies: `rm -rf node_modules && pnpm install`
   - Update Node.js to v20.3.0 or higher

4. **Docker Issues**:
   - Ensure Docker is running
   - Check port conflicts (5432, 6379, 11434)
   - Reset containers: `docker-compose -f setup-compose.yml down -v`

### Getting Help

- **Documentation**: Check the `docs/` directory for detailed guides
- **Issues**: Report bugs on GitHub Issues
- **Community**: Join our Discord server (link in docs)

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](docs/CONTRIBUTING.md) for details on how to get started.

## 🔗 Useful Links

- [Architecture Overview](docs/architecture.md)
- [API Documentation](docs/api.md)
- [Environment Variables Guide](docs/environment-variables-guide.md)
- [User Stories & Market Analysis](docs/user-stories.md)
- [Development Cost Analysis](docs/zyra-development-costs-nepal.md)
