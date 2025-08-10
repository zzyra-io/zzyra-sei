// Import shared types from @zzyra/types
import {
  NodeCategory,
  DataType,
  LogicType as SharedLogicType,
  BlockParameter as SharedBlockParameter,
  CustomBlockDefinition as SharedCustomBlockDefinition,
  CustomBlockData as SharedCustomBlockData,
  CustomBlockExecutionResult as SharedExecutionResult,
  createParameter as sharedCreateParameter,
  createCustomBlockDefinition as sharedCreateCustomBlockDefinition,
} from '@zzyra/types';

// Re-export the shared types
export { DataType };

// Extend LogicType enum with additional types needed by the worker
export enum LogicType {
  JAVASCRIPT = 'javascript',
  TYPESCRIPT = 'typescript',
  PYTHON = 'python',
  REST_API = 'rest-api',
  // Extended types for worker use
  JSON_TRANSFORM = 'json-transform',
  TEMPLATE = 'template',
  CONDITION = 'condition',
}

// Re-export using aliases to avoid import/export conflicts
export type BlockParameter = SharedBlockParameter;
export type CustomBlockDefinition = SharedCustomBlockDefinition & {
  // Add properties needed by worker but not in shared types
  configFields?: any[];
  // Add backward compatibility for logic type mapping
  logicType: SharedLogicType | LogicType;
};
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
  logicType: SharedLogicType = SharedLogicType.JAVASCRIPT,
  code = '',
): CustomBlockDefinition {
  // Create a base definition using the shared function
  const baseDefinition = sharedCreateCustomBlockDefinition({
    id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    description,
    category,
    inputs,
    outputs,
    code,
    logicType,
    isPublic: false,
  });

  // Add worker-specific properties
  return {
    ...baseDefinition,
    configFields,
  };
}

// Worker-specific implementation of custom block execution
export async function executeCustomBlockLogic(
  blockDefinition: CustomBlockDefinition,
  inputs: Record<string, any>,
): Promise<ExecutionResult> {
  try {
    let outputs: Record<string, any> = {};
    const logs: string[] = [];

    const log = (...args: any[]) => {
      logs.push(
        args
          .map((arg) =>
            typeof arg === 'object' ? JSON.stringify(arg) : String(arg),
          )
          .join(' '),
      );
    };

    // Convert logicType to string for switch case comparison
    const logicTypeStr = blockDefinition.logicType.toString();

    switch (logicTypeStr) {
      case SharedLogicType.JAVASCRIPT: {
        const asyncFunction = new Function(
          'inputs',
          'log',
          'outputs',
          `
          try {
            ${blockDefinition.code}
            return outputs;
          } catch (error) {
            throw new Error("Execution error: " + error.message);
          }
          `,
        );
        outputs = (await asyncFunction(inputs, log, {})) || {};
        break;
      }
      case 'json-transform': {
        try {
          const template = JSON.parse(blockDefinition.code);
          outputs = applyJsonTemplate(template, inputs);
        } catch (error: any) {
          throw new Error(
            `JSON transform error: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
        break;
      }
      case 'template': {
        outputs = { result: applyStringTemplate(blockDefinition.code, inputs) };
        break;
      }
      case 'condition': {
        const condition = new Function(
          'inputs',
          `
          try {
            return Boolean(${blockDefinition.code});
          } catch (error) {
            throw new Error("Condition error: " + error.message);
          }
          `,
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
  if (
    typeof template === 'string' &&
    template.startsWith('{{') &&
    template.endsWith('}}')
  ) {
    const path = template.slice(2, -2).trim();
    return getNestedValue(data, path);
  } else if (Array.isArray(template)) {
    return template.map((item) => applyJsonTemplate(item, data));
  } else if (typeof template === 'object' && template !== null) {
    const result: Record<string, any> = {};
    for (const key in template) {
      result[key] = applyJsonTemplate(template[key], data);
    }
    return result;
  }
  return template;
}

function applyStringTemplate(
  template: string,
  data: Record<string, any>,
): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
    const value = getNestedValue(data, path.trim());
    return value !== undefined ? String(value) : '';
  });
}

function getNestedValue(obj: Record<string, any>, path: string): any {
  const parts = path.split('.');
  let current: any = obj;
  for (const part of parts) {
    if (current === undefined || current === null) {
      return undefined;
    }
    current = current[part];
  }
  return current;
}
