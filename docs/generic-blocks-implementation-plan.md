# 🚀 Generic Blocks Implementation Plan

## Overview

This document outlines the migration from domain-specific blocks (like `PRICE_MONITOR`, `EMAIL`) to generic, reusable blocks (like `HTTP_REQUEST`, `CALCULATOR`) that can be configured for any use case.

## 🎯 Goals

- **Domain Independence**: Blocks should not know their specific use case
- **Reusability**: Same block can handle crypto prices, stock data, weather, etc.
- **Configuration-Driven**: Behavior controlled through configuration, not code
- **Backward Compatibility**: Existing workflows continue to work during migration

## 📋 Phase 1: Foundation (Week 1)

### 1.1 Create Generic Block Types

```typescript
// packages/types/src/workflow/generic-block-types.ts
export enum GenericBlockType {
  // Data Input/Output
  HTTP_REQUEST = "HTTP_REQUEST",
  DATABASE_QUERY = "DATABASE_QUERY",
  FILE_READ = "FILE_READ",

  // Processing
  CALCULATOR = "CALCULATOR",
  COMPARATOR = "COMPARATOR",
  TRANSFORMER = "TRANSFORMER",

  // Logic
  CONDITION = "CONDITION",
  DELAY = "DELAY",

  // External Actions
  HTTP_CALL = "HTTP_CALL",
  MESSAGE_SEND = "MESSAGE_SEND",
  DATABASE_WRITE = "DATABASE_WRITE",
}
```

### 1.2 Generic Block Interface

```typescript
// packages/types/src/workflow/generic-block.ts
export interface GenericBlockConfig {
  operation: string;
  parameters: Record<string, any>;
  outputMapping?: Record<string, string>;
}

export interface GenericBlockHandler {
  execute(
    config: GenericBlockConfig,
    inputs: Record<string, any>
  ): Promise<Record<string, any>>;
  validate(config: GenericBlockConfig): ValidationResult;
  getSchema(): z.ZodSchema;
}
```

### 1.3 Update Block Registry

```typescript
// apps/zzyra-worker/src/workers/handlers/BlockHandlerRegistry.ts
export class BlockHandlerRegistry {
  private legacyHandlers: Record<string, BlockHandler>;
  private genericHandlers: Record<string, GenericBlockHandler>;

  constructor() {
    // Keep existing handlers
    this.legacyHandlers = {
      [BlockType.PRICE_MONITOR]: new PriceMonitorBlockHandler(),
      [BlockType.EMAIL]: new EmailBlockHandler(),
      // ... existing handlers
    };

    // Add new generic handlers
    this.genericHandlers = {
      [GenericBlockType.HTTP_REQUEST]: new HttpRequestHandler(),
      [GenericBlockType.CALCULATOR]: new CalculatorHandler(),
      // ... new handlers
    };
  }

  getHandler(blockType: string): BlockHandler | GenericBlockHandler {
    return this.genericHandlers[blockType] || this.legacyHandlers[blockType];
  }
}
```

## 🔧 Phase 2: Core Generic Blocks (Week 2)

### 2.1 HTTP_REQUEST Handler (Priority #1)

```typescript
// apps/zzyra-worker/src/workers/handlers/generic/HttpRequestHandler.ts
export class HttpRequestHandler implements GenericBlockHandler {
  async execute(
    config: GenericBlockConfig,
    inputs: Record<string, any>
  ): Promise<Record<string, any>> {
    const {
      url,
      method = "GET",
      headers = {},
      body,
      dataPath,
    } = config.parameters;

    // Replace template variables in URL
    const processedUrl = this.processTemplate(url, inputs);

    const response = await fetch(processedUrl, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Extract specific data if path provided
    const result = dataPath ? this.extractData(data, dataPath) : data;

    return {
      statusCode: response.status,
      data: result,
      headers: Object.fromEntries(response.headers.entries()),
    };
  }

  validate(config: GenericBlockConfig): ValidationResult {
    const schema = z.object({
      url: z.string().url(),
      method: z.enum(["GET", "POST", "PUT", "DELETE"]).default("GET"),
      headers: z.record(z.string()).optional(),
      body: z.any().optional(),
      dataPath: z.string().optional(),
    });

    return schema.safeParse(config.parameters);
  }

  private processTemplate(
    template: string,
    inputs: Record<string, any>
  ): string {
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
      return this.getNestedValue(inputs, path) || match;
    });
  }

  private extractData(obj: any, path: string): any {
    return path.split(".").reduce((current, key) => current?.[key], obj);
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split(".").reduce((current, key) => current?.[key], obj);
  }
}
```

