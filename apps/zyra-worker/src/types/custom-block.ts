// Import shared types from @zyra/types
import { 
  NodeCategory, 
  DataType,
  LogicType,
  BlockParameter as SharedBlockParameter,
  CustomBlockDefinition as SharedCustomBlockDefinition,
  CustomBlockData as SharedCustomBlockData,
  CustomBlockExecutionResult as SharedExecutionResult,
  createParameter as sharedCreateParameter,
  createCustomBlockDefinition as sharedCreateCustomBlockDefinition
} from "@zyra/types";

// Re-export the shared types
export { DataType, LogicType };

// Re-export using aliases to avoid import/export conflicts
export type BlockParameter = SharedBlockParameter;
export type CustomBlockDefinition = SharedCustomBlockDefinition;
export type CustomBlockData = SharedCustomBlockData;
export type ExecutionResult = SharedExecutionResult;

// Use the shared helper functions to create parameters and custom blocks
export const createParameter = sharedCreateParameter;

// Modified version of the shared function to include configFields which was missing
export function createCustomBlockDefinition(
  name: string,
  description: string,
  category: NodeCategory,
  inputs: BlockParameter[] = [],
  outputs: BlockParameter[] = [],
  configFields: any[] = [], // Add configFields parameter
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
    configFields, // Include configFields in the returned object
    logicType,
    logic,
    isPublic: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// Worker-specific implementation of custom block execution
export async function executeCustomBlockLogic(
  blockDefinition: CustomBlockDefinition,
  inputs: Record<string, any>
): Promise<ExecutionResult> {
  try {
    let outputs: Record<string, any> = {};
    const logs: string[] = [];

    const log = (...args: any[]) => {
      logs.push(
        args
          .map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : String(arg)))
          .join(" ")
      );
    };

    switch (blockDefinition.logicType) {
      case LogicType.JAVASCRIPT: {
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
      }
      case LogicType.JSON_TRANSFORM: {
        try {
          const template = JSON.parse(blockDefinition.logic);
          outputs = applyJsonTemplate(template, inputs);
        } catch (error: any) {
          throw new Error(
            `JSON transform error: ${error instanceof Error ? error.message : String(error)}`
          );
        }
        break;
      }
      case LogicType.TEMPLATE: {
        outputs = { result: applyStringTemplate(blockDefinition.logic, inputs) };
        break;
      }
      case LogicType.CONDITION: {
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
        outputs = { result: condition(inputs) };
        break;
      }
      default:
        throw new Error(`Unsupported logic type: ${blockDefinition.logicType}`);
    }

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

    return { success: true, outputs: validatedOutputs, logs };
  } catch (error: any) {
    return {
      success: false,
      outputs: {},
      error: error instanceof Error ? error.message : String(error),
      logs: [],
    };
  }
}

function applyJsonTemplate(template: any, data: Record<string, any>): any {
  if (typeof template === "string" && template.startsWith("{{") && template.endsWith("}}")) {
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

function applyStringTemplate(template: string, data: Record<string, any>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
    const value = getNestedValue(data, path.trim());
    return value !== undefined ? String(value) : "";
  });
}

function getNestedValue(obj: Record<string, any>, path: string): any {
  const parts = path.split(".");
  let current: any = obj;
  for (const part of parts) {
    if (current === undefined || current === null) {
      return undefined;
    }
    current = current[part];
  }
  return current;
}
