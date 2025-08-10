/**
 * Workflow execution types shared between UI and worker
 */

/**
 * Execution status types
 */
export type ExecutionStatus = "pending" | "running" | "completed" | "failed";

/**
 * Execution log record
 */
export interface ExecutionLog {
  id: string;
  execution_id: string;
  node_id: string;
  level: string;
  message: string;
  data?: any;
  timestamp: string;
}

/**
 * Node execution record
 */
export interface NodeExecution {
  id: string;
  execution_id: string;
  node_id: string;
  status: string;
  started_at: string;
  completed_at?: string;
}

/**
 * Complete workflow execution result
 */
export interface ExecutionResult {
  id: string;
  workflow_id: string;
  status: string;
  started_at: string;
  completed_at?: string;
  result?: any;
  logs: ExecutionLog[];
  nodeExecutions: NodeExecution[];
}

/**
 * Context provided to block handlers during execution
 */
export interface BlockExecutionContext {
  nodeId: string;
  executionId: string;
  workflowId: string;
  userId: string;
  inputs: Record<string, any>;
  previousOutputs?: Record<string, any>;
  config: Record<string, any>;
  // Added workflowData field that many handlers use
  workflowData?: Record<string, any>;
  logger: {
    // Added log method for compatibility with worker implementation
    log: (message: string, data?: any) => void;
    debug: (message: string, data?: any) => void;
    info: (message: string, data?: any) => void;
    warn: (message: string, data?: any) => void;
    error: (message: string, data?: any) => void;
  };
  // Used by custom blocks to access additional services
  services?: Record<string, any>;
  // Blockchain authorization for workflows with blockchain operations
  blockchainAuthorization?: {
    selectedChains: Array<{
      chainId: string;
      chainName: string;
      maxDailySpending: string;
      allowedOperations: string[];
      tokenSymbol: string;
      enabled?: boolean;
    }>;
    duration: number;
    timestamp: number;
    sessionKeyId?: string;
    delegationSignature?: string;
  };
}

/**
 * Standardized data structure for all block inputs/outputs (n8n-inspired)
 */
export interface ZyraNodeData {
  json: Record<string, any>;
  binary?: Record<string, BinaryData>;
  error?: ZyraNodeError;
  pairedItem?: {
    item: number;
    input?: number;
  };
}

export interface BinaryData {
  data: string; // base64 encoded
  mimeType: string;
  fileName?: string;
  fileSize?: number;
}

export interface ZyraNodeError {
  message: string;
  stack?: string;
  name?: string;
  timestamp?: string;
  context?: Record<string, any>;
}

/**
 * Enhanced execution context with helper methods and services
 */
export interface EnhancedBlockExecutionContext extends BlockExecutionContext {
  // Input/output data methods
  getInputData(inputIndex?: number): ZyraNodeData[];
  getNodeParameter(parameterName: string, itemIndex?: number): any;
  getCredentials?(type: string): Promise<any>;
  getWorkflowStaticData?(type: string): any;

  // Helper methods
  helpers: {
    httpRequest: (options: HttpRequestOptions) => Promise<any>;
    processTemplate: (template: string, data: any) => string;
    formatValue: (value: any, format?: string) => string;
    constructExecutionMetaData: (
      inputData: ZyraNodeData[],
      outputData: any[]
    ) => ZyraNodeData[];
    normalizeItems: (items: any) => ZyraNodeData[];
    returnJsonArray: (jsonData: any[]) => ZyraNodeData[];
  };
}

export interface HttpRequestOptions {
  url: string;
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  followRedirects?: boolean;
  ignoreHttpStatusErrors?: boolean;
  auth?: {
    username: string;
    password: string;
  };
}

/**
 * Enhanced block definition for infinite use cases
 */
export interface EnhancedBlockDefinition {
  // Basic identification
  displayName: string;
  name: string;
  version: number;
  description: string;

  // Visual properties
  icon: string;
  color: string;
  group: BlockGroup[];

  // Configuration
  properties: BlockProperty[];
  defaults?: Record<string, any>;

  // Connections
  inputs: ConnectionType[];
  outputs: ConnectionType[];