**Usage Examples:**

```typescript
// Crypto price (replaces PRICE_MONITOR)
{
  operation: "request",
  parameters: {
    url: "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
    dataPath: "ethereum.usd"
  }
}

// Stock price
{
  operation: "request",
  parameters: {
    url: "https://api.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL",
    dataPath: "Global Quote.05. price"
  }
}

// Weather data
{
  operation: "request",
  parameters: {
    url: "https://api.weather.com/v1/current?location=NYC",
    dataPath: "temperature"
  }
}
```

### 2.2 CALCULATOR Handler

```typescript
// apps/zzyra-worker/src/workers/handlers/generic/CalculatorHandler.ts
export class CalculatorHandler implements GenericBlockHandler {
  async execute(
    config: GenericBlockConfig,
    inputs: Record<string, any>
  ): Promise<Record<string, any>> {
    const { operation, formula, operands } = config.parameters;

    switch (operation) {
      case "percentage":
        return this.calculatePercentage(inputs, operands);
      case "arithmetic":
        return this.performArithmetic(inputs, operands);
      case "formula":
        return this.evaluateFormula(inputs, formula);
      default:
        throw new Error(`Unknown calculation operation: ${operation}`);
    }
  }

  private calculatePercentage(
    inputs: Record<string, any>,
    operands: any
  ): Record<string, any> {
    const value = this.getValue(inputs, operands.value);
    const percentage = operands.percentage;

    if (typeof value !== "number" || typeof percentage !== "number") {
      throw new Error("Value and percentage must be numbers");
    }

    return {
      result: (value * percentage) / 100,
      original: value,
      percentage: percentage,
    };
  }

  private performArithmetic(
    inputs: Record<string, any>,
    operands: any
  ): Record<string, any> {
    const a = this.getValue(inputs, operands.a);
    const b = this.getValue(inputs, operands.b);
    const operation = operands.operation;

    let result: number;
    switch (operation) {
      case "add":
        result = a + b;
        break;
      case "subtract":
        result = a - b;
        break;
      case "multiply":
        result = a * b;
        break;
      case "divide":
        if (b === 0) throw new Error("Division by zero");
        result = a / b;
        break;
      default:
        throw new Error(`Unknown arithmetic operation: ${operation}`);
    }

    return { result, operandA: a, operandB: b, operation };
  }

  private getValue(inputs: Record<string, any>, path: string | number): number {
    if (typeof path === "number") return path;
    return this.getNestedValue(inputs, path);
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split(".").reduce((current, key) => current?.[key], obj);
  }
}
```

**Usage Examples:**

```typescript
// Calculate 10% of ETH balance
{
  operation: "percentage",
  parameters: {
    value: "balance", // From previous node's output
    percentage: 10
  }
}

// Add two numbers
{
  operation: "arithmetic",
  parameters: {
    operation: "add",
    a: "currentPrice",
    b: 100
  }
}
```

### 2.3 COMPARATOR Handler

```typescript
// apps/zzyra-worker/src/workers/handlers/generic/ComparatorHandler.ts
export class ComparatorHandler implements GenericBlockHandler {
  async execute(
    config: GenericBlockConfig,
    inputs: Record<string, any>
  ): Promise<Record<string, any>> {
    const { operation, valueA, valueB } = config.parameters;

    const a = this.getValue(inputs, valueA);
    const b = this.getValue(inputs, valueB);

    let result: boolean;
    switch (operation) {
      case "gt":
        result = a > b;
        break;
      case "lt":
        result = a < b;
        break;
      case "eq":
        result = a === b;
        break;
      case "ne":
        result = a !== b;
        break;
      case "gte":
        result = a >= b;
        break;
      case "lte":
        result = a <= b;
        break;
      default:
        throw new Error(`Unknown comparison operation: ${operation}`);
    }

    return {
      result,
      valueA: a,
      valueB: b,
      operation,
      conditionMet: result, // For backward compatibility
    };
  }

  private getValue(inputs: Record<string, any>, value: string | number): any {
    if (typeof value === "number") return value;
    if (typeof value === "string" && !value.includes(".")) {
      // Try to parse as number if it's a simple string
      const parsed = parseFloat(value);
      if (!isNaN(parsed)) return parsed;
    }
    return this.getNestedValue(inputs, value);
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split(".").reduce((current, key) => current?.[key], obj);
  }
}
```

**Usage Examples:**

