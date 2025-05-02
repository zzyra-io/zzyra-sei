import { getAIProvider } from "@/lib/ai";
import { LogicType, DataType, type CustomBlockDefinition, type BlockParameter } from "@/types/custom-block";
import { v4 as uuidv4 } from "uuid";
import { NodeCategory } from "@/types/workflow";

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
}`;

    // Use the AI provider to generate the custom block
    const response = await provider.generateCustomBlock(prompt, systemPrompt, userId);
    
    // Ensure required fields exist
    if (!response.id) response.id = `custom-block-${uuidv4()}`;
    if (!response.inputs) response.inputs = [];
    if (!response.outputs) response.outputs = [];
    if (!response.tags) response.tags = [];
    
    // Validate the response
    if (!response.name || !response.description || !response.category || !response.logicType || !response.logic) {
      throw new Error('AI returned incomplete custom block definition');
    }
    
    // Ensure Google Drive monitoring blocks have proper outputs
    if (prompt.toLowerCase().includes('google drive') && prompt.toLowerCase().includes('monitor')) {
      const hasFileMetadata = response.outputs.some((output: BlockParameter) => 
        output.name.includes('file') || output.name.includes('metadata')
      );
      
      if (!hasFileMetadata) {
        response.outputs.push({
          id: `output_${Date.now()}`,
          name: "fileMetadata",
          description: "Metadata of the detected file including name, type, link, and timestamp",
          dataType: DataType.OBJECT,
          required: true
        });
      }
    }
    
    return response as CustomBlockDefinition;
  } catch (error) {
    console.error("Error generating custom block with AI:", error);
    throw error;
  }
}

/**
 * Creates a Google Drive monitoring block with predefined structure
 * @returns A custom block definition for Google Drive monitoring
 */
export function createGoogleDriveMonitorBlock(): Omit<CustomBlockDefinition, 'createdAt' | 'updatedAt'> {
  return {
    id: `custom-block-${uuidv4()}`,
    name: "Monitor Google Drive Folder",
    description: "Monitors a specific Google Drive folder for new files and triggers when files are added",
    category: NodeCategory.TRIGGER,
    isPublic: false,
    inputs: [
      {
        id: `input_${Date.now()}`,
        name: "folderId",
        description: "The ID of the Google Drive folder to monitor",
        dataType: DataType.STRING,
        required: true
      },
      {
        id: `input_${Date.now() + 1}`,
        name: "checkIntervalSeconds",
        description: "How often to check for new files (in seconds)",
        dataType: DataType.NUMBER,
        required: true
      },
      {
        id: `input_${Date.now() + 2}`,
        name: "credentials",
        description: "Google Drive API credentials (JSON)",
        dataType: DataType.OBJECT,
        required: true
      }
    ],
    outputs: [
      {
        id: `output_${Date.now()}`,
        name: "fileName",
        description: "Name of the new file",
        dataType: DataType.STRING,
        required: true
      },
      {
        id: `output_${Date.now() + 1}`,
        name: "fileType",
        description: "MIME type of the new file",
        dataType: DataType.STRING,
        required: true
      },
      {
        id: `output_${Date.now() + 2}`,
        name: "fileLink",
        description: "Direct link to the new file",
        dataType: DataType.STRING,
        required: true
      },
      {
        id: `output_${Date.now() + 3}`,
        name: "createdTime",
        description: "Timestamp when the file was created",
        dataType: DataType.STRING,
        required: true
      },
      {
        id: `output_${Date.now() + 4}`,
        name: "fileMetadata",
        description: "Complete metadata object for the file",
        dataType: DataType.OBJECT,
        required: true
      }
    ],
    logicType: LogicType.JAVASCRIPT,
    logic: `async function process(inputs) {
  const { folderId, checkIntervalSeconds, credentials } = inputs;
  
  if (!folderId) throw new Error('Folder ID is required');
  if (!credentials) throw new Error('Google Drive API credentials are required');
  
  // This is a placeholder for the actual implementation
  // In a real implementation, this would use the Google Drive API to:
  // 1. Authenticate with the provided credentials
  // 2. Query the folder for new files since the last check
  // 3. Return the metadata for any new files
  
  // Mock implementation for demonstration
  console.log(\`Checking Google Drive folder \${folderId} for new files\`);
  
  // In a real implementation, this would be replaced with actual API calls
  // and would track the last check time to only return new files
  
  // Return mock data for demonstration
  return {
    fileName: "example.pdf",
    fileType: "application/pdf",
    fileLink: \`https://drive.google.com/file/d/\${folderId}/view\`,
    createdTime: new Date().toISOString(),
    fileMetadata: {
      id: "1234567890",
      name: "example.pdf",
      mimeType: "application/pdf",
      webViewLink: \`https://drive.google.com/file/d/\${folderId}/view\`,
      createdTime: new Date().toISOString(),
      modifiedTime: new Date().toISOString(),
      size: "1024000"
    }
  };
}`,
    tags: ["google drive", "file monitoring", "trigger", "integration"]
  };
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
7. For external API integrations (like Google Drive, Airtable, etc.), include proper authentication handling and API calls.
8. For monitoring/trigger blocks, implement a polling mechanism in the logic that can be called repeatedly.

SPECIAL CASES:
- For Google Drive monitoring: Use Google Drive API v3 with proper authentication and file listing with 'changes' endpoint
- For blockchain monitoring: Use ethers.js patterns for connecting to providers and listening to events
- For API webhooks: Provide a webhook URL pattern and verification logic

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
