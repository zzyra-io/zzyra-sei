# Database Rules for Zzyra

## Prisma Usage

### Schema Organization

- Keep schema in `packages/database/prisma/schema.prisma`
- Group related models together
- Use enums for fixed value sets
- Use proper field types and constraints

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  // relations
  workflows Workflow[]
}

enum WorkflowStatus {
  DRAFT
  ACTIVE
  PAUSED
  COMPLETED
}
```

### Relations

- Use proper relation types (one-to-one, one-to-many, many-to-many)
- Define both sides of relations
- Use cascade delete when appropriate
- Use soft deletes for important data

```prisma
model Workflow {
  id        String   @id @default(cuid())
  name      String
  status    WorkflowStatus
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  steps     Step[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

## Database Access

### Repository Pattern

- Use repositories for all database access
- Keep business logic out of repositories
- Use transactions for related operations
- Handle errors appropriately

```typescript
class UserRepository {
  async create(data: CreateUserDTO): Promise<User> {
    return this.prisma.user.create({
      data,
      include: {
        workflows: true,
      },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        workflows: true,
      },
    });
  }
}
```

### Query Optimization

- Use proper includes for relations
- Use select for specific fields
- Use pagination for large datasets
- Use proper indexes

```typescript
async findWorkflows(userId: string, page: number, limit: number) {
  return this.prisma.workflow.findMany({
    where: { userId },
    include: {
      steps: true
    },
    skip: (page - 1) * limit,
    take: limit,
    orderBy: {
      createdAt: 'desc'
    }
  });
}
```

## Migrations

### Migration Rules

- Generate migrations for all schema changes
- Test migrations before applying
- Include both up and down migrations
- Document breaking changes

```bash
# Generate migration
pnpm prisma migrate dev --name add_user_fields

# Apply migration
pnpm prisma migrate deploy
```

### Migration Safety

- Never modify existing migrations
- Create new migrations for changes
- Test migrations in development
- Backup data before migrations
- Use transactions in migrations

## Data Validation

### Input Validation

- Use Zod for input validation
- Validate at the repository level
- Handle validation errors gracefully
- Use proper error messages

```typescript
const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  password: z.string().min(8)
});

async createUser(data: unknown): Promise<User> {
  const validated = createUserSchema.parse(data);
  return this.prisma.user.create({
    data: validated
  });
}
```

### Data Integrity

- Use database constraints
- Validate unique constraints
- Handle foreign key constraints
- Use proper cascade rules

## Error Handling

### Database Errors

- Handle Prisma errors properly
- Use proper error types
- Log database errors
- Provide user-friendly messages

```typescript
try {
  await this.prisma.user.create({ data });
} catch (error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      throw new ConflictError("Email already exists");
    }
  }
  throw error;
}
```

### Transaction Errors

- Use transactions for related operations
- Handle rollback properly
- Log transaction errors
- Provide proper error context

## Performance

### Query Optimization

- Use proper indexes
- Optimize relation queries
- Use pagination
- Monitor query performance

```typescript
// Add index in schema
model User {
  email String @unique
  @@index([createdAt])
}

// Use in query
const users = await prisma.user.findMany({
  where: {
    createdAt: {
      gte: new Date('2024-01-01')
    }
  }
});
```

### Connection Management

- Use connection pooling
- Handle connection errors
- Monitor connection usage
- Properly close connections

## Security

### Data Access

- Use row-level security
- Implement proper access control
- Sanitize user input
- Use parameterized queries

### Sensitive Data

- Encrypt sensitive data
- Use proper password hashing
- Handle API keys securely
- Use environment variables

## Testing

### Database Tests

- Use test database
- Clean up after tests
- Use transactions for tests
- Mock external services

```typescript
describe("UserRepository", () => {
  beforeEach(async () => {
    await prisma.$transaction([
      prisma.user.deleteMany(),
      prisma.workflow.deleteMany(),
    ]);
  });

  it("should create user", async () => {
    const user = await repository.create({
      email: "test@example.com",
      name: "Test User",
    });
    expect(user.email).toBe("test@example.com");
  });
});
```

### Migration Tests

- Test migrations
- Test rollbacks
- Test data integrity
- Test performance impact
