import type { NodeCategory } from "./workflow";

export enum DataType {
  STRING = "string",
  NUMBER = "number",
  BOOLEAN = "boolean",
  OBJECT = "object",
  ARRAY = "array",
  ANY = "any",
}

export enum LogicType {
  JAVASCRIPT = "javascript",
  JSON_TRANSFORM = "json_transform",
  TEMPLATE = "template",
  CONDITION = "condition",
}

export interface BlockParameter {
  id: string;
  name: string;
  description: string;
  dataType: DataType;
  required: boolean;
  defaultValue?: any;
}

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

// Runtime data for a custom block instance
export interface CustomBlockData {
  blockId: string;
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  config: Record<string, any>;
}

// Custom block execution result
export interface ExecutionResult {
  success: boolean;
  outputs: Record<string, any>;
  error?: string;
  logs?: string[];
}

// Helper function to create a new parameter definition
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

// Helper function to create a new custom block definition
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

// Function to execute a custom block's logic
export async function executeCustomBlockLogic(
  blockDefinition: CustomBlockDefinition,
  inputs: Record<string, any>
): Promise<ExecutionResult> {
  try {
    let outputs: Record<string, any> = {};
    const logs: string[] = [];

    // Create a console.log replacement that captures logs
    const log = (...args: any[]) => {
      logs.push(
        args
          .map((arg) =>
            typeof arg === "object" ? JSON.stringify(arg) : String(arg)
          )
          .join(" ")
      );
    };

    switch (blockDefinition.logicType) {
      case LogicType.JAVASCRIPT:
        // Execute JavaScript code
        const asyncFunction = new Function(
          "inputs",
          "log",
          "outputs",
          `
          try {
            ${blockDefinition.logic}
            return outputs;
          } catch (error) {
            throw new Error("Execution error: " + error.message);
          }
          `
        );

        outputs = (await asyncFunction(inputs, log, {})) || {};
        break;

      case LogicType.JSON_TRANSFORM:
        // Apply JSON transformation
        try {
          const template = JSON.parse(blockDefinition.logic);
          outputs = applyJsonTemplate(template, inputs);
        } catch (error) {
          throw new Error(`JSON transform error: ${error.message}`);
        }
        break;

      case LogicType.TEMPLATE:
        // Apply string template
        outputs = {
          result: applyStringTemplate(blockDefinition.logic, inputs),
        };
        break;

      case LogicType.CONDITION:
        // Evaluate condition
        const condition = new Function(
          "inputs",
          `
          try {
            return Boolean(${blockDefinition.logic});
          } catch (error) {
            throw new Error("Condition error: " + error.message);
          }
          `
        );

        outputs = {
          result: condition(inputs),
        };
        break;

      default:
        throw new Error(`Unsupported logic type: ${blockDefinition.logicType}`);
    }

    // Validate outputs against defined output parameters
    const validatedOutputs: Record<string, any> = {};
    for (const output of blockDefinition.outputs) {
      if (output.required && !(output.name in outputs)) {
        throw new Error(`Required output '${output.name}' is missing`);
      }

      if (output.name in outputs) {
        validatedOutputs[output.name] = outputs[output.name];
      } else if (output.defaultValue !== undefined) {
        validatedOutputs[output.name] = output.defaultValue;
      }
    }

    return {
      success: true,
      outputs: validatedOutputs,
      logs,
    };
  } catch (error) {
    return {
      success: false,
      outputs: {},
      error: error instanceof Error ? error.message : String(error),
      logs: [],
    };
  }
}

// Helper function to apply a JSON template
function applyJsonTemplate(template: any, data: Record<string, any>): any {
  if (
    typeof template === "string" &&
    template.startsWith("{{") &&
    template.endsWith("}}")
  ) {
    const path = template.slice(2, -2).trim();
    return getNestedValue(data, path);
  } else if (Array.isArray(template)) {
    return template.map((item) => applyJsonTemplate(item, data));
  } else if (typeof template === "object" && template !== null) {
    const result: Record<string, any> = {};
    for (const key in template) {
      result[key] = applyJsonTemplate(template[key], data);
    }
    return result;
  }
  return template;
}

// Helper function to apply a string template
function applyStringTemplate(
  template: string,
  data: Record<string, any>
): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
    const value = getNestedValue(data, path.trim());
    return value !== undefined ? String(value) : "";
  });
}

// Helper function to get a nested value from an object
function getNestedValue(obj: Record<string, any>, path: string): any {
  const parts = path.split(".");
  let current = obj;

  for (const part of parts) {
    if (current === undefined || current === null) {
      return undefined;
    }
    current = current[part];
  }

  return current;
}

export interface BlockParameterAIData {
  name: string;
  description?: string;
  dataType: DataType;
  required?: boolean;
  defaultValue?: any;
}

export interface AICustomBlockData {
  name: string;
  description: string;
  category: string;
  inputs: BlockParameterAIData[];
  outputs: BlockParameterAIData[];
  configFields: BlockConfigField[];
  code: string;
}

// Custom block execution result
export interface ExecutionResult {
  success: boolean;
  outputs: Record<string, any>;
  error?: string;
  logs?: string[];
}
