import { NodeCategory } from './categories';

/**
 * Data types for custom block parameters
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
export enum LogicType {
  JAVASCRIPT = "javascript",
  JSON_TRANSFORM = "json_transform",
  TEMPLATE = "template",
  CONDITION = "condition",
}

/**
 * Parameter definition for custom blocks
 */
export interface BlockParameter {
  id: string;
  name: string;
  description: string;
  dataType: DataType;
  required: boolean;
  defaultValue?: any;
}

/**
 * Configuration field definition for custom blocks
 */
export interface BlockConfigField {
  name: string;
  label: string;
  type: "string" | "number" | "boolean" | "json" | "select";
  defaultValue?: any;
  options?: string[];
  required?: boolean;
  placeholder?: string;
  description?: string;
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
  configFields: BlockConfigField[];
  logicType: LogicType;
  logic: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  version?: string;
  tags?: string[];
}

/**
 * Runtime data for a custom block instance
 */
export interface CustomBlockData {
  blockId: string;
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  config: Record<string, any>;
}

/**
 * Custom block execution result
 */
export interface CustomBlockExecutionResult {
  success: boolean;
  outputs: Record<string, any>;
  error?: string;
  logs?: string[];
}

/**
 * Parameter data for AI-generated blocks
 */
export interface BlockParameterAIData {
  name: string;
  description?: string;
  dataType: DataType;
  required?: boolean;
  defaultValue?: any;
}

/**
 * Data for AI-generated custom blocks
 */
export interface AICustomBlockData {
  name: string;
  description: string;
  category: string;
  inputs: BlockParameterAIData[];
  outputs: BlockParameterAIData[];
  configFields: BlockConfigField[];
  code: string;
}

// Helper functions
/**
 * Helper function to create a new parameter definition
 */
export function createParameter(
  name: string,
  type: DataType,
  required = false,
  description = "",
  defaultValue?: any
): BlockParameter {
  return {
    id: `param_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    description,
    dataType: type,
    required,
    defaultValue,
  };
}

/**
 * Helper function to create a new custom block definition
 */
export function createCustomBlockDefinition(
  name: string,
  description: string,
  category: NodeCategory,
  inputs: BlockParameter[] = [],
  outputs: BlockParameter[] = [],
  configFields: BlockConfigField[] = [],
  logicType: LogicType = LogicType.JAVASCRIPT,
  logic = ""
): CustomBlockDefinition {
  return {
    id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    description,
    category,
    inputs,
    outputs,
    configFields,
    logicType,
    logic,
    isPublic: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
