# TypeScript Rules for Zzyra

## Type Definitions

### Shared Types (`@zzyra/types`)

- All shared types must be defined in `packages/types`
- Use explicit types from `@zzyra/types` instead of creating new ones
- Follow the type hierarchy:

  ```typescript
  // Base types
  type BaseType = {
    id: string;
    createdAt: Date;
    updatedAt: Date;
  };

  // Domain types
  type DomainType = BaseType & {
    // domain specific fields
  };

  // DTOs
  type CreateDTO = Omit<DomainType, "id" | "createdAt" | "updatedAt">;
  type UpdateDTO = Partial<CreateDTO>;
  ```

### Type Safety

- Never use `any` or `unknown` without proper type guards
- Use type predicates for runtime type checking
- Prefer interfaces over type aliases for object shapes
- Use discriminated unions for state management
- Use readonly for immutable data
- Use const assertions for literal types

### Type Guards

```typescript
// Type predicate
function isUser(obj: unknown): obj is User {
  return (
    typeof obj === "object" && obj !== null && "id" in obj && "email" in obj
  );
}

// Type assertion function
function assertUser(obj: unknown): asserts obj is User {
  if (!isUser(obj)) {
    throw new Error("Not a user");
  }
}
```

### Generic Types

- Use generics for reusable components and functions
- Constrain generic types when possible
- Use type parameters for function arguments

```typescript
function createRepository<T extends BaseEntity>(entity: T): Repository<T> {
  // implementation
}
```

## Type Imports

### Correct Usage

```typescript
// Good
import { User, UserDTO } from "@zzyra/types";
import type { Workflow } from "@zzyra/types";

// Bad
import { User as LocalUser } from "@zzyra/types"; // Don't rename types
```

### Type-Only Imports

- Use type-only imports for types
- Use regular imports for values

```typescript
import type { User } from "@zzyra/types";
import { createUser } from "@zzyra/database";
```

## Type Exports

### Package Exports

- Export all types from `packages/types/src/index.ts`
- Use named exports for types
- Group related types together

```typescript
// packages/types/src/index.ts
export * from "./workflow";
export * from "./wallet";
export * from "./database";
```

### Module Exports

- One type per file
- Export types at the top level
- Use barrel files for related types

```typescript
// types/user.ts
export interface User {
  id: string;
  email: string;
}

// types/index.ts
export * from "./user";
export * from "./workflow";
```

## Type Documentation

### JSDoc Comments

```typescript
/**
 * Represents a user in the system
 * @interface User
 */
interface User {
  /** Unique identifier */
  id: string;
  /** User's email address */
  email: string;
  /** User's display name */
  name: string;
}
```

### Type Examples

```typescript
/**
 * @example
 * const user: User = {
 *   id: '123',
 *   email: 'user@example.com',
 *   name: 'John Doe'
 * };
 */
```

## Type Testing

### Type Tests

- Use `expectType` and `expectError` for type testing
- Test type constraints
- Test type inference

```typescript
import { expectType } from "tsd";

expectType<string>(user.id);
expectType<Date>(user.createdAt);
expectError(user.invalidProperty);
```

## Common Patterns

### State Management

```typescript
type State<T> = {
  data: T | null;
  loading: boolean;
  error: Error | null;
};

type Action<T> =
  | { type: "FETCH_START" }
  | { type: "FETCH_SUCCESS"; payload: T }
  | { type: "FETCH_ERROR"; payload: Error };
```

### API Responses

```typescript
type ApiResponse<T> = {
  data: T;
  meta: {
    page: number;
    total: number;
  };
};

type ApiError = {
  code: string;
  message: string;
  details?: unknown;
};
```

### Event Handling

```typescript
type EventHandler<T extends Event> = (event: T) => void;
type EventMap = {
  click: MouseEvent;
  submit: FormEvent;
  change: ChangeEvent;
};
```

## Best Practices

### Type Safety

- Use strict TypeScript settings
- Enable all strict checks
- Use `noImplicitAny`
- Use `strictNullChecks`

### Type Organization

- Group related types
- Use namespaces for large type collections
- Keep types close to their usage
- Use type composition

### Type Maintenance

- Review types regularly
- Update types with schema changes
- Document type changes
- Test type changes

### Type Performance

- Use type-only imports
- Avoid circular dependencies
- Use type composition over inheritance
- Keep type definitions minimal
