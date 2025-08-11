# Zzyra Block System Architecture

## Overview

This document outlines the architecture for Zzyra's modular block system, which enables creating, configuring, and executing workflow blocks in a maintainable and extensible manner. The architecture follows Zzyra's monorepo structure principles, separating shared logic into packages while keeping specific implementations in the appropriate apps.

## 1. Core Principles

- **Modularity**: Each block is self-contained with its own schema, UI, and execution logic
- **Extensibility**: New block types can be easily added without modifying core system
- **Configuration-driven**: Block behavior and UI are driven by declarative configurations
- **Type-safe**: Full TypeScript integration with Zod schema validation
- **Separation of concerns**: Clear boundaries between UI, validation, and execution logic

## 2. Architecture Components

### 2.1 Block Registry (`packages/blocks`)

The heart of the block system is a central registry that maintains metadata and implementations for all block types.

```
packages/
  blocks/
    src/
      registry.ts         # Central block registry
      types/              # Shared block type definitions
      blocks/             # Individual block implementations
        webhook/          # Example block implementation
        price-monitor/    # Example block implementation
```

### 2.2 Block Definition Interface

Each block must implement the `BlockDefinition` interface, providing all necessary components for rendering, configuring, and executing the block.

```typescript
// packages/blocks/src/types/index.ts
export interface BlockDefinition {
  // Core metadata
  type: BlockType;
  name: string;
  description: string;
  icon: string;
  category: NodeCategory;

  // Configuration and validation
  schema: z.ZodObject<any>;
  defaultConfig: Record<string, any>;
  validate: (config: Record<string, any>) => ValidationResult;

  // UI components
  ConfigComponent: React.FC<BlockConfigProps>;
  LiveComponent?: React.FC<BlockLiveProps>;
}
```

### 2.3 Block Implementation Structure

Each block is organized in its own directory with a consistent structure:

```
blocks/
  webhook/
    index.ts        # Exports everything and registers the block
    schema.ts       # Zod schema for configuration
    defaults.ts     # Default configuration values
    ui.tsx          # UI components for configuration
    validator.ts    # Validation logic
    runtime.ts      # Runtime execution logic (worker side)
```

### 2.4 Block Registry Implementation

The registry is a centralized system for registering and accessing blocks:

```typescript
// packages/blocks/src/registry.ts
import { BlockDefinition } from "./types";

const blockRegistry = new Map<BlockType, BlockDefinition>();

export function registerBlock(block: BlockDefinition) {
  blockRegistry.set(block.type, block);
}

export function getBlock(type: BlockType): BlockDefinition | undefined {
  return blockRegistry.get(type);
}

export function getAllBlocks(): BlockDefinition[] {
  return Array.from(blockRegistry.values());
}
```

## 3. Integration with UI Components

### 3.1 Flow Canvas Integration

The Flow Canvas component in the UI app integrates with the block registry to create nodes with proper configuration:

```typescript
// apps/ui/components/flow-canvas.tsx
import { getBlock } from "@zzyra/blocks";

// When adding a new node from drag-and-drop
const onDrop = useCallback((event) => {
  const blockType = event.dataTransfer.getData("application/reactflow");
  const blockDef = getBlock(blockType as BlockType);

  if (!blockDef) return;

  // Create node with block's default config
  const newNode = {
    id: `${blockType}-${Date.now()}`,
    type: "custom",
    position: {
      /* ... */
    },
    data: {
      blockType,
      label: blockDef.name,
      description: blockDef.description,
      nodeType: blockDef.category,
      isValid: false,
      isEnabled: true,
      config: { ...blockDef.defaultConfig },
      status: "unconfigured",
    },
  };

  addNode(newNode);
  validateNode(newNode.id);
}, []);
```

### 3.2 Dynamic Block Configuration Panel

The configuration panel adapts to each block type using the block's registered ConfigComponent:

```typescript
// apps/ui/components/block-config-panel.tsx
import { getBlock } from '@zzyra/blocks';

export const BlockConfigPanel: React.FC<{ nodeId: string }> = ({ nodeId }) => {
  const { nodes, updateNode } = useWorkflowStore();
  const node = nodes.find(n => n.id === nodeId);

  if (!node) return null;

  const { blockType, config } = node.data;
  const blockDef = getBlock(blockType);

  if (!blockDef) return <div>Unknown block type</div>;

  const ConfigComponent = blockDef.ConfigComponent;

  const handleConfigChange = (newConfig: Record<string, any>) => {
    const validation = blockDef.validate(newConfig);

    updateNode(nodeId, {
      data: {
        config: newConfig,
        isValid: validation.isValid
      }
    });
  };

  return (
    <div className="block-config-panel">
      <h2>{blockDef.name} Configuration</h2>
      <ConfigComponent
        config={config}
        onChange={handleConfigChange}
      />
    </div>
  );
};
```

### 3.3 Custom Node with Live Data Display

Custom nodes can display live data using the block's LiveComponent when available:

```typescript
// apps/ui/components/custom-node.tsx
import { getBlock } from '@zzyra/blocks';

export const CustomNode: React.FC = ({ data, id }) => {
  const blockDef = getBlock(data.blockType);

  return (
    <div className={`custom-node ${data.isValid ? 'valid' : 'invalid'}`}>
      <div className="node-header">
        <div className="node-icon">{blockDef?.icon}</div>
        <div className="node-title">{data.label}</div>
      </div>

      <div className="node-body">
        {/* Render live component if available */}
        {blockDef?.LiveComponent && data.isEnabled && (
          <blockDef.LiveComponent
            id={id}
            config={data.config}
          />
        )}
      </div>
    </div>
  );
};
```

## 4. Worker Integration

### 4.1 Block Handler Registry

The worker uses a registry to manage handlers for different block types:

```typescript
// apps/zzyra-worker/src/workers/handlers/BlockHandlerRegistry.ts
import { getAllBlocks } from "@zzyra/blocks";

class BlockHandlerRegistry {
  private handlers: Map<BlockType, BlockHandler> = new Map();

  constructor() {
    // Register handlers for all known blocks
    getAllBlocks().forEach((blockDef) => {
      this.handlers.set(blockDef.type, new GenericBlockHandler(blockDef.type));
    });
  }

  getHandler(blockType: BlockType): BlockHandler {
    const handler = this.handlers.get(blockType);
    if (!handler) {
      throw new Error(`No handler registered for block type: ${blockType}`);
    }
    return handler;
  }
}
```

### 4.2 Block Handler Implementation

Each block handler validates and executes block logic using the block's schema and runtime code:

```typescript
// apps/zzyra-worker/src/workers/handlers/GenericBlockHandler.ts
import { getBlock } from "@zzyra/blocks";

export class GenericBlockHandler implements BlockHandler {
  constructor(private blockType: BlockType) {}

  async execute(node: any, context: BlockExecutionContext): Promise<any> {
    const blockDef = getBlock(this.blockType);
    if (!blockDef) {
      throw new Error(`Unknown block type: ${this.blockType}`);
    }

    // Validate configuration
    const config = node.data?.config || {};
    const validation = blockDef.validate(config);

    if (!validation.isValid) {
      throw new Error(
        `Invalid configuration: ${validation.errors?.join(", ")}`
      );
    }

    // Execute block logic
    return await executeBlockRuntime(this.blockType, config, context);
  }
}
```

## 5. Example Block Implementation: Webhook

```typescript
// packages/blocks/src/blocks/webhook/index.ts
import { z } from "zod";
import { BlockType, NodeCategory } from "@zzyra/types";
import { WebhookConfigComponent } from "./ui";
import { defaultConfig } from "./defaults";
import { validate } from "./validator";
import { registerBlock } from "../../registry";

// Webhook schema
export const schema = z.object({
  url: z.string().url().min(1, "URL is required"),
  method: z.enum(["GET", "POST", "PUT", "DELETE"]).default("GET"),
  headers: z.record(z.string()).optional(),
});

// Register webhook block
registerBlock({
  type: BlockType.WEBHOOK,
  name: "Webhook",
  description: "Trigger workflows via HTTP requests",
  icon: "webhook-icon",
  category: NodeCategory.TRIGGER,
  schema,
  defaultConfig,
  ConfigComponent: WebhookConfigComponent,
  validate,
});
```

## 6. Implementation Guidelines

### 6.1 Creating New Blocks

To add a new block type to the system:

1. Add the block type to the BlockType enum in `@zzyra/types`
2. Create a new directory in `packages/blocks/src/blocks/` for the block
3. Implement all required files (schema, defaults, UI, validation, runtime)
4. Register the block in the block's index.ts file
5. Add any specific worker implementation in the worker app

### 6.2 Block UI Components

Block UI components should:

- Be implemented as functional React components with proper TypeScript props
- Use Tailwind CSS for styling
- Follow accessibility best practices
- Support validation feedback
- Update configuration through the provided onChange callback

### 6.3 Block Runtime Implementation

Block runtime implementations should:

- Validate all inputs before execution
- Properly handle errors and return meaningful error messages
- Be stateless and idempotent where possible
- Follow clean code principles

## 7. Performance Considerations

- Use React.memo for UI components to prevent unnecessary re-renders
- Implement efficient validation that avoids unnecessary schema parsing
- Cache block definitions and handler instances
- Use virtualization for rendering many nodes in the workflow canvas
- Implement optimistic UI updates for configuration changes

## 8. Future Extensions

- Block versioning system
- Block execution statistics and monitoring
- Visual block builder for custom blocks
- Block marketplace for community-contributed blocks
- Live collaboration features for workflow editing
