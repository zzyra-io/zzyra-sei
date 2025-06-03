# Monorepo Rules for Zyra

## Workspace Structure

### Directory Organization

- Use `apps/` for applications
- Use `packages/` for shared packages
- Use `docs/` for documentation
- Use `scripts/` for build scripts

```
zyra/
├── apps/
│   ├── ui/                 # Next.js frontend
│   └── zyra-worker/        # NestJS worker
├── packages/
│   ├── database/          # Prisma and DB access
│   └── types/             # Shared TypeScript types
├── docs/                  # Documentation
└── scripts/              # Build and utility scripts
```

### Package Organization

- One package per domain
- Clear package boundaries
- Proper package exports
- Proper package dependencies

```json
{
  "name": "@zyra/types",
  "version": "0.0.0",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  }
}
```

## Dependency Management

### Package Dependencies

- Use workspace dependencies
- Use proper versioning
- Use proper peer dependencies
- Use proper dev dependencies

```json
{
  "dependencies": {
    "@zyra/types": "workspace:*",
    "@zyra/database": "workspace:*"
  },
  "devDependencies": {
    "@zyra/types": "workspace:*",
    "typescript": "^5.0.0"
  }
}
```

### Version Management

- Use consistent versions
- Use proper version ranges
- Use proper version constraints
- Use proper version updates

```json
{
  "packageManager": "pnpm@8.0.0",
  "engines": {
    "node": ">=18.0.0",
    "pnpm": ">=8.0.0"
  }
}
```

## Build System

### Build Configuration

- Use proper build tools
- Use proper build scripts
- Use proper build targets
- Use proper build caching

```json
{
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "lint": "turbo run lint",
    "test": "turbo run test"
  }
}
```

### Build Pipeline

- Use proper build order
- Use proper build dependencies
- Use proper build artifacts
- Use proper build optimization

```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": []
    }
  }
}
```

## Development Workflow

### Local Development

- Use proper development setup
- Use proper development tools
- Use proper development scripts
- Use proper development environment

```bash
# Install dependencies
pnpm install

# Start development
pnpm dev

# Run tests
pnpm test

# Build packages
pnpm build
```

### Code Sharing

- Use proper import paths
- Use proper export paths
- Use proper type paths
- Use proper module resolution

```typescript
// Import from workspace package
import { User } from "@zyra/types";
import { createUser } from "@zyra/database";

// Export from package
export * from "./types";
export * from "./utils";
```

## Testing

### Test Organization

- Use proper test structure
- Use proper test utilities
- Use proper test setup
- Use proper test teardown

```typescript
// packages/types/src/__tests__/user.test.ts
import { User } from "../user";

describe("User", () => {
  it("should create user", () => {
    const user = new User({
      id: "1",
      email: "test@example.com",
    });
    expect(user.email).toBe("test@example.com");
  });
});
```

### Test Coverage

- Use proper coverage tools
- Use proper coverage thresholds
- Use proper coverage reporting
- Use proper coverage analysis

```json
{
  "jest": {
    "coverageThreshold": {
      "global": {
        "branches": 80,
        "functions": 80,
        "lines": 80,
        "statements": 80
      }
    }
  }
}
```

## Documentation

### Package Documentation

- Use proper README files
- Use proper API documentation
- Use proper usage examples
- Use proper changelog

````markdown
# @zyra/types

Shared TypeScript types for Zyra.

## Installation

```bash
pnpm add @zyra/types
```
````

## Usage

```typescript
import { User } from "@zyra/types";

const user: User = {
  id: "1",
  email: "test@example.com",
};
```

## API

### User

```typescript
interface User {
  id: string;
  email: string;
  name?: string;
}
```

````

### Workspace Documentation
- Use proper workspace README
- Use proper architecture docs
- Use proper development docs
- Use proper deployment docs
```markdown
# Zyra

AI-driven, blockchain-focused workflow automation platform.

## Architecture

- `apps/ui`: Next.js frontend
- `apps/zyra-worker`: NestJS worker
- `packages/database`: Prisma and DB access
- `packages/types`: Shared TypeScript types

## Development

1. Install dependencies:
   ```bash
   pnpm install
````

2. Start development:

   ```bash
   pnpm dev
   ```

3. Run tests:
   ```bash
   pnpm test
   ```

````

## CI/CD

### Pipeline Configuration
- Use proper CI tools
- Use proper CI scripts
- Use proper CI stages
- Use proper CI caching
```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm build
      - run: pnpm test
````

### Deployment

- Use proper deployment tools
- Use proper deployment scripts
- Use proper deployment stages
- Use proper deployment monitoring

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm build
      - run: pnpm deploy
```

## Security

### Dependency Security

- Use proper security tools
- Use proper security checks
- Use proper security updates
- Use proper security reporting

```json
{
  "scripts": {
    "audit": "pnpm audit",
    "security-check": "pnpm run audit && pnpm run lint:security"
  }
}
```

### Code Security

- Use proper security practices
- Use proper security testing
- Use proper security monitoring
- Use proper security reporting

```typescript
// Use proper security headers
app.use(helmet());

// Use proper CORS
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS.split(","),
  })
);

// Use proper rate limiting
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
  })
);
```

## Performance

### Build Performance

- Use proper build caching
- Use proper build optimization
- Use proper build parallelization
- Use proper build monitoring

```json
{
  "turbo": {
    "pipeline": {
      "build": {
        "dependsOn": ["^build"],
        "outputs": ["dist/**"],
        "cache": true
      }
    }
  }
}
```

### Development Performance

- Use proper development tools
- Use proper development optimization
- Use proper development monitoring
- Use proper development reporting

```json
{
  "scripts": {
    "dev": "turbo run dev --parallel",
    "build": "turbo run build --parallel",
    "test": "turbo run test --parallel"
  }
}
```