```typescript
// Check if ETH price > $2000
{
  operation: "compare",
  parameters: {
    operation: "gt",
    valueA: "data", // Price from previous HTTP_REQUEST
    valueB: 2000
  }
}
```

## 🧪 Phase 3: Test Generic System (Week 3)

### 3.1 Simple Test Workflow

```typescript
// Test: "Get ETH price and check if > $2000"
const testWorkflow = {
  nodes: [
    {
      id: "fetch_eth_price",
      type: "HTTP_REQUEST",
      config: {
        operation: "request",
        parameters: {
          url: "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
          method: "GET",
          dataPath: "ethereum.usd",
        },
      },
    },
    {
      id: "check_price",
      type: "COMPARATOR",
      config: {
        operation: "compare",
        parameters: {
          operation: "gt",
          valueA: "data", // From previous node
          valueB: 2000,
        },
      },
    },
  ],
  edges: [
    {
      source: "fetch_eth_price",
      target: "check_price",
      mapping: { data: "data" },
    },
  ],
};
```

### 3.2 Update Workflow Executor

```typescript
// apps/zzyra-worker/src/workers/workflow-executor.ts
export class WorkflowExecutor {
  async executeNode(
    node: any,
    previousOutputs: Record<string, any>
  ): Promise<any> {
    const handler = this.blockHandlerRegistry.getHandler(node.type);

    if (this.isGenericHandler(handler)) {
      // New generic execution path
      const config = node.config as GenericBlockConfig;
      const inputs = this.mapInputs(node, previousOutputs);
      return handler.execute(config, inputs);
    } else {
      // Legacy execution path
      const ctx: BlockExecutionContext = {
        nodeId: node.id,
        executionId: this.executionId,
        userId: this.userId,
        inputs: previousOutputs,
        config: node.config,
        // ... other context
      };
      return handler.execute(node, ctx);
    }
  }

  private mapInputs(
    node: any,
    previousOutputs: Record<string, any>
  ): Record<string, any> {
    // Map outputs from previous nodes based on edges
    const mappedInputs: Record<string, any> = {};

    // Find incoming edges for this node
    const incomingEdges = this.edges.filter((edge) => edge.target === node.id);

    for (const edge of incomingEdges) {
      const sourceOutput = previousOutputs[edge.source];
      if (sourceOutput && edge.mapping) {
        // Apply field mapping from edge
        for (const [targetField, sourceField] of Object.entries(edge.mapping)) {
          mappedInputs[targetField] = this.getNestedValue(
            sourceOutput,
            sourceField
          );
        }
      } else if (sourceOutput) {
        // No specific mapping, pass through all data
        Object.assign(mappedInputs, sourceOutput);
      }
    }

    return mappedInputs;
  }
}
```

### 3.3 Edge Data Mapping

```typescript
// Update edge interface to support data mapping
interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  mapping?: Record<string, string>; // target_field: source_field
  condition?: string; // Execute edge only if condition is true
}
```

## 🔄 Phase 4: Migration Adapter (Week 4)

### 4.1 Legacy-to-Generic Adapter

