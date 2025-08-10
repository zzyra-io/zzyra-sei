import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as vm from 'vm';
import { ethers } from 'ethers';

/**
 * Service for generating and executing code for DeFi blocks using AI
 *
 * This service handles:
 * 1. Generating code for DeFi block execution using AI
 * 2. Validating and sanitizing generated code
 * 3. Safely executing the code in a sandboxed environment
 * 4. Handling errors and reporting issues with generated code
 */
@Injectable()
export class CodeGenerationService {
  private readonly logger = new Logger(CodeGenerationService.name);
  private readonly TIMEOUT_MS = 10000; // 10 seconds max execution time

  constructor() {}

  /**
   * Generate code for a DeFi block operation using AI
   *
   * @param blockType The type of DeFi block
   * @param description Natural language description of what the block should do
   * @param config Configuration parameters for the block
   * @returns Generated code as a string
   */
  async generateCode(
    blockType: string,
    description: string,
    config: any,
  ): Promise<string> {
    try {
      // In production, this would call OpenAI/OpenRouter API
      // For now, we'll use a simple template-based approach

      this.logger.log(
        `Generating code for ${blockType} with description: ${description}`,
      );

      const prompt = `
You are an AI assistant that generates secure, well-structured TypeScript code for DeFi operations.
You're generating code for a block of type: ${blockType}
Block description: ${description}
Block configuration: ${JSON.stringify(config, null, 2)}

The code must:
1. Be valid, secure TypeScript with proper error handling
2. Use ethers.js for Web3 interactions
3. Handle errors gracefully with try/catch blocks
4. Not include any imports (dependencies are already available)
5. Be in the form of an async function that takes inputs and context parameters
6. Return an object with the operation results

Return ONLY the code without any markdown formatting or explanation, starting with "async function execute".
`;

      // In production, this would be an API call to OpenAI or similar
      // For demonstration purposes, I'm including some template code based on block type

      let generatedCode: string;

      switch (blockType) {
        case 'DEFI_PRICE_MONITOR':
          generatedCode = this.getPriceMonitorTemplate(config);
          break;
        case 'DEFI_SWAP':
          generatedCode = this.getSwapTemplate(config);
          break;
        case 'DEFI_YIELD_STRATEGY':
          generatedCode = this.getYieldStrategyTemplate(config);
          break;
        default:
          generatedCode = this.getDefaultTemplate(blockType, config);
      }

      return generatedCode;
    } catch (error) {
      this.logger.error(
        `Error generating code for ${blockType}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new Error(
        `Failed to generate code: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Validate generated code for security issues
   *
   * @param code Code to validate
   * @returns Validation result and any detected issues
   */
  validateCode(code: string): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check for potentially dangerous operations
    const dangerousPatterns = [
      /eval\s*\(/, // Direct eval
      /Function\s*\(/, // Function constructor
      /process\.env/, // Accessing environment variables
      /require\s*\(/, // Dynamic requires
      /import\s*\(/, // Dynamic imports
      /fs\./, // File system operations
      /child_process/, // Child process operations
      /http\.createServer/, // Creating servers
      /net\./, // Network operations
      /crypto\.randomBytes/, // Random bytes generation (could be crypto mining)
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(code)) {
        issues.push(`Dangerous code pattern detected: ${pattern}`);
      }
    }

    // Basic syntax check
    try {
      // Try to parse the code
      new Function(code);
    } catch (error) {
      issues.push(
        `Syntax error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }

  /**
   * Execute generated code in a sandboxed environment
   *
   * @param code Code to execute
   * @param inputs Block inputs
   * @param context Block execution context
   * @returns Result of code execution
   */
  async executeCode(code: string, inputs: any, context: any): Promise<any> {
    // First validate the code
    const validation = this.validateCode(code);
    if (!validation.isValid) {
      throw new Error(
        `Code validation failed: ${validation.issues.join(', ')}`,
      );
    }

    try {
      // Create a safe context with only allowed libraries and functions
      const sandbox: any = {
        console: {
          log: (message: string, ...args: any[]) => this.logger.log(message),
          error: (message: string, ...args: any[]) =>
            this.logger.error(message),
          warn: (message: string, ...args: any[]) => this.logger.warn(message),
        },
        setTimeout,
        clearTimeout,
        ethers,
        inputs,
        context,
        Buffer,
        fetch: async (url: string, options?: any) => {
          return await axios.get(url, options);
        },
        result: null,
      };

      // Create the script with the function wrapper
      const script = new vm.Script(`
        try {
          ${code}
          result = (async () => {
            try {
              return await execute(inputs, context);
            } catch (error) {
              return { error: error.message };
            }
          })();
        } catch (error) {
          result = Promise.resolve({ error: error.message });
        }
      `);

      // Create context for script execution
      const vmContext = vm.createContext(sandbox);

      // Execute with timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error('Code execution timed out')),
          this.TIMEOUT_MS,
        );
      });

      // Run the script
      script.runInContext(vmContext);

      // Wait for the result with timeout
      const result = await Promise.race([sandbox.result, timeoutPromise]);

      // Check for errors in the result
      if (result && result.error) {
        throw new Error(`Execution error: ${result.error}`);
      }

      return result;
    } catch (error) {
      this.logger.error(
        `Error executing code: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new Error(
        `Code execution failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Learn from successful code executions
   *
   * @param blockType The type of DeFi block
   * @param code The code that was executed
   * @param result The result of the execution
   * @param executionTime Time taken to execute in ms
   */
  learnFromExecution(
    blockType: string,
    code: string,
    result: any,
    executionTime: number,
  ): void {
    // In a real implementation, this would record successful code patterns to improve future generation
    // For now, just log it
    this.logger.log(
      `Learning from ${blockType} execution (${executionTime}ms): ${JSON.stringify(result).substring(0, 100)}...`,
    );

    // Here would be logic to:
    // 1. Store successful code patterns
    // 2. Associate configurations with successful implementations
    // 3. Track performance metrics
    // 4. Update model weights or databases
  }

  // Template generation helpers
  private getPriceMonitorTemplate(config: any): string {
    return `async function execute(inputs, context) {
  try {
    // Configuration
    const { asset, targetPrice, condition } = context.config;
    
    // Get price data using a reliable price oracle API
    const response = await fetch(\`https://api.coingecko.com/api/v3/simple/price?ids=\${asset.toLowerCase()}&vs_currencies=usd\`);
    const data = await response.json();
    
    // Extract current price
    const currentPrice = data[asset.toLowerCase()]?.usd;
    if (!currentPrice) {
      throw new Error(\`Could not get price for \${asset}\`);
    }
    
    // Determine if price condition is met
    let conditionMet = false;
    switch(condition) {
      case 'above':
        conditionMet = currentPrice > parseFloat(targetPrice);
        break;
      case 'below':
        conditionMet = currentPrice < parseFloat(targetPrice);
        break;
      case 'equal':
        // Use a small threshold for equality comparisons
        const threshold = parseFloat(targetPrice) * 0.01; // 1% threshold
        conditionMet = Math.abs(currentPrice - parseFloat(targetPrice)) <= threshold;
        break;
      default:
        throw new Error(\`Invalid condition: \${condition}\`);
    }
    
    return {
      asset,
      currentPrice,
      targetPrice: parseFloat(targetPrice),
      condition,
      conditionMet,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error in price monitor execution:', error);
    return {
      error: error.message,
      errorType: 'EXECUTION_ERROR',
      timestamp: new Date().toISOString()
    };
  }
}`;
  }

  private getSwapTemplate(config: any): string {
    return `async function execute(inputs, context) {
  try {
    // Configuration
    const { 
      network, 
      rpcUrl,
      fromToken, 
      toToken, 
      amount, 
      slippage = 0.5,
      walletAddress
    } = context.config;
    
    // Connect to the network
    if (!rpcUrl) {
      throw new Error('RPC URL is required');
    }
    
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    
    // In a real implementation, we would:
    // 1. Connect to an aggregator like 1inch or 0x
    // 2. Get the best swap route
    // 3. Build the transaction
    // 4. Execute or return it for signing
    
    // For demonstration, we'll simulate a swap
    console.log(\`Simulating swap of \${amount} \${fromToken} to \${toToken} on \${network}\`);
    
    // Simulate getting quotes
    const simulatedRate = 1000 + Math.random() * 500; // Random rate
    const expectedOutput = parseFloat(amount) * simulatedRate;
    const minOutput = expectedOutput * (1 - (slippage / 100));
    
    return {
      fromToken,
      toToken,
      fromAmount: parseFloat(amount),
      expectedToAmount: expectedOutput,
      minToAmount: minOutput,
      executionRate: simulatedRate,
      network,
      status: 'SIMULATED', // In production: PENDING, COMPLETED, FAILED
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error in swap execution:', error);
    return {
      error: error.message,
      errorType: 'EXECUTION_ERROR',
      timestamp: new Date().toISOString()
    };
  }
}`;
  }

  private getYieldStrategyTemplate(config: any): string {
    return `async function execute(inputs, context) {
  try {
    // Configuration
    const { 
      assets,
      protocols, 
      optimizationGoal,
      rebalancingInterval,
      minYieldThreshold
    } = context.config;
    
    // In a real implementation, we would:
    // 1. Query different protocols for their current yield rates
    // 2. Calculate the optimal allocation based on the optimization goal
    // 3. Generate a rebalancing strategy
    
    // For demonstration, simulate getting yields
    const simulatedYields = protocols.map(protocol => ({
      protocol,
      yields: assets.reduce((acc, asset) => {
        // Random yield between 1% and 15%
        acc[asset] = 1 + Math.random() * 14; 
        return acc;
      }, {})
    }));
    
    // Determine the best allocation based on optimization goal
    let allocation;
    
    switch(optimizationGoal) {
      case 'max_yield':
        // For max yield, allocate to highest yield per asset
        allocation = assets.map(asset => {
          const bestProtocol = simulatedYields.reduce((best, current) => {
            return (current.yields[asset] > best.yields[asset]) ? current : best;
          }, simulatedYields[0]);
          
          return {
            asset,
            protocol: bestProtocol.protocol,
            allocation: 1.0 / assets.length, // Equal allocation per asset
            expectedYield: bestProtocol.yields[asset]
          };
        });
        break;
        
      case 'min_risk':
        // For min risk, distribute across protocols with yields above threshold
        allocation = assets.map(asset => {
          const validProtocols = simulatedYields
            .filter(p => p.yields[asset] >= minYieldThreshold)
            .sort((a, b) => a.yields[asset] - b.yields[asset]); // Sort by lowest yield (lowest risk)
          
          if (validProtocols.length === 0) {
            return {
              asset,
              protocol: 'HOLD', // Hold if no protocol meets criteria
              allocation: 1.0 / assets.length,
              expectedYield: 0
            };
          }
          
          return {
            asset,
            protocol: validProtocols[0].protocol,
            allocation: 1.0 / assets.length,
            expectedYield: validProtocols[0].yields[asset]
          };
        });
        break;
        
      case 'balanced':
      default:
        // For balanced, distribute across multiple protocols
        allocation = assets.map(asset => {
          const validProtocols = simulatedYields
            .filter(p => p.yields[asset] >= minYieldThreshold)
            .sort((a, b) => b.yields[asset] - a.yields[asset]); // Sort by yield descending
            
          if (validProtocols.length === 0) {
            return {
              asset,
              protocol: 'HOLD',
              allocation: 1.0 / assets.length,
              expectedYield: 0
            };
          }
          
          // Take top 2 protocols if available
          const selectedProtocols = validProtocols.slice(0, Math.min(2, validProtocols.length));
          const totalYield = selectedProtocols.reduce((sum, p) => sum + p.yields[asset], 0);
          
          // Weight by yield
          return selectedProtocols.map(protocol => ({
            asset,
            protocol: protocol.protocol,
            allocation: (1.0 / assets.length) * (protocol.yields[asset] / totalYield),
            expectedYield: protocol.yields[asset]
          }));
        }).flat();
        break;
    }
    
    return {
      strategy: optimizationGoal,
      assetAllocation: allocation,
      rebalancingInterval,
      nextRebalanceTime: new Date(Date.now() + rebalancingInterval * 60 * 60 * 1000).toISOString(),
      expectedPortfolioYield: allocation.reduce((sum, item) => sum + (item.expectedYield * item.allocation), 0),
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error in yield strategy execution:', error);
    return {
      error: error.message,
      errorType: 'EXECUTION_ERROR',
      timestamp: new Date().toISOString()
    };
  }
}`;
  }

  private getDefaultTemplate(blockType: string, config: any): string {
    return `async function execute(inputs, context) {
  try {
    // Generic implementation for ${blockType}
    const config = context.config;
    
    console.log('Executing ${blockType} with config:', config);
    
    // Return all inputs and config as a simple passthrough
    return {
      blockType: '${blockType}',
      config: config,
      inputs: inputs,
      message: 'Generic handler executed successfully',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error in ${blockType} execution:', error);
    return {
      error: error.message,
      errorType: 'EXECUTION_ERROR',
      timestamp: new Date().toISOString()
    };
  }
}`;
  }
}
