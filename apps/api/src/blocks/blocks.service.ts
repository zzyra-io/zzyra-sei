import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import {
  CustomBlockDefinition,
  DataType,
  LogicType,
  NodeCategory,
  BlockType as ZyraBlockType,
  BlockMetadata,
  BLOCK_CATALOG,
} from "@zyra/types";

export interface BlockType {
  id: string;
  name: string;
  description: string;
  category: string;
  icon?: string;
  defaultConfig?: Record<string, unknown>;
}

export interface CreateCustomBlockRequest {
  name: string;
  description?: string;
  category: NodeCategory;
  code: string;
  logicType: LogicType;
  inputs?: Array<{
    name: string;
    description: string;
    type: DataType;
    required: boolean;
    defaultValue?: unknown;
  }>;
  outputs?: Array<{
    name: string;
    description: string;
    type: DataType;
    required: boolean;
  }>;
  isPublic?: boolean;
  tags?: string[];
}

@Injectable()
export class BlocksService {
  constructor(private readonly prisma: PrismaService) {}

  async getBlockTypes(): Promise<BlockMetadata[]> {
    try {
      // Get all block types from the zyra types catalog
      const blockTypes: BlockMetadata[] = Object.values(ZyraBlockType).map(
        (blockTypeKey) => {
          const metadata = BLOCK_CATALOG[blockTypeKey];

          if (metadata) {
            return {
              type: blockTypeKey,
              label: metadata.label,
              description: metadata.description,
              category: metadata.category,
              icon: metadata.icon,
              defaultConfig: metadata.defaultConfig,
            };
          }

          // Fallback for block types not in catalog
          return {
            type: blockTypeKey,
            label: this.formatBlockTypeName(blockTypeKey),
            description: `${this.formatBlockTypeName(blockTypeKey)} block`,
            category: this.inferCategoryFromName(blockTypeKey) as NodeCategory,
            icon: "help-circle",
            defaultConfig: {},
          };
        }
      );

      return blockTypes.sort((a, b) => a.label.localeCompare(b.label));
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
    try {
      const where: any = {};

      if (isPublic === "true") {
        where.isPublic = true;
      } else {
        where.OR = [{ userId: userId }, { isPublic: true }];
      }

      if (category) {
        where.category = category;
      }

      const blocks = await this.prisma.client.customBlock.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });

      return {
        blocks: blocks.map(this.mapDatabaseToCustomBlockDefinition),
      };
    } catch (error) {
      console.error("Error fetching custom blocks:", error);
      throw new Error("Failed to fetch custom blocks");
    }
  }

  async getCustomBlock(
    id: string,
    userId: string
  ): Promise<{ block: CustomBlockDefinition | null }> {
    try {
      const block = await this.prisma.client.customBlock.findFirst({
        where: {
          id,
          OR: [{ userId: userId }, { isPublic: true }],
        },
      });

      if (!block) {
        return { block: null };
      }

      return {
        block: this.mapDatabaseToCustomBlockDefinition(block),
      };
    } catch (error) {
      console.error("Error fetching custom block:", error);
      throw new Error("Failed to fetch custom block");
    }
  }

  async createCustomBlock(
    userId: string,
    data: CreateCustomBlockRequest
  ): Promise<{ block: CustomBlockDefinition }> {
    try {
      const blockData = {
        inputs: data.inputs || [],
        outputs: data.outputs || [],
        configFields: [],
      };

      const customBlock = await this.prisma.client.customBlock.create({
        data: {
          userId,
          name: data.name,
          description: data.description || "",
          category: data.category,
          code: data.code,
          logic: data.code,
          logicType: data.logicType,
          blockData: JSON.stringify(blockData),
          tags: JSON.stringify(data.tags || []),
          isPublic: data.isPublic || false,
        },
      });

      return {
        block: this.mapDatabaseToCustomBlockDefinition(customBlock),
      };
    } catch (error) {
      console.error("Error creating custom block:", error);
      throw new Error("Failed to create custom block");
    }
  }

  async updateCustomBlock(
    id: string,
    userId: string,
    data: Partial<CreateCustomBlockRequest>
  ): Promise<{ block: CustomBlockDefinition }> {
    try {
      const existingBlock = await this.prisma.client.customBlock.findFirst({
        where: { id, userId },
      });

      if (!existingBlock) {
        throw new Error("Custom block not found or access denied");
      }

      const updateData: any = {
        updatedAt: new Date(),
      };

      if (data.name) updateData.name = data.name;
      if (data.description !== undefined)
        updateData.description = data.description;
      if (data.category) updateData.category = data.category;
      if (data.code) {
        updateData.code = data.code;
        updateData.logic = data.code;
      }
      if (data.logicType) updateData.logicType = data.logicType;
      if (data.isPublic !== undefined) updateData.isPublic = data.isPublic;
      if (data.tags) updateData.tags = JSON.stringify(data.tags);

      if (data.inputs || data.outputs) {
        const blockData = {
          inputs: data.inputs || [],
          outputs: data.outputs || [],
          configFields: [],
        };
        updateData.blockData = JSON.stringify(blockData);
      }

      const updatedBlock = await this.prisma.client.customBlock.update({
        where: { id },
        data: updateData,
      });

      return {
        block: this.mapDatabaseToCustomBlockDefinition(updatedBlock),
      };
    } catch (error) {
      console.error("Error updating custom block:", error);
      throw new Error("Failed to update custom block");
    }
  }

  async deleteCustomBlock(
    id: string,
    userId: string
  ): Promise<{ success: boolean }> {
    try {
      const deleteResult = await this.prisma.client.customBlock.deleteMany({
        where: { id, userId },
      });

      if (deleteResult.count === 0) {
        throw new Error("Custom block not found or not owned by user");
      }

      return { success: true };
    } catch (error) {
      console.error("Error deleting custom block:", error);
      throw new Error("Failed to delete custom block");
    }
  }

  private mapDatabaseToCustomBlockDefinition(
    dbBlock: any
  ): CustomBlockDefinition {
    let blockData: any = {};
    let tags: string[] = [];

    try {
      blockData =
        typeof dbBlock.blockData === "string"
          ? JSON.parse(dbBlock.blockData)
          : dbBlock.blockData || {};
    } catch {
      blockData = {};
    }

    try {
      tags =
        typeof dbBlock.tags === "string"
          ? JSON.parse(dbBlock.tags)
          : Array.isArray(dbBlock.tags)
            ? dbBlock.tags
            : [];
    } catch {
      tags = [];
    }

    return {
      id: dbBlock.id,
      name: dbBlock.name,
      description: dbBlock.description || "",
      category: dbBlock.category as NodeCategory,
      inputs: (blockData.inputs || []).map((input: any) => ({
        name: input.name,
        type: input.type,
        description: input.description || "",
        required: input.required || false,
        defaultValue: input.defaultValue,
      })),
      outputs: (blockData.outputs || []).map((output: any) => ({
        name: output.name,
        type: output.type,
        description: output.description || "",
        required: output.required || false,
      })),
      code: dbBlock.code,
      logicType: dbBlock.logicType as LogicType,
      isPublic: dbBlock.isPublic || false,
      createdAt: dbBlock.createdAt?.toISOString(),
      updatedAt: dbBlock.updatedAt?.toISOString(),
      createdBy: dbBlock.userId,
      tags,
    };
  }

  private formatBlockTypeName(blockType: string): string {
    return blockType
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  }

  private inferCategoryFromName(blockType: string): string {
    const lowerType = blockType.toLowerCase();

    if (
      lowerType.includes("schedule") ||
      lowerType.includes("webhook") ||
      lowerType.includes("monitor")
    ) {
      return NodeCategory.TRIGGER;
    }

    if (
      lowerType.includes("condition") ||
      lowerType.includes("delay") ||
      lowerType.includes("loop") ||
      lowerType.includes("transform")
    ) {
      return NodeCategory.LOGIC;
    }

    // Default to action
    return NodeCategory.ACTION;
  }
}
