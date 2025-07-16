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
  code?: string;
  logic?: string; // Legacy support - will be mapped to code
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

  async getBlockTypes(
    type?: BlockType,
    userId?: string
  ): Promise<BlockMetadata[]> {
    try {
      // Get all predefined block types from the zyra types catalog
      const predefinedBlockTypes: BlockMetadata[] = Object.values(ZyraBlockType)
        .filter((blockType) => blockType !== ZyraBlockType.CUSTOM) // Exclude generic CUSTOM
        .map((blockTypeKey) => {
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
        });

      // Get custom blocks based on context
      let customBlocksQuery: any = {};

      if (type && type.toString().toUpperCase() === "CUSTOM") {
        // For /blocks/types?type=CUSTOM - show user's blocks + public blocks
        if (userId) {
          customBlocksQuery = {
            OR: [
              { userId: userId }, // User's own blocks
              { isPublic: true }, // Public blocks
            ],
          };
        } else {
          // No user context - only public blocks
          customBlocksQuery = { isPublic: true };
        }
      } else {
        // For general /blocks/types - only public blocks in main catalog
        customBlocksQuery = { isPublic: true };
      }

      const customBlocks = await this.prisma.client.customBlock.findMany({
        where: customBlocksQuery,
        select: {
          id: true,
          name: true,
          description: true,
          category: true,
          userId: true,
          isPublic: true,
          blockData: true,
        },
      });

      // Convert custom blocks to BlockMetadata format
      const customBlockTypes: BlockMetadata[] = customBlocks.map((block) => {
        // Parse blockData to get inputs for default config
        let inputs: any[] = [];
        try {
          const blockData =
            typeof block.blockData === "string"
              ? JSON.parse(block.blockData)
              : block.blockData || {};
          inputs = blockData.inputs || [];
        } catch {
          inputs = [];
        }

        // Generate default config from inputs
        const defaultConfig: Record<string, any> = {
          customBlockId: block.id,
        };

        // Add default values from inputs
        inputs.forEach((input) => {
          if (input.defaultValue !== undefined) {
            defaultConfig[input.name] = input.defaultValue;
          } else {
            // Set sensible defaults based on type
            switch (input.type) {
              case "string":
                defaultConfig[input.name] = "";
                break;
              case "number":
                defaultConfig[input.name] = 0;
                break;
              case "boolean":
                defaultConfig[input.name] = false;
                break;
              case "array":
                defaultConfig[input.name] = [];
                break;
              case "object":
                defaultConfig[input.name] = {};
                break;
              default:
                defaultConfig[input.name] = null;
            }
          }
        });

        return {
          type: ZyraBlockType.CUSTOM,
          label: block.name,
          description: block.description || `${block.name} custom block`,
          category: this.validateCategory(block.category),
          icon: "puzzle",
          defaultConfig,
          // Additional metadata for custom blocks
          metadata: {
            customBlockId: block.id,
            isOwned: userId ? block.userId === userId : false,
            isPublic: block.isPublic || false,
          },
        };
      });

      // Combine all block types
      const allBlockTypes = [...predefinedBlockTypes, ...customBlockTypes];

      // Apply filtering
      if (type) {
        const upperType = String(type).toUpperCase();

        if (upperType === "CUSTOM") {
          return customBlockTypes;
        }

        return allBlockTypes.filter((block) => block.type === upperType);
      }

      return allBlockTypes;
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
        blocks: blocks.map((block) =>
          this.mapDatabaseToCustomBlockDefinition(block)
        ),
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
      console.log("Creating custom block:", data);

      // Handle both 'code' and 'logic' fields - prefer 'code' if provided, fallback to 'logic'
      const codeContent = data.code || data.logic;

      if (!codeContent) {
        throw new Error("Either 'code' or 'logic' field is required");
      }

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
          code: codeContent,
          logic: codeContent,
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

      // Handle both 'code' and 'logic' fields - prefer 'code' if provided, fallback to 'logic'
      const codeContent = data.code || data.logic;
      if (codeContent) {
        updateData.code = codeContent;
        updateData.logic = codeContent;
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
      // Handle both JSON string and direct array for tags
      if (typeof dbBlock.tags === "string") {
        tags = JSON.parse(dbBlock.tags);
      } else if (Array.isArray(dbBlock.tags)) {
        tags = dbBlock.tags;
      } else {
        tags = [];
      }
    } catch {
      tags = [];
    }

    // Validate and convert category
    const validCategory = this.validateCategory(dbBlock.category);

    // Validate and convert logicType
    const validLogicType = this.validateLogicType(dbBlock.logicType);

    return {
      id: dbBlock.id,
      name: dbBlock.name,
      description: dbBlock.description || "",
      category: validCategory,
      inputs: (blockData.inputs || []).map((input: any) => ({
        name: input.name,
        type: this.validateDataType(input.type || input.dataType), // Convert to DataType enum
        description: input.description || "",
        required: input.required || false,
        defaultValue: input.defaultValue,
      })),
      outputs: (blockData.outputs || []).map((output: any) => ({
        name: output.name,
        type: this.validateDataType(output.type || output.dataType), // Convert to DataType enum
        description: output.description || "",
        required: output.required || false,
      })),
      code: dbBlock.code,
      logicType: validLogicType,
      isPublic: dbBlock.isPublic || false,
      createdAt: dbBlock.createdAt?.toISOString(),
      updatedAt: dbBlock.updatedAt?.toISOString(),
      createdBy: dbBlock.userId,
      tags,
    };
  }

  private validateCategory(category: string): NodeCategory {
    const validCategories = Object.values(NodeCategory);
    if (validCategories.includes(category as NodeCategory)) {
      return category as NodeCategory;
    }
    console.warn(`Invalid category "${category}", defaulting to ACTION`);
    return NodeCategory.ACTION;
  }

  private validateLogicType(logicType: string): LogicType {
    const validLogicTypes = Object.values(LogicType);
    if (validLogicTypes.includes(logicType as LogicType)) {
      return logicType as LogicType;
    }
    console.warn(`Invalid logicType "${logicType}", defaulting to JAVASCRIPT`);
    return LogicType.JAVASCRIPT;
  }

  private validateDataType(dataType: string): DataType {
    const validDataTypes = Object.values(DataType);
    if (validDataTypes.includes(dataType as DataType)) {
      return dataType as DataType;
    }
    console.warn(`Invalid dataType "${dataType}", defaulting to STRING`);
    return DataType.STRING;
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
