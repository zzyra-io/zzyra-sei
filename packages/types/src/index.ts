// Export all workflow types directly from the workflow module
export * from './workflow';

// Export wallet types for blockchain integration
export * from './wallet';

// Explicitly re-export critical types at the top level for backward compatibility
// This ensures all import paths continue to work for both UI and worker components
export { BlockType } from './workflow/block-types';
export { NodeCategory } from './workflow/categories';

// Re-export custom block types
export { 
  DataType, 
  LogicType,
  AICustomBlockData, 
  CustomBlockData,
  BlockParameter, 
  CustomBlockDefinition,
  CustomBlockExecutionResult,
  createParameter,
  createCustomBlockDefinition
} from './workflow/custom-block';

// Re-export execution related types
export { 
  BlockExecutionContext, 
  BlockHandler 
} from './workflow/execution';

// Re-export metadata helper functions
export { getBlockMetadata, getBlockType } from './workflow/metadata';
