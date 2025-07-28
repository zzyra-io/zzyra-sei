# AI Agent Demo Script

This script demonstrates real AI Agent execution using the implemented AI Agent Handler system.

## Prerequisites

1. **Environment Setup**: Ensure you have the required environment variables:
   ```bash
   export OPENROUTER_API_KEY=your_openrouter_key
   # OR
   export OPENAI_API_KEY=your_openai_key
   # OR  
   export ANTHROPIC_API_KEY=your_anthropic_key
   ```

2. **Database**: Make sure your PostgreSQL database is running and the Prisma schema is migrated:
   ```bash
   cd packages/database
   pnpm run generate
   pnpm run migrate
   ```

## Usage

### List Available Demos
```bash
cd apps/zyra-worker
ts-node src/scripts/ai-agent-demo.ts
```

### Run a Specific Demo
```bash
# Run predefined demo
ts-node src/scripts/ai-agent-demo.ts math-solver

# Run with custom prompt
ts-node src/scripts/ai-agent-demo.ts code-assistant "Write a function to reverse a string in Python"

# Run quick question
ts-node src/scripts/ai-agent-demo.ts quick-question "Explain Docker containers in simple terms"
```

## Available Demo Configurations

### `math-solver`
- **Provider**: OpenRouter (Claude 3.5 Sonnet)
- **Mode**: Deliberate thinking
- **Use Case**: Step-by-step math problem solving

### `code-assistant` 
- **Provider**: OpenRouter (Claude 3.5 Sonnet)
- **Mode**: Deliberate thinking
- **Use Case**: Clean, documented code generation

### `creative-writer`
- **Provider**: OpenRouter (Claude 3.5 Sonnet)  
- **Mode**: Collaborative thinking
- **Use Case**: Creative content generation

### `business-analyst`
- **Provider**: OpenRouter (Claude 3.5 Sonnet)
- **Mode**: Deliberate thinking
- **Use Case**: Data-driven business analysis

### `quick-question`
- **Provider**: OpenRouter (Claude 3.5 Sonnet)
- **Mode**: Fast thinking
- **Use Case**: Concise answers to direct questions

## What the Script Demonstrates

### 1. **Complete AI Agent Pipeline**
- LLM provider initialization and selection
- Security validation (prompt injection detection)
- Multi-step reasoning process
- Real-time execution monitoring
- Database persistence

### 2. **Thinking Process Visualization**
- Shows step-by-step reasoning
- Displays confidence scores
- Tracks execution path
- Logs thinking steps to database

### 3. **Security Features**
- Validates prompts for malicious content
- Checks user permissions
- Audit logging for security events
- Safe execution environment

### 4. **Production-Ready Features**
- Error handling and recovery
- Timeout management
- Resource cleanup
- Comprehensive logging
- Database transaction safety

## Example Output

```
🚀 Initializing AI Agent Demo...
✅ AI Agent Demo initialized

📋 Running demo: math-solver
Provider: openrouter
Model: anthropic/claude-3.5-sonnet
Thinking Mode: deliberate
Prompt: Solve this equation: 3x + 7 = 22. What is x?

🤖 Executing AI Agent...

✅ Execution completed in 3247ms
📊 Results:
────────────────────────────────────────────────────────────────────────────────

📝 Response:
I need to solve the equation 3x + 7 = 22 for x.

Let me work through this step by step:

1) Starting with: 3x + 7 = 22
2) Subtract 7 from both sides: 3x = 22 - 7
3) Simplify: 3x = 15
4) Divide both sides by 3: x = 15/3
5) Simplify: x = 5

Let me verify: 3(5) + 7 = 15 + 7 = 22 ✓

Therefore, x = 5.

🧠 Thinking Process (3 steps):

Step 1: planning
Reasoning: I need to solve this linear equation systematically. I'll isolate x by using inverse operations...
Confidence: 95%

Step 2: reasoning  
Reasoning: Now I'll execute the plan step by step, showing each algebraic manipulation clearly...
Confidence: 98%

Step 3: reflection
Reasoning: The solution looks correct. Let me verify by substituting back into the original equation...
Confidence: 100%

⏱️  Total execution time: 3247ms
💾 Session ID: 550e8400-e29b-41d4-a716-446655440000
```

## Customization

You can easily modify the script to:

1. **Add new demo configurations** in the `DEMO_CONFIGS` object
2. **Test different LLM providers** by changing the provider type
3. **Experiment with thinking modes** (fast, deliberate, collaborative)
4. **Add MCP tools** by registering MCP servers first
5. **Test security features** by trying prompts with injection attempts

## Integration with Workflow System

This script demonstrates how the AI Agent Handler integrates with the existing Zyra architecture:

- Uses the same `BlockHandler` interface as other blocks
- Integrates with `ExecutionLogger` for monitoring
- Persists data using the same Prisma database models
- Follows the same error handling patterns
- Supports the same execution context structure

The AI Agent can be used as a regular block in any Zyra workflow, just like HTTP requests, email notifications, or data transformations.