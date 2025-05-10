import { generateText, GenerateTextResult } from 'ai';
import { AgentExecutor } from 'langchain/agents';

// Define a generic options type for flexibility
export type ExecuteAIOptions = {
  vercel?: Record<string, any>; // Options for the 'vercel' adapter
  langchain?: Record<string, any>; // Options for the 'langchain' adapter
};

/**
 * Executes AI tasks using the specified adapter with customizable options.
 * TODO: Implement 'langchain' adapter and other adapters.
 *
 * @param adapter - The AI adapter ('vercel' or 'langchain').
 * @param instruction - The prompt or instruction for the AI.
 * @param tools - Tools available to the AI (e.g., on-chain functions).
 * @param modelOrAgent - The model (for 'vercel') or agent (for 'langchain').
 * @param options - Optional settings for the chosen adapter.
 * @returns The result of the AI execution.
 * @throws Error if the adapter is not supported.
 */
export async function executeAI(
  adapter: 'vercel' | 'langchain',
  instruction: string,
  tools: any,
  modelOrAgent: any,
  options: ExecuteAIOptions = {},
): Promise<GenerateTextResult<any, never> | Record<string, unknown>> {
  if (adapter === 'vercel') {
    const vercelOptions = options.vercel || {};
    return await generateText({
      model: modelOrAgent,
      tools,
      prompt: instruction,
      ...vercelOptions, // Spread generic options for 'vercel'
    });
    // } else if (adapter === 'langchain') {
    //   const langchainOptions = options.langchain || {};
    //   const agentExecutor = new AgentExecutor({
    //     agent: modelOrAgent,
    //     tools,
    //     ...langchainOptions, // Spread generic options for 'langchain'
    //   });
    //   return await agentExecutor.invoke({ input: instruction });
    // } else {
    //   throw new Error(`Unsupported AI adapter: ${adapter}`);
  }
}