  // Advanced features
  credentials?: CredentialDefinition[];
  webhooks?: WebhookDefinition[];
  polling?: boolean;
  subtitle?: string;

  // Documentation
  documentation?: {
    examples: BlockExample[];
    resources: DocumentationResource[];
  };
}

export enum BlockGroup {
  TRIGGER = "trigger",
  ACTION = "action",
  CONDITION = "condition",
  TRANSFORM = "transform",
  AI = "ai",
  BLOCKCHAIN = "blockchain",
  COMMUNICATION = "communication",
  DATA = "data",
  UTILITY = "utility",
}

export enum ConnectionType {
  MAIN = "main",
  AI = "ai",
}

export interface BlockProperty {
  displayName: string;
  name: string;
  type: PropertyType;
  required?: boolean;
  default?: any;
  description?: string;
  options?: PropertyOption[];
  typeOptions?: PropertyTypeOptions;
  displayOptions?: DisplayOptions;
}

export enum PropertyType {
  STRING = "string",
  NUMBER = "number",
  BOOLEAN = "boolean",
  OPTIONS = "options",
  MULTI_OPTIONS = "multiOptions",
  COLLECTION = "collection",
  JSON = "json",
  DATETIME = "dateTime",
  CREDENTIALS = "credentials",
  HIDDEN = "hidden",
}

export interface PropertyOption {
  name: string;
  value: string | number | boolean;
  description?: string;
}

export interface PropertyTypeOptions {
  minValue?: number;
  maxValue?: number;
  password?: boolean;
  rows?: number;
  multipleValues?: boolean;
  showAlpha?: boolean;
}

export interface DisplayOptions {
  show?: Record<string, any[]>;
  hide?: Record<string, any[]>;
}

export interface CredentialDefinition {
  name: string;
  required?: boolean;
  displayOptions?: DisplayOptions;
}

export interface WebhookDefinition {
  name: string;
  httpMethod: string;
  responseMode: "onReceived" | "lastNode";
  path: string;
}

export interface BlockExample {
  name: string;
  description: string;
  workflow: any;
}

export interface DocumentationResource {
  url: string;
  text: string;
}

/**
 * Interface for block handlers that execute workflow nodes
 */
export interface BlockHandler {
  // Updated signature to match worker implementation with 2 parameters
  execute(
    node: any,
    context: BlockExecutionContext
  ): Promise<Record<string, any>>;
  validate?(config: Record<string, any>): boolean;
  getDefaultConfig?(): Record<string, any>;
}

/**
 * Enhanced block handler interface for new generic blocks
 */
export interface EnhancedBlockHandler {
  definition: EnhancedBlockDefinition;
  execute(context: EnhancedBlockExecutionContext): Promise<ZyraNodeData[]>;
  validate?(config: Record<string, any>): Promise<ValidationResult>;
  loadOptions?(
    methodName: string,
    context: EnhancedBlockExecutionContext
  ): Promise<PropertyOption[]>;
  credentialTest?(
    credentials: any,
    context: EnhancedBlockExecutionContext
  ): Promise<boolean>;
  webhook?(context: EnhancedBlockExecutionContext): Promise<any>;
  poll?(context: EnhancedBlockExecutionContext): Promise<ZyraNodeData[]>;
  trigger?(context: EnhancedBlockExecutionContext): Promise<ZyraNodeData[]>;
}

export interface ValidationResult {
  valid: boolean;
  isValid?: boolean; // Alias for backward compatibility
  errors?: string[];
  warnings?: string[];
}

/**
 * Template processing system for dynamic content
 */
export interface TemplateProcessor {
  process(template: string, data: any, context?: any): string;
  validate(template: string): boolean;
  getVariables(template: string): string[];
}

/**
 * Data mapping system for connecting blocks
 */
export interface DataMapping {
  mappings: FieldMapping[];
  transformations?: DataTransformation[];
}

export interface FieldMapping {
  source: string;
  target: string;
  defaultValue?: any;
  required?: boolean;
  transform?: (value: any) => any;
}

export interface DataTransformation {
  type: "format" | "calculate" | "filter" | "aggregate";
  config: Record<string, any>;
}
