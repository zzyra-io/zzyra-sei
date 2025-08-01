// Export all workflow types directly from the workflow module
export * from "./workflow";

// Export wallet types for blockchain integration
export * from "./wallet";

// Export schemas
export {
  blockSchemas,
  enhancedBlockSchemas,
  getEnhancedBlockSchema,
  hasEnhancedSchema,
  enhancedHttpRequestSchema,
  enhancedNotificationSchema,
  enhancedDataTransformSchema,
  validateBlockConfig,
  validateEnhancedBlockConfig,
  validateBlockInputs,
  validateBlockOutputs,
  safeValidateBlockConfig,
  safeValidateBlockInputs,
  safeValidateBlockOutputs,
} from "./schemas/blockSchemas";

// Export blockchain schemas
export { walletListenerSchema } from "./schemas/blockchains/wallet-listener/schema";
export type {
  WalletListenerConfig,
  WalletListenerInput,
  WalletListenerOutput,
} from "./schemas/blockchains/wallet-listener/schema";

// Export metadata catalog
export { BLOCK_CATALOG } from "./workflow/metadata";

// Explicitly re-export critical types at the top level for backward compatibility
// This ensures all import paths continue to work for both UI and worker components
export { BlockType } from "./workflow/block-types";
export { NodeCategory } from "./workflow/categories";

// Re-export custom block types
export { DataType, LogicType } from "./workflow/custom-block";
export type {
  AICustomBlockData,
  CustomBlockData,
  BlockParameter,
  CustomBlockDefinition,
  CustomBlockExecutionResult,
} from "./workflow/custom-block";
export {
  createParameter,
  createCustomBlockDefinition,
} from "./workflow/custom-block";

// Re-export execution related types
export type {
  BlockExecutionContext,
  BlockHandler,
  EnhancedBlockExecutionContext,
  EnhancedBlockHandler,
  EnhancedBlockDefinition,
  ZyraNodeData,
  BinaryData,
  ZyraNodeError,
  ValidationResult,
  TemplateProcessor,
  DataMapping,
  FieldMapping,
  DataTransformation,
  HttpRequestOptions,
  BlockProperty,
  PropertyOption,
  PropertyTypeOptions,
  DisplayOptions,
  CredentialDefinition,
  WebhookDefinition,
  BlockExample,
  DocumentationResource,
} from "./workflow/execution";

// Export enums as values
export { BlockGroup, ConnectionType, PropertyType } from "./workflow/execution";

// Re-export metadata helper functions
export { getBlockMetadata, getBlockType } from "./workflow/metadata";
