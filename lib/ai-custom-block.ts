import { getAIProvider } from "@/lib/ai";
import { LogicType, DataType, NodeCategory, type CustomBlockDefinition, type BlockParameter } from "@/types/custom-block";

/**
 * Generate a custom block using AI
 * @param prompt User prompt describing the block functionality
 * @param userId User ID for tracking
 * @param existingInputs Optional existing inputs to use as context
 * @param existingOutputs Optional existing outputs to use as context
 */
export async function generateCustomBlockWithAI(
  prompt: string,
  userId: string,
  existingInputs?: BlockParameter[],
  existingOutputs?: BlockParameter[]
): Promise<Partial<CustomBlockDefinition>> {
  try {
    const provider = getAIProvider();
    
    // Create a system prompt that explains how to generate a custom block
    const systemPrompt = `You are an expert JavaScript developer specializing in workflow automation.
Your task is to generate code for a custom block based on the user's description.

INSTRUCTIONS:
1. Analyze the user's request and identify the key functionality needed.
2. Generate a JavaScript function named 'process' that takes an 'inputs' object parameter.
3. The function should return an object with output properties.
4. Make the code robust with proper error handling.
5. Use modern JavaScript (ES6+) but avoid external dependencies.

${existingInputs && existingInputs.length > 0 
  ? `EXISTING INPUTS (use these in your code):\n${existingInputs.map(input => 
      `- ${input.name} (${input.dataType}): ${input.description || 'No description'}`).join('\n')}`
  : ''}

${existingOutputs && existingOutputs.length > 0
  ? `EXPECTED OUTPUTS (your code must return these):\n${existingOutputs.map(output => 
      `- ${output.name} (${output.dataType}): ${output.description || 'No description'}`).join('\n')}`
  : ''}

RESPONSE FORMAT:
Return a JSON object with the following properties:
- logic: The JavaScript function code (as a string)
- logicType: "javascript" (or another supported type if appropriate)
- suggestedInputs: Array of input parameters if none were provided
- suggestedOutputs: Array of output parameters if none were provided

Example response:
{
  "logic": "function process(inputs) {\\n  const { text } = inputs;\\n  return { reversed: text.split('').reverse().join('') };\\n}",
  "logicType": "javascript",
  "suggestedInputs": [
    {
      "name": "text",
      "description": "Text to reverse",
      "dataType": "string",
      "required": true
    }
  ],
  "suggestedOutputs": [
    {
      "name": "reversed",
      "description": "Reversed text",
      "dataType": "string"
    }
  ]
}`;

    // Use the AI provider to generate the custom block
    const response = await provider.generateCustomBlock(prompt, systemPrompt, userId);
    
    return response;
  } catch (error) {
    console.error("Error generating custom block with AI:", error);
    throw error;
  }
}

/**
 * Generate a complete custom block definition using AI
 * @param prompt User prompt describing the block functionality
 * @param userId User ID for tracking
 */
export async function generateCompleteCustomBlockWithAI(
  prompt: string,
  userId: string
): Promise<CustomBlockDefinition> {
  try {
    const provider = getAIProvider();
    
    // Create a system prompt that explains how to generate a complete custom block definition
    const systemPrompt = `You are an expert workflow automation developer.
Your task is to generate a complete custom block definition based on the user's description.

INSTRUCTIONS:
1. Analyze the user's request and identify the key functionality needed.
2. Generate a complete custom block definition including name, description, category, inputs, outputs, and logic.
3. The logic should be a JavaScript function named 'process' that takes an 'inputs' object parameter.
4. The function should return an object with output properties.
5. Make the code robust with proper error handling.
6. Use modern JavaScript (ES6+) but avoid external dependencies.

RESPONSE FORMAT:
Return a JSON object with the following properties:
- name: A short, descriptive name for the block
- description: A detailed description of what the block does
- category: One of "trigger", "action", "logic", or "finance"
- inputs: Array of input parameters
- outputs: Array of output parameters
- logicType: "javascript" (or another supported type if appropriate)
- logic: The JavaScript function code (as a string)

Example response:
{
  "name": "Text Reverser",
  "description": "Reverses the input text",
  "category": "logic",
  "inputs": [
    {
      "id": "input_1",
      "name": "text",
      "description": "Text to reverse",
      "dataType": "string",
      "required": true
    }
  ],
  "outputs": [
    {
      "id": "output_1",
      "name": "reversed",
      "description": "Reversed text",
      "dataType": "string"
    }
  ],
  "logicType": "javascript",
  "logic": "function process(inputs) {\\n  const { text } = inputs;\\n  return { reversed: text.split('').reverse().join('') };\\n}"
}`;

    // Use the AI provider to generate the complete custom block definition
    const partialDefinition = await provider.generateCustomBlock(prompt, systemPrompt, userId);
    
    // Create a complete custom block definition
    const now = new Date().toISOString();
    const customBlock: CustomBlockDefinition = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: partialDefinition.name || `Custom Block ${Date.now()}`,
      description: partialDefinition.description || prompt,
      category: partialDefinition.category as NodeCategory || NodeCategory.LOGIC,
      inputs: partialDefinition.inputs || [],
      outputs: partialDefinition.outputs || [],
      logicType: partialDefinition.logicType as LogicType || LogicType.JAVASCRIPT,
      logic: partialDefinition.logic || "function process(inputs) {\n  // Your code here\n  return {};\n}",
      isPublic: false,
      createdAt: now,
      updatedAt: now,
      tags: ["ai-generated"],
    };
    
    return customBlock;
  } catch (error) {
    console.error("Error generating complete custom block with AI:", error);
    throw new Error("Failed to generate custom block with AI");
  }
}
