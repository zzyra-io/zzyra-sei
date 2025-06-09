import { Injectable } from "@nestjs/common";

export interface BlockType {
  id: string;
  name: string;
  category: string;
  description: string;
  inputs: Array<{
    name: string;
    type: string;
    required: boolean;
  }>;
  outputs: Array<{
    name: string;
    type: string;
  }>;
}

export interface CustomBlock {
  id: string;
  userId: string;
  name: string;
  description?: string;
  code: string;
  inputs: any[];
  outputs: any[];
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class BlocksService {
  // Mock data for now - in production this would come from database
  private blockTypes: BlockType[] = [
    {
      id: "fetch",
      name: "HTTP Request",
      category: "communication",
      description: "Make HTTP requests to external APIs",
      inputs: [
        { name: "url", type: "string", required: true },
        { name: "method", type: "string", required: true },
        { name: "headers", type: "object", required: false },
        { name: "body", type: "any", required: false },
      ],
      outputs: [
        { name: "response", type: "object" },
        { name: "status", type: "number" },
      ],
    },
    {
      id: "transform",
      name: "Data Transform",
      category: "data",
      description: "Transform data using JavaScript code",
      inputs: [
        { name: "data", type: "any", required: true },
        { name: "code", type: "string", required: true },
      ],
      outputs: [{ name: "result", type: "any" }],
    },
    // Add more block types as needed
  ];

  private customBlocks: CustomBlock[] = [];

  async getBlockTypes(): Promise<BlockType[]> {
    return this.blockTypes;
  }

  async getBlockSchema(blockType: string) {
    const block = this.blockTypes.find((b) => b.id === blockType);
    if (!block) {
      throw new Error(`Block type ${blockType} not found`);
    }

    return {
      type: "object",
      properties: {
        inputs: {
          type: "object",
          properties: block.inputs.reduce((acc, input) => {
            acc[input.name] = {
              type: input.type,
              description: `Input: ${input.name}`,
            };
            return acc;
          }, {} as any),
          required: block.inputs.filter((i) => i.required).map((i) => i.name),
        },
        outputs: {
          type: "object",
          properties: block.outputs.reduce((acc, output) => {
            acc[output.name] = {
              type: output.type,
              description: `Output: ${output.name}`,
            };
            return acc;
          }, {} as any),
        },
      },
    };
  }

  async getCustomBlocks(userId?: string): Promise<CustomBlock[]> {
    if (userId) {
      return this.customBlocks.filter(
        (block) => block.userId === userId || block.isPublic
      );
    }
    return this.customBlocks.filter((block) => block.isPublic);
  }

  async getCustomBlock(
    id: string,
    userId?: string
  ): Promise<CustomBlock | null> {
    const block = this.customBlocks.find((b) => b.id === id);
    if (!block) return null;

    // Check access permissions
    if (!block.isPublic && block.userId !== userId) {
      return null;
    }

    return block;
  }

  async createCustomBlock(
    userId: string,
    data: {
      name: string;
      description?: string;
      code: string;
      inputs: any[];
      outputs: any[];
      isPublic?: boolean;
    }
  ): Promise<CustomBlock> {
    const customBlock: CustomBlock = {
      id: `custom_${Date.now()}`,
      userId,
      name: data.name,
      description: data.description,
      code: data.code,
      inputs: data.inputs || [],
      outputs: data.outputs || [],
      isPublic: data.isPublic || false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.customBlocks.push(customBlock);
    return customBlock;
  }

  async updateCustomBlock(
    id: string,
    userId: string,
    data: {
      name?: string;
      description?: string;
      code?: string;
      inputs?: any[];
      outputs?: any[];
      isPublic?: boolean;
    }
  ): Promise<CustomBlock | null> {
    const blockIndex = this.customBlocks.findIndex(
      (b) => b.id === id && b.userId === userId
    );
    if (blockIndex === -1) return null;

    const block = this.customBlocks[blockIndex];
    this.customBlocks[blockIndex] = {
      ...block,
      ...data,
      updatedAt: new Date().toISOString(),
    };

    return this.customBlocks[blockIndex];
  }

  async deleteCustomBlock(id: string, userId: string): Promise<boolean> {
    const blockIndex = this.customBlocks.findIndex(
      (b) => b.id === id && b.userId === userId
    );
    if (blockIndex === -1) return false;

    this.customBlocks.splice(blockIndex, 1);
    return true;
  }
}
