/**
 * AI Prompt Builder for Zzyra Custom Blocks
 * Creates structured prompts for different types of custom blocks
 */

export interface BlockPromptData {
  blockName: string;
  blockDescription: string;
  blockInputs: string;
  blockOutputs: string;
  blockCategory: string;
}

/**
 * Builds a structured prompt for custom block generation
 */
export function buildCustomBlockPrompt(blockData: BlockPromptData): string {
  // Parse raw inputs/outputs for better context
  const parsedInputs = blockData.blockInputs
    ? blockData.blockInputs
        .split(/[,\n]/)
        .map((i) => i.trim())
        .filter(Boolean)
        .join("\n- ")
    : "Default input: A string input parameter";

  const parsedOutputs = blockData.blockOutputs
    ? blockData.blockOutputs
        .split(/[,\n]/)
        .map((o) => o.trim())
        .filter(Boolean)
        .join("\n- ")
    : "Default output: A processed result parameter";

  return `
Create a production-ready custom workflow block for the Zzyra platform with the following specifications:

NAME: ${blockData.blockName}
DESCRIPTION: ${blockData.blockDescription}
CATEGORY: ${blockData.blockCategory || "ACTION"}

INPUTS:
- ${parsedInputs}

OUTPUTS:
- ${parsedOutputs}

REQUIREMENTS:
1. The block must have proper input validation
2. Include error handling for all operations
3. Generate efficient JavaScript code that runs in a Node.js environment
4. Add helpful comments explaining complex parts of the logic
5. Follow best practices for security and performance
6. Ensure all inputs are properly processed

The code should be complete and ready to execute in a workflow context.
`;
}

/**
 * Builds a specialized prompt for DeFi/Finance blocks
 */
export function buildFinanceBlockPrompt(blockData: BlockPromptData): string {
  // Parse raw inputs/outputs for better context
  const parsedInputs = blockData.blockInputs
    ? blockData.blockInputs
        .split(/[,\n]/)
        .map((i) => i.trim())
        .filter(Boolean)
        .join("\n- ")
    : "walletAddress: The address to use for transactions";

  const parsedOutputs = blockData.blockOutputs
    ? blockData.blockOutputs
        .split(/[,\n]/)
        .map((o) => o.trim())
        .filter(Boolean)
        .join("\n- ")
    : "transactionResult: The result of the transaction";

  return `
Create a production-ready DeFi/Finance block for the Zzyra blockchain workflow platform:

NAME: ${blockData.blockName}
DESCRIPTION: ${blockData.blockDescription}
CATEGORY: FINANCE

INPUTS:
- ${parsedInputs}

OUTPUTS:
- ${parsedOutputs}

SPECIALIZED REQUIREMENTS:
1. Include thorough validation of blockchain addresses and transaction parameters
2. Implement proper error handling for network issues and transaction failures
3. Add reasonable timeouts and retry mechanisms
4. Consider gas fee optimization where applicable
5. Include security best practices for handling private keys and sensitive data
6. Add detailed logging for transaction tracking
7. Generate efficient JavaScript code with ethers.js or similar libraries

The block should handle common blockchain edge cases like:
- Network congestion
- Failed transactions
- Gas price fluctuations
- RPC endpoint failures

The code should be complete, secure, and ready for production use in financial workflows.
`;
}

/**
 * Builds a specialized prompt for data transformation blocks
 */
export function buildTransformerBlockPrompt(
  blockData: BlockPromptData
): string {
  // Parse raw inputs/outputs for better context
  const parsedInputs = blockData.blockInputs
    ? blockData.blockInputs
        .split(/[,\n]/)
        .map((i) => i.trim())
        .filter(Boolean)
        .join("\n- ")
    : "inputData: The data to transform";

  const parsedOutputs = blockData.blockOutputs
    ? blockData.blockOutputs
        .split(/[,\n]/)
        .map((o) => o.trim())
        .filter(Boolean)
        .join("\n- ")
    : "transformedData: The transformed data";

  return `
Create a high-performance data transformation block for the Zzyra workflow automation platform:

NAME: ${blockData.blockName}
DESCRIPTION: ${blockData.blockDescription}
CATEGORY: TRANSFORMER

INPUTS:
- ${parsedInputs}

OUTPUTS:
- ${parsedOutputs}

SPECIALIZED REQUIREMENTS:
1. Optimize for handling potentially large datasets efficiently
2. Include robust data validation and type checking
3. Implement proper error handling for malformed data
4. Handle edge cases like empty inputs, null values, and unexpected types
5. Use efficient data manipulation techniques (avoid unnecessary loops or deep copies)
6. Add detailed comments explaining the transformation logic
7. Consider memory usage for large datasets

The code should be production-ready with excellent performance characteristics and appropriate error handling.
`;
}

/**
 * Gets the appropriate prompt builder based on block category
 */
export function getPromptBuilderForCategory(
  category: string
): (data: BlockPromptData) => string {
  switch (category.toUpperCase()) {
    case "FINANCE":
      return buildFinanceBlockPrompt;
    case "TRANSFORMER":
      return buildTransformerBlockPrompt;
    default:
      return buildCustomBlockPrompt;
  }
}
