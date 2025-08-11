"use client";

import {
  BlockParameter,
  CustomBlockDefinition,
  DataType,
  LogicType,
  NodeCategory,
} from "@zzyra/types";

// Helper function to generate logic from inputs and outputs
const generateLogicFromInputsOutputs = (
  inputs: Array<{ name: string; type: string; description?: string }>,
  outputs: Array<{ name: string; type: string; description?: string }>
) => {
  const logicStatements = inputs
    .map((input, index) => {
      // Map to the right output if exists, otherwise use the first output
      const output =
        index < outputs.length
          ? outputs[index]
          : outputs.length > 0
            ? outputs[0]
            : { name: "result", type: "string" };

      // Generate different logic based on input type
      if (input.type === "string") {
        return `// Process ${input.name} string input
outputs.${output.name} = "Processed: " + inputs.${input.name};`;
      } else if (input.type === "number") {
        return `// Calculate based on ${input.name} numeric input
outputs.${output.name} = inputs.${input.name} * 2; // Double the value`;
      } else if (input.type === "boolean") {
        return `// Handle ${input.name} boolean condition
outputs.${output.name} = inputs.${input.name} ? "True condition" : "False condition";`;
      } else if (input.type === "object" || input.type === "json") {
        return `// Transform ${input.name} object
// Add a new property to the object
const transformed = { ...inputs.${input.name}, processed: true };
outputs.${output.name} = transformed;`;
      } else if (input.type === "array") {
        return `// Process ${input.name} array
// Map over array elements
outputs.${output.name} = inputs.${input.name}.map(item => 
  typeof item === "string" ? item.toUpperCase() : item
);`;
      } else {
        return `// Default processing for ${input.name}
outputs.${output.name} = JSON.stringify(inputs.${input.name});`;
      }
    })
    .join("\n\n");

  // Add some logging and input validation
  const fullLogic = `// Generated JavaScript logic
// Input validation
if (!inputs) {
  console.error("No inputs provided");
  return { error: "No inputs provided" };
}

${logicStatements}

// Log execution for debugging
console.log("Block executed with inputs:", inputs);
console.log("Generated outputs:", outputs);`;

  return fullLogic;
};

// Parse input string into structured inputs
export const parseInputsFromString = (inputStr: string) => {
  if (!inputStr || inputStr.trim() === "") {
    return [{ name: "input1", type: "string", description: "Default input" }];
  }

  const inputLines = inputStr.split(/[,\n]/).filter((line) => line.trim());

  return inputLines.map((line, index) => {
    const parts = line.includes(":") ? line.split(":") : [line, ""];
    const name = parts[0].trim() || `input${index + 1}`;
    const description = parts[1]?.trim() || name;

    // Try to infer the type based on name
    let type = "string";
    if (
      name.toLowerCase().includes("count") ||
      name.toLowerCase().includes("number") ||
      name.toLowerCase().includes("amount") ||
      name.toLowerCase().includes("price") ||
      name.toLowerCase().includes("total")
    ) {
      type = "number";
    } else if (
      name.toLowerCase().includes("enabled") ||
      name.toLowerCase().includes("active") ||
      name.toLowerCase().includes("status") ||
      name.toLowerCase().includes("flag")
    ) {
      type = "boolean";
    } else if (
      name.toLowerCase().includes("data") ||
      name.toLowerCase().includes("config") ||
      name.toLowerCase().includes("settings") ||
      name.toLowerCase().includes("options")
    ) {
      type = "object";
    } else if (
      name.toLowerCase().includes("list") ||
      name.toLowerCase().includes("array") ||
      name.toLowerCase().includes("items") ||
      name.toLowerCase().includes("collection")
    ) {
      type = "array";
    }

    return { name, type, description };
  });
};

// Parse output string into structured outputs
export const parseOutputsFromString = (outputStr: string) => {
  if (!outputStr || outputStr.trim() === "") {
    return [
      { name: "result", type: "string", description: "Operation result" },
    ];
  }

  const outputLines = outputStr.split(/[,\n]/).filter((line) => line.trim());

  return outputLines.map((line, index) => {
    const parts = line.includes(":") ? line.split(":") : [line, ""];
    const name = parts[0].trim() || `output${index + 1}`;
    const description = parts[1]?.trim() || name;

    // Try to infer the type based on name
    let type = "string";
    if (
      name.toLowerCase().includes("count") ||
      name.toLowerCase().includes("number") ||
      name.toLowerCase().includes("amount") ||
      name.toLowerCase().includes("price") ||
      name.toLowerCase().includes("total")
    ) {
      type = "number";
    } else if (
      name.toLowerCase().includes("enabled") ||
      name.toLowerCase().includes("active") ||
      name.toLowerCase().includes("status") ||
      name.toLowerCase().includes("flag")
    ) {
      type = "boolean";
    } else if (
      name.toLowerCase().includes("data") ||
      name.toLowerCase().includes("config") ||
      name.toLowerCase().includes("settings") ||
      name.toLowerCase().includes("options")
    ) {
      type = "object";
    } else if (
      name.toLowerCase().includes("list") ||
      name.toLowerCase().includes("array") ||
      name.toLowerCase().includes("items") ||
      name.toLowerCase().includes("collection")
    ) {
      type = "array";
    }

    return { name, type, description };
  });
};

