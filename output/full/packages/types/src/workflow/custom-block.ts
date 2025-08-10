import { NodeCategory } from './categories';

/**
 * Data types for inputs/outputs
 */
export enum DataType {
  STRING = "string",
  NUMBER = "number",
  BOOLEAN = "boolean",
  OBJECT = "object",
  ARRAY = "array",
  ANY = "any",
}

/**
 * Logic execution types for custom blocks
 */
export enum ExecutionType {
  FUNCTION = "function",
  CODE = "code",
  WEBHOOK = "webhook",
}

/**
 * Logic types for custom block execution
 */
export enum LogicType {
  JAVASCRIPT = "javascript",
  TYPESCRIPT = "typescript",
  PYTHON = "python",
  REST_API = "rest-api",
  // Add these to match worker implementation
  JSON_TRANSFORM = "json-transform",
  TEMPLATE = "template",
  CONDITION = "condition",
}

/**
 * Interface for custom block input parameters
 */
export interface CustomBlockInput {
  name: string;
  description: string;
  dataType: DataType;
  required: boolean;
  defaultValue?: any;
}

/**
 * Interface for custom block output parameters
 */
export interface CustomBlockOutput {
  name: string;
  description: string;
  dataType: DataType;
  required: boolean;
}

/**
 * Interface for custom block configuration fields
 */
export interface CustomBlockConfigField {
  name: string;
  label: string;
  type: string;
  defaultValue?: any;
  options?: string[];
  required?: boolean;
  placeholder?: string;
  description?: string;
}

/**
 * Block parameter definition
 */
export interface BlockParameter {
  name: string;
  type: DataType;
  description: string;
  required: boolean;
  defaultValue?: any;
}

/**
 * Custom block definition
 */
export interface CustomBlockDefinition {
  id: string;
  name: string;
  description: string;
  category: NodeCategory;
  inputs: BlockParameter[];
  outputs: BlockParameter[];
  code: string;
  logicType: LogicType;
  isPublic?: boolean;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  tags?: string[];
}

/**
 * Interface for AI-generated custom block data
 */
export interface AICustomBlockData {
  name: string;
  description: string;
  category: string;
  inputs: CustomBlockInput[];
  outputs: CustomBlockOutput[];
  configFields: CustomBlockConfigField[];
  code: string;
}

/**
 * Complete custom block data with all properties
 */
export interface CustomBlockData {
  id: string;
  name: string;
  description: string;
  category: NodeCategory;
  code: string;
  logicType: LogicType;
  inputs: BlockParameter[];
  outputs: BlockParameter[];
  isPublic: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  version?: string;
  rating?: number;
  downloads?: number;
}

/**
 * Result of custom block execution
 */
export interface CustomBlockExecutionResult {
  success: boolean;
  outputs?: Record<string, any>;
  error?: string;
  logs?: string[];
}

/**
 * Helper function to create a block parameter
 */
export function createParameter(name: string, type: DataType, description: string, required = true, defaultValue?: any): BlockParameter {
  return {
    name,
    type,
    description,
    required,
    defaultValue,
  };
}

/**
 * Helper function to create a custom block definition
 */
export function createCustomBlockDefinition(options: {
  id: string;
  name: string;
  description: string;
  category: NodeCategory;
  inputs: BlockParameter[];
  outputs: BlockParameter[];
  code: string;
  logicType: LogicType;
  isPublic?: boolean;
  createdBy?: string;
}): CustomBlockDefinition {
  return {
    ...options,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
