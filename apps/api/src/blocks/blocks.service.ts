import { Injectable } from "@nestjs/common";

export interface BlockType {
  id: string;
  name: string;
  description: string;
  category: string;
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
  private customBlocks: CustomBlock[] = [];

  async getBlockTypes(): Promise<BlockType[]> {
    try {
      // For now, return a simple mock response
      // This will be replaced with actual shared types later
      return [
        {
          id: "HTTP_REQUEST",
          name: "HTTP Request",
          description: "Make HTTP requests to external APIs",
          category: "action",
        },
        {
          id: "EMAIL",
          name: "Email",
          description: "Send email notifications",
          category: "action",
        },
      ];
    } catch (error) {
      console.error("Error in block-types service:", error);
      throw new Error("Internal server error");
    }
  }

  async getBlockSchema(type?: string) {
    try {
      // For now, return a simple mock response
      if (!type) {
        return {
          HTTP_REQUEST: { type: "object", properties: {} },
          EMAIL: { type: "object", properties: {} },
        };
      }

      // Return schema for specific block type
      return { type: "object", properties: {} };
    } catch (error) {
      console.error("Error in block-schema service:", error);
      throw error;
    }
  }

  async getCustomBlocks(userId: string, isPublic?: string, category?: string) {
    let filteredBlocks = this.customBlocks;

    if (isPublic === "true") {
      filteredBlocks = filteredBlocks.filter((block) => block.isPublic);
    } else {
      filteredBlocks = filteredBlocks.filter(
        (block) => block.userId === userId || block.isPublic
      );
    }

    return filteredBlocks.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getCustomBlock(
    id: string,
    userId: string
  ): Promise<CustomBlock | null> {
    const block = this.customBlocks.find((b) => b.id === id);
    if (!block) return null;

    if (!block.isPublic && block.userId !== userId) {
      return null;
    }

    return block;
  }

  async createCustomBlock(userId: string, data: any): Promise<CustomBlock> {
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

  async deleteCustomBlock(
    id: string,
    userId: string
  ): Promise<{ success: boolean }> {
    const blockIndex = this.customBlocks.findIndex(
      (b) => b.id === id && b.userId === userId
    );

    if (blockIndex === -1) {
      throw new Error("Custom block not found or not owned by user");
    }

    this.customBlocks.splice(blockIndex, 1);
    return { success: true };
  }
}