// Main function to generate AI Block
export const generateAiBlock = (aiBlockForm: {
  blockName: string;
  blockDescription: string;
  blockInputs: string;
  blockOutputs: string;
  blockCategory: string;
}): CustomBlockDefinition => {
  // Parse inputs and outputs
  const parsedInputs = parseInputsFromString(aiBlockForm.blockInputs);
  const parsedOutputs = parseOutputsFromString(aiBlockForm.blockOutputs);

  // Convert to BlockParameter format with proper types
  const mapTypeToDataType = (type: string): DataType => {
    if (type === "string") return DataType.STRING;
    if (type === "number") return DataType.NUMBER;
    if (type === "boolean") return DataType.BOOLEAN;
    if (type === "object" || type === "json") return DataType.OBJECT;
    if (type === "array") return DataType.ARRAY;
    return DataType.STRING; // Default type
  };

  const inputs: BlockParameter[] = parsedInputs.map((input, index) => ({
    id: `input_${index}`,
    name: input.name,
    dataType: mapTypeToDataType(input.type),
    type: input.type,
    description: input.description,
    required: true,
  }));

  const outputs: BlockParameter[] = parsedOutputs.map((output, index) => ({
    id: `output_${index}`,
    name: output.name,
    dataType: mapTypeToDataType(output.type),
    type: output.type,
    description: output.description,
    required: false,
  }));

  // Generate logic based on inputs and outputs
  const logic = generateLogicFromInputsOutputs(parsedInputs, parsedOutputs);

  // Create mock AI-generated block
  return {
    id: `custom-${Date.now()}`,
    name: aiBlockForm.blockName,
    description: aiBlockForm.blockDescription,
    category: (aiBlockForm.blockCategory || "ACTION") as NodeCategory,
    inputs,
    outputs,
    configFields: [],
    logic,
    logicType: LogicType.JAVASCRIPT,
    isPublic: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

/**
 * Validates the AI block form and returns detailed validation result
 */
export const validateAiBlockForm = (aiBlockForm: {
  blockName: string;
  blockDescription: string;
  blockInputs: string;
  blockOutputs: string;
  blockCategory: string;
}): { valid: boolean; error?: string } => {
  // Check for required fields
  if (!aiBlockForm.blockName.trim()) {
    return { valid: false, error: "Block name is required" };
  }

  if (aiBlockForm.blockName.trim().length < 3) {
    return { valid: false, error: "Block name must be at least 3 characters" };
  }

  if (aiBlockForm.blockName.trim().length > 50) {
    return { valid: false, error: "Block name must not exceed 50 characters" };
  }

  if (!aiBlockForm.blockDescription.trim()) {
    return { valid: false, error: "Block description is required" };
  }

  if (aiBlockForm.blockDescription.trim().length < 10) {
    return {
      valid: false,
      error: "Block description must be at least 10 characters",
    };
  }

  if (aiBlockForm.blockDescription.trim().length > 200) {
    return {
      valid: false,
      error: "Block description must not exceed 200 characters",
    };
  }

  if (!aiBlockForm.blockInputs.trim()) {
    return { valid: false, error: "Block inputs are required" };
  }

  // Validate input format
  try {
    const inputs = parseInputsFromString(aiBlockForm.blockInputs);
    if (inputs.length === 0) {
      return { valid: false, error: "At least one input is required" };
    }

    // Check for name and type
    for (const input of inputs) {
      if (!input.name) {
        return { valid: false, error: "Each input must have a name" };
      }
      if (!input.type) {
        return {
          valid: false,
          error: `Input '${input.name}' must have a type`,
        };
      }
    }
  } catch (error) {
    return {
      valid: false,
      error: `Error parsing inputs: ${error instanceof Error ? error.message : "Invalid format"}`,
    };
  }

  // Validate output format if provided
  if (aiBlockForm.blockOutputs.trim()) {
    try {
      const outputs = parseOutputsFromString(aiBlockForm.blockOutputs);

      // Check for name and type
      for (const output of outputs) {
        if (!output.name) {
          return { valid: false, error: "Each output must have a name" };
        }
        if (!output.type) {
          return {
            valid: false,
            error: `Output '${output.name}' must have a type`,
          };
        }
      }
    } catch (error) {
      return {
        valid: false,
        error: `Error parsing outputs: ${error instanceof Error ? error.message : "Invalid format"}`,
      };
    }
  } else {
    // Recommend but don't require outputs
    console.warn("No outputs specified for block");
  }

  return { valid: true };
};
