import { LogicType, type CustomBlockDefinition } from "@/types/custom-block";
import { NodeCategory } from "@/types/workflow";

/**
 * Maps a database custom block record to the format expected by the UI
 */
export function mapDatabaseRecordToBlockDefinition(
  record: any
): CustomBlockDefinition {
  // Handle case where block_data contains all the structured data we need
  if (record.block_data) {
    const blockData = record.block_data;

    return {
      id: record.id,
      name: record.name,
      description: record.description || "",
      category: mapCategory(record.category),
      inputs: blockData.inputs || [],
      outputs: blockData.outputs || [],
      configFields: blockData.configFields || [],
      logicType: mapLogicType(record.block_type) || LogicType.JAVASCRIPT,
      logic: record.logic || "",
      code: record.code || "",
      isPublic: record.is_public || false,
      createdAt: record.created_at || new Date().toISOString(),
      updatedAt: record.updated_at || new Date().toISOString(),
      createdBy: record.user_id,
      version: record.version || "1.0.0",
      tags: Array.isArray(record.tags) ? record.tags : [],
    };
  }

  // Fallback for records that don't have block_data
  return {
    id: record.id,
    name: record.name,
    description: record.description || "",
    category: mapCategory(record.category),
    inputs: [],
    outputs: [],
    configFields: [],
    logicType: mapLogicType(record.block_type) || LogicType.JAVASCRIPT,
    logic: record.logic || "",
    isPublic: record.is_public || false,
    createdAt: record.created_at || new Date().toISOString(),
    updatedAt: record.updated_at || new Date().toISOString(),
    createdBy: record.user_id,
    version: record.version || "1.0.0",
    tags: Array.isArray(record.tags) ? record.tags : [],
  };
}

/**
 * Maps a block definition to a database record format
 */
export function mapBlockDefinitionToDatabaseRecord(
  block: CustomBlockDefinition
): any {
  return {
    id: block.id,
    name: block.name,
    description: block.description,
    category: block.category,
    block_type: block.logicType,
    block_data: {
      name: block.name,
      description: block.description,
      category: block.category,
      inputs: block.inputs,
      outputs: block.outputs,
      configFields: block.configFields,
      code: block.logic,
    },
    is_public: block.isPublic,
    code: block.logic,
    logic: block.logic,
    tags: block.tags || [],
    version: block.version || "1.0.0",
    created_at: block.createdAt,
    updated_at: block.updatedAt,
  };
}

/**
 * Maps a category string to a NodeCategory enum value
 */
function mapCategory(category: string): NodeCategory {
  if (!category) return NodeCategory.CUSTOM;

  // Try to match the category with NodeCategory enum
  const upperCategory = category.toUpperCase();

  for (const key in NodeCategory) {
    if (key === upperCategory) {
      return NodeCategory[key as keyof typeof NodeCategory];
    }
  }

  // Map common categories
  switch (category.toLowerCase()) {
    case "logic":
      return NodeCategory.LOGIC;
    case "action":
      return NodeCategory.ACTION;
    case "trigger":
      return NodeCategory.TRIGGER;
    case "finance":
      return NodeCategory.FINANCE;
    case "ai":
      return NodeCategory.AI;
    case "data":
      return NodeCategory.DATA;
    default:
      return NodeCategory.CUSTOM;
  }
}

/**
 * Maps a block type string to a LogicType enum value
 */
function mapLogicType(blockType: string): LogicType {
  if (!blockType) return LogicType.JAVASCRIPT;

  // Try to match the block type with LogicType enum
  const lowerBlockType = blockType.toLowerCase();

  switch (lowerBlockType) {
    case "javascript":
      return LogicType.JAVASCRIPT;
    case "json_transform":
      return LogicType.JSON_TRANSFORM;
    case "template":
      return LogicType.TEMPLATE;
    case "condition":
      return LogicType.CONDITION;
    default:
      return LogicType.JAVASCRIPT;
  }
}