```typescript
// apps/zzyra-worker/src/workers/adapters/LegacyBlockAdapter.ts
export class LegacyBlockAdapter {
  static convertPriceMonitorToHttpRequest(
    legacyConfig: any
  ): GenericBlockConfig {
    const { asset, condition, targetPrice } = legacyConfig;

    return {
      operation: "request",
      parameters: {
        url: `https://api.coingecko.com/api/v3/simple/price?ids=${asset.toLowerCase()}&vs_currencies=usd`,
        method: "GET",
        dataPath: `${asset.toLowerCase()}.usd`,
      },
    };
  }

  static convertEmailToMessageSend(legacyConfig: any): GenericBlockConfig {
    return {
      operation: "send",
      parameters: {
        channel: "email",
        to: legacyConfig.to,
        subject: legacyConfig.subject,
        body: legacyConfig.body,
        template: legacyConfig.template,
      },
    };
  }

  // Convert complete legacy workflow to generic
  static convertWorkflow(legacyWorkflow: any): any {
    const convertedNodes = legacyWorkflow.nodes.map((node) => {
      switch (node.type) {
        case "PRICE_MONITOR":
          return {
            ...node,
            type: "HTTP_REQUEST",
            config: this.convertPriceMonitorToHttpRequest(node.config),
          };
        case "EMAIL":
          return {
            ...node,
            type: "MESSAGE_SEND",
            config: this.convertEmailToMessageSend(node.config),
          };
        default:
          return node; // Keep unchanged
      }
    });

    return {
      ...legacyWorkflow,
      nodes: convertedNodes,
    };
  }
}
```

## 🎯 "Sell 10% ETH" Example Workflow

### Using Generic Blocks

```typescript
const sellETHWorkflow = {
  name: "Sell 10% ETH when price > $2000",
  nodes: [
    {
      id: "fetch_eth_price",
      type: "HTTP_REQUEST",
      config: {
        operation: "request",
        parameters: {
          url: "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
          dataPath: "ethereum.usd",
        },
      },
    },
    {
      id: "check_price_condition",
      type: "COMPARATOR",
      config: {
        operation: "compare",
        parameters: {
          operation: "gt",
          valueA: "data",
          valueB: 2000,
        },
      },
    },
    {
      id: "get_eth_balance",
      type: "HTTP_REQUEST",
      config: {
        operation: "request",
        parameters: {
          url: "{{walletApi}}/balance/{{userWallet}}/ETH",
          headers: { Authorization: "Bearer {{apiKey}}" },
          dataPath: "balance",
        },
      },
    },
    {
      id: "calculate_sell_amount",
      type: "CALCULATOR",
      config: {
        operation: "percentage",
        parameters: {
          value: "data",
          percentage: 10,
        },
      },
    },
    {
      id: "execute_sell_trade",
      type: "HTTP_CALL",
      config: {
        operation: "call",
        parameters: {
          url: "{{exchangeApi}}/sell",
          method: "POST",
          headers: { Authorization: "Bearer {{exchangeKey}}" },
          body: {
            asset: "ETH",
            amount: "{{result}}",
            type: "market",
          },
        },
      },
    },
    {
      id: "send_notification",
      type: "MESSAGE_SEND",
      config: {
        operation: "send",
        parameters: {
          channel: "email",
          to: "{{userEmail}}",
          subject: "ETH Trade Executed",
          template: "Sold {{result}} ETH at ${{price}} per unit",
        },
      },
    },
  ],
  edges: [
    {
      source: "fetch_eth_price",
      target: "check_price_condition",
      mapping: { data: "data" },
    },
    {
      source: "check_price_condition",
      target: "get_eth_balance",
      condition: "result === true",
    },
    {
      source: "get_eth_balance",
      target: "calculate_sell_amount",
      mapping: { data: "data" },
    },
    {
      source: "calculate_sell_amount",
      target: "execute_sell_trade",
      mapping: { result: "result" },
    },
    {
      source: "execute_sell_trade",
      target: "send_notification",
      mapping: { data: "data" },
    },
  ],
};
```

## 🚦 Development Priority

### Week 1 (Foundation)

1. ✅ Create `GenericBlockType` enum
2. ✅ Create `HttpRequestHandler` (80% of use cases)
3. ✅ Update `BlockHandlerRegistry`
4. ✅ Test basic HTTP requests

### Week 2 (Core Blocks)

1. ✅ Build `CalculatorHandler`
2. ✅ Build `ComparatorHandler`
3. ✅ Test simple workflows
4. ✅ Add edge data mapping

### Week 3 (Integration)

1. ✅ Update workflow executor
2. ✅ Create test workflows
3. ✅ End-to-end testing
4. ✅ Performance validation

### Week 4 (Migration)

1. ✅ Create legacy adapter
2. ✅ Build migration tools
3. ✅ Create "Sell 10% ETH" template
4. ✅ Backward compatibility testing

## 🎉 Benefits

### For Developers

- **Single Block, Multiple Uses**: `HTTP_REQUEST` handles crypto prices, stock data, weather, APIs
- **Easy Testing**: Blocks are pure functions with predictable inputs/outputs
- **Rapid Development**: New use cases require configuration, not new code

### For Users

- **Flexibility**: Same blocks work across different domains
- **Consistency**: Familiar interface across all block types
- **Power**: Complex workflows through simple block composition

### For System

- **Maintainability**: Fewer, more focused block handlers
- **Scalability**: Add new use cases through configuration
- **Reliability**: Well-tested generic blocks vs. many domain-specific ones

## 📝 Next Steps

1. **Start Implementation**: Begin with `HttpRequestHandler` in Week 1
2. **Incremental Migration**: Run both systems in parallel during transition
3. **User Testing**: Validate generic blocks with real workflows
4. **Documentation**: Update user guides for new block system
5. **Performance Monitoring**: Ensure generic blocks perform as well as specific ones

This plan maintains backward compatibility while providing a path to a more flexible, maintainable block system.
