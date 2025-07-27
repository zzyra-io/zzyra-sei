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
  enhancedBlockSchemas,
  getEnhancedBlockSchema,
  hasEnhancedSchema,
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
        .filter((blockType) => blockType !== ZyraBlockType.CUSTOM)
        .map((blockTypeKey) => {
          const metadata = BLOCK_CATALOG[blockTypeKey];
          // Try to get enhanced schema
          const enhancedSchema = getEnhancedBlockSchema(
            blockTypeKey as ZyraBlockType
          );
          return {
            type: blockTypeKey,
            label: metadata?.label || this.formatBlockTypeName(blockTypeKey),
            description:
              metadata?.description ||
              `${this.formatBlockTypeName(blockTypeKey)} block`,
            category:
              metadata?.category ||
              (this.inferCategoryFromName(blockTypeKey) as NodeCategory),
            icon: metadata?.icon || "help-circle",
            defaultConfig: metadata?.defaultConfig || {},
            configSchema: enhancedSchema
              ? this.zodSchemaToJsonSchema(enhancedSchema.configSchema)
              : undefined,
            inputSchema: enhancedSchema
              ? this.zodSchemaToJsonSchema(enhancedSchema.inputSchema)
              : undefined,
            outputSchema: enhancedSchema
              ? this.zodSchemaToJsonSchema(enhancedSchema.outputSchema)
              : undefined,
            validation: enhancedSchema
              ? { hasEnhancedSchema: true }
              : { hasEnhancedSchema: false },
            compatibility: enhancedSchema
              ? {
                  input: Object.keys(enhancedSchema.inputSchema.shape),
                  output: Object.keys(enhancedSchema.outputSchema.shape),
                }
              : undefined,
            // Remove tags property to fix linter error
            // tags: enhancedSchema?.metadata?.tags || metadata?.tags || [],
          };
        });

      // Get custom blocks based on context
      let customBlocksQuery: any = {};
      if (type && type.toString().toUpperCase() === "CUSTOM") {
        if (userId) {
          customBlocksQuery = {
            OR: [{ userId: userId }, { isPublic: true }],
          };
        } else {
          customBlocksQuery = { isPublic: true };
        }
      } else {
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
      const customBlockTypes: BlockMetadata[] = customBlocks.map((block) => {
        let inputs: any[] = [];
        let outputs: any[] = [];
        let configSchema = {};
        let inputSchema = {};
        let outputSchema = {};
        try {
          const blockData =
            typeof block.blockData === "string"
              ? JSON.parse(block.blockData)
              : block.blockData || {};
          inputs = blockData.inputs || [];
          outputs = blockData.outputs || [];
          configSchema = blockData.configSchema || {};
          inputSchema = blockData.inputSchema || {};
          outputSchema = blockData.outputSchema || {};
        } catch {
          inputs = [];
          outputs = [];
        }
        const defaultConfig: Record<string, any> = { customBlockId: block.id };
        inputs.forEach((input) => {
          if (input.defaultValue !== undefined) {
            defaultConfig[input.name] = input.defaultValue;
          } else {
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
          configSchema,
          inputSchema,
          outputSchema,
          validation: { hasEnhancedSchema: false },
          compatibility: {
            input: inputs.map((i) => i.name),
            output: outputs.map((o) => o.name),
          },
          // Remove tags property to fix linter error
          // tags: [],
          metadata: {
            customBlockId: block.id,
            isOwned: userId ? block.userId === userId : false,
            isPublic: block.isPublic || false,
          },
        };
      });
      const allBlockTypes = [...predefinedBlockTypes, ...customBlockTypes];
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

  async getBlockSchema(
    type?: string,
    schemaType?: "config" | "input" | "output"
  ) {
    try {
      if (!type) {
        // Return all available enhanced schemas
        const allSchemas: Record<string, any> = {};

        Object.keys(enhancedBlockSchemas).forEach((blockType) => {
          const schema = getEnhancedBlockSchema(blockType as ZyraBlockType);
          if (schema) {
            allSchemas[blockType] = {
              config: this.zodSchemaToJsonSchema(schema.configSchema),
              input: this.zodSchemaToJsonSchema(schema.inputSchema),
              output: this.zodSchemaToJsonSchema(schema.outputSchema),
              metadata: schema.metadata,
              hasEnhancedSchema: true,
            };
          }
        });

        return allSchemas;
      }

      // Return schema for specific block type
      const enhancedSchema = getEnhancedBlockSchema(type as ZyraBlockType);

      if (enhancedSchema) {
        const result: any = {
          hasEnhancedSchema: true,
          metadata: enhancedSchema.metadata,
        };

        if (!schemaType || schemaType === "config") {
          result.config = this.zodSchemaToJsonSchema(
            enhancedSchema.configSchema
          );
        }
        if (!schemaType || schemaType === "input") {
          result.input = this.zodSchemaToJsonSchema(enhancedSchema.inputSchema);
        }
        if (!schemaType || schemaType === "output") {
          result.output = this.zodSchemaToJsonSchema(
            enhancedSchema.outputSchema
          );
        }

        return result;
      }

      // Fallback for legacy blocks
      return {
        hasEnhancedSchema: false,
        config: { type: "object", properties: {} },
        input: { type: "object", properties: {} },
        output: { type: "object", properties: {} },
      };
    } catch (error) {
      console.error("Error in block-schema service:", error);
      throw error;
    }
  }

  /**
   * Validate block configuration against enhanced schema
   */
  async validateBlockConfig(blockType: string, config: any) {
    try {
      const enhancedSchema = getEnhancedBlockSchema(blockType as ZyraBlockType);

      if (enhancedSchema) {
        const result = enhancedSchema.configSchema.safeParse(config);
        return {
          valid: result.success,
          data: result.success ? result.data : null,
          errors: result.success ? [] : result.error.issues,
        };
      }

      // Legacy blocks - assume valid
      return {
        valid: true,
        data: config,
        errors: [],
      };
    } catch (error) {
      console.error("Error validating block config:", error);
      return {
        valid: false,
        data: null,
        errors: [{ message: "Validation failed", path: [] }],
      };
    }
  }

  /**
   * Get enhanced block metadata with schema information
   */
  async getEnhancedBlockMetadata(blockType: string) {
    try {
      const enhancedSchema = getEnhancedBlockSchema(blockType as ZyraBlockType);
      const catalogMetadata = BLOCK_CATALOG[blockType as ZyraBlockType];

      if (enhancedSchema && catalogMetadata) {
        return {
          ...catalogMetadata,
          hasEnhancedSchema: true,
          schemas: {
            config: this.zodSchemaToJsonSchema(enhancedSchema.configSchema),
            input: this.zodSchemaToJsonSchema(enhancedSchema.inputSchema),
            output: this.zodSchemaToJsonSchema(enhancedSchema.outputSchema),
          },
          enhanced: enhancedSchema.metadata,
        };
      }

      return catalogMetadata
        ? {
            ...catalogMetadata,
            hasEnhancedSchema: false,
          }
        : null;
    } catch (error) {
      console.error("Error getting enhanced block metadata:", error);
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

  /**
   * Convert Zod schema to JSON Schema for API responses
   * This is a simplified conversion - for production, use @zod-to-json-schema
   */
  private zodSchemaToJsonSchema(zodSchema: any): any {
    try {
      // This is a basic conversion - in production you'd use a proper library
      // For now, return a simplified representation

      // Check if zodSchema is valid
      if (!zodSchema || typeof zodSchema !== "object") {
        return { type: "object", properties: {} };
      }

      const shape = zodSchema._def?.shape;
      if (!shape) {
        return { type: "object", properties: {} };
      }

      const properties: any = {};
      const required: string[] = [];

      Object.keys(shape).forEach((key) => {
        const field = shape[key];

        // Skip if field is not valid
        if (!field || typeof field !== "object") {
          return;
        }

        const fieldDef = field._def;

        // Skip if fieldDef is not available
        if (!fieldDef) {
          return;
        }

        // Extract basic type information
        properties[key] = {
          type: this.getZodTypeString(fieldDef.typeName || "ZodString"),
        };

        // Handle optional vs required
        if (!fieldDef.hasOwnProperty("isOptional") || !fieldDef.isOptional) {
          required.push(key);
        }

        // Add enum values if present
        if (fieldDef.values) {
          properties[key].enum = fieldDef.values;
        }

        // Add default value if present
        if (fieldDef.defaultValue !== undefined) {
          try {
            // Check if defaultValue is a function and call it, otherwise use the value directly
            properties[key].default =
              typeof fieldDef.defaultValue === "function"
                ? fieldDef.defaultValue()
                : fieldDef.defaultValue;
          } catch (error) {
            // Skip default value if there's an error
            console.warn(
              `Failed to get default value for field ${key}:`,
              error
            );
          }
        }
      });

      return {
        type: "object",
        properties,
        required: required.length > 0 ? required : undefined,
      };
    } catch (error) {
      console.warn("Failed to convert Zod schema to JSON schema:", error);
      return { type: "object", properties: {} };
    }
  }

  private getZodTypeString(typeName?: string): string {
    if (!typeName) {
      return "string";
    }

    switch (typeName) {
      case "ZodString":
        return "string";
      case "ZodNumber":
        return "number";
      case "ZodBoolean":
        return "boolean";
      case "ZodArray":
        return "array";
      case "ZodObject":
        return "object";
      case "ZodEnum":
        return "string";
      default:
        return "string";
    }
  }
}
