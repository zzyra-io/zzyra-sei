import { BlockExecutionContext, BlockHandler } from '@zyra/types';

/**
 * Extended BlockExecutionContext for testing purposes
 * This adds nodeId as an alias for node_id to support our test cases
 */
export interface TestBlockExecutionContext extends BlockExecutionContext {
  // Allow nodeId as an alternative to executionId for testing
  nodeId?: string;
  // Allow blockData for direct block configuration in tests
  blockData?: Record<string, any>;
  // Allow inputs for test data
  inputs?: Record<string, any>;
}

/**
 * Extended BlockHandler interface for testing
 * This adds the validate method that our tests expect
 */
export interface TestBlockHandler {
  execute: (node: any, ctx: BlockExecutionContext) => Promise<any>;
  validate: (data: any, ctx?: any) => { valid: boolean; errors?: string[] };
}
