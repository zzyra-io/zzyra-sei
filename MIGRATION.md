# Migrating to Shared Types in the Zyra Monorepo

This guide outlines the steps to migrate your existing DeFi block handlers and UI components to use the shared types from the `@zyra/types` package.

## 1. DeFi Block Handlers in Worker

### Before:
```typescript
// Old approach: Local type definitions in worker
import { BlockType, BlockExecutionContext } from '../../types/workflow';

export class ProtocolMonitorHandler {
  async execute(node: any, ctx: BlockExecutionContext): Promise<any> {
    const { id: nodeId } = node;
    const { executionId } = ctx;
    // Implementation...
  }
}
```

### After:
```typescript
// New approach: Shared types from @zyra/types
import { BlockType, BlockExecutionContext, BlockHandler, ProtocolMonitorConfigSchema } from '@zyra/types';

export class ProtocolMonitorHandler implements BlockHandler {
  async execute(node: any, ctx: BlockExecutionContext): Promise<any> {
    const { id: nodeId } = node;
    const { executionId } = ctx;
    
    // Use shared schema for validation
    const configResult = ProtocolMonitorConfigSchema.safeParse(node.data?.config);
    if (!configResult.success) {
      await this.trackLog(nodeId, executionId, `Invalid config: ${configResult.error.message}`, 'error');
      throw new Error(`Invalid protocol monitor configuration`);
    }
    
    // Implementation with validated config
    const config = configResult.data;
    // ...
  }
  
  async startExecution(nodeId: string, executionId: string): Promise<void> {
    // Implementation...
  }
  
  async completeExecution(nodeId: string, executionId: string, result: any): Promise<void> {
    // Implementation...
  }
  
  async trackLog(nodeId: string, executionId: string, message: string, level: string = 'info', metadata?: any): Promise<void> {
    // Implementation...
  }
}
```

## 2. UI Block Components

### Before:
```typescript
// Old approach: Local type definitions in UI
import { BlockType } from '../../lib/types';

type ProtocolMonitorConfig = {
  protocol: string;
  metrics: string[];
  thresholds?: Record<string, { min?: number; max?: number; alert?: boolean }>;
  monitoringInterval?: number;
};

const ProtocolMonitorBlock = ({ config, onChange }) => {
  // UI Implementation...
};
```

### After:
```typescript
// New approach: Shared types from @zyra/types
import { BlockType, ProtocolMonitorConfig } from '@zyra/types';

const ProtocolMonitorBlock = ({ config, onChange }) => {
  // UI Implementation using the same types as backend
};
```

## 3. Validation Rules

### Before:
```typescript
// Old approach: Separate validation in UI and worker
// In UI:
const validateProtocolMonitor = (config) => {
  const errors = {};
  if (!config.protocol) errors.protocol = 'Protocol is required';
  if (!config.metrics || config.metrics.length === 0) errors.metrics = 'At least one metric is required';
  return errors;
};

// In worker:
const validateConfig = (config) => {
  if (!config.protocol) throw new Error('Protocol is required');
  if (!config.metrics || config.metrics.length === 0) throw new Error('At least one metric is required');
  // ...
};
```

### After:
```typescript
// New approach: Shared validation using Zod schemas
import { ProtocolMonitorConfigSchema } from '@zyra/types';

// In UI:
const validateProtocolMonitor = (config) => {
  const result = ProtocolMonitorConfigSchema.safeParse(config);
  if (!result.success) {
    // Convert Zod errors to form-friendly format
    const errors = {};
    result.error.errors.forEach(err => {
      const path = err.path.join('.');
      errors[path] = err.message;
    });
    return errors;
  }
  return {};
};

// In worker:
const validateConfig = (config) => {
  const result = ProtocolMonitorConfigSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Invalid config: ${result.error.message}`);
  }
  return result.data; // Use the validated and typed data
};
```

## 4. Block Registration

### Before:
```typescript
// Old approach: Different block type definitions
// In UI:
const BLOCK_TYPES = {
  PROTOCOL_MONITOR: 'PROTOCOL_MONITOR',
  POSITION_MANAGER: 'POSITION_MANAGER',
  // ...
};

// In worker:
enum BlockType {
  PROTOCOL_MONITOR = 'PROTOCOL_MONITOR',
  POSITION_MANAGER = 'POSITION_MANAGER',
  // ...
}
```

### After:
```typescript
// New approach: Shared block types
import { BlockType } from '@zyra/types';

// Both UI and worker use the same enum
```

## Migration Checklist

1. **For each block handler in worker:**
   - [ ] Import types from `@zyra/types` instead of local definitions
   - [ ] Implement the `BlockHandler` interface
   - [ ] Use shared schemas for config validation

2. **For each block component in UI:**
   - [ ] Import types from `@zyra/types` instead of local definitions
   - [ ] Use shared validation schemas for form validation

3. **For block registration:**
   - [ ] Update block registry in worker to use shared `BlockType` enum
   - [ ] Update block library in UI to use shared `BlockType` enum

4. **For execution context:**
   - [ ] Use shared `BlockExecutionContext` type in worker execution system
   - [ ] Use consistent log/error handling structures

By following this migration pattern, you'll eliminate schema drift between UI and backend, simplify validation logic, and create a robust type-safe foundation for adding new block types.
