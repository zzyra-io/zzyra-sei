import type { CustomBlockDefinition } from "@zyra/types";
import { DataType, LogicType, NodeCategory } from "@zyra/types";
import api from "./api";

interface CreateCustomBlockRequest {
  name: string;
  description: string;
  category: NodeCategory;
  configFields: Array<{
    name: string;
    label: string;
    type: string;
    options?: string[];
    required: boolean;
  }>;
  inputs: Array<{
    name: string;
    description: string;
    type: DataType;
    required: boolean;
    defaultValue?: unknown;
  }>;
  outputs: Array<{
    name: string;
    description: string;
    type: DataType;
    required: boolean;
  }>;
  logicType: LogicType;
  code: string;
  isPublic?: boolean;
  tags?: string[];
}

class CustomBlockService {
  async getCustomBlocks(): Promise<CustomBlockDefinition[]> {
    try {
      const response = await api.get("/blocks/custom");
      return response.data.blocks || [];
    } catch (error) {
      console.error("Error fetching custom blocks:", error);
      return this.getExampleBlocks();
    }
  }

  async getCustomBlockById(id: string): Promise<CustomBlockDefinition | null> {
    try {
      const response = await api.get(`/blocks/custom/${id}`);
      return response.data.block || null;
    } catch (error) {
      console.error(`Error fetching custom block with id ${id}:`, error);
      return null;
    }
  }

  async createCustomBlock(
    block: CreateCustomBlockRequest
  ): Promise<CustomBlockDefinition> {
    try {
      const response = await api.post("/blocks/custom", block);
      return response.data.block;
    } catch (error) {
      console.error("Error creating custom block:", error);
      // Return a local version as fallback
      const now = new Date().toISOString();
      return {
        ...block,
        id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: now,
        updatedAt: now,
        inputs: block.inputs,
        outputs: block.outputs,
      };
    }
  }

  async updateCustomBlock(
    id: string,
    block: Partial<CreateCustomBlockRequest>
  ): Promise<CustomBlockDefinition | null> {
    try {
      const response = await api.put(`/blocks/custom/${id}`, block);
      return response.data.block || null;
    } catch (error) {
      console.error(`Error updating custom block with id ${id}:`, error);
      return null;
    }
  }

  async deleteCustomBlock(id: string): Promise<boolean> {
    try {
      await api.delete(`/blocks/custom/${id}`);
      return true;
    } catch (error) {
      console.error(`Error deleting custom block with id ${id}:`, error);
      return false;
    }
  }

  // Example blocks for testing and demonstration
  getExampleBlocks(): CustomBlockDefinition[] {
    const now = new Date().toISOString();
    return [
      {
        id: "custom_example_1",
        name: "Data Formatter",
        description: "Format data into a specific structure",
        category: NodeCategory.LOGIC,
        inputs: [
          {
            name: "data",
            description: "The data to format",
            type: DataType.OBJECT,
            required: true,
          },
          {
            name: "format",
            description: "The format to apply",
            type: DataType.STRING,
            required: false,
            defaultValue: "json",
          },
        ],
        outputs: [
          {
            name: "formattedData",
            description: "The formatted data",
            type: DataType.STRING,
            required: true,
          },
        ],
        logicType: LogicType.JAVASCRIPT,
        code: `function process(inputs) {
  const { data, format } = inputs;
  
  if (format === 'json') {
    return { formattedData: JSON.stringify(data, null, 2) };
  } else if (format === 'csv') {
    // Simple CSV conversion for demonstration
    const headers = Object.keys(data[0] || {}).join(',');
    const rows = data.map(row => Object.values(row).join(',')).join('\\n');
    return { formattedData: headers + '\\n' + rows };
  }
  
  return { formattedData: String(data) };
}`,
        isPublic: true,
        createdAt: now,
        updatedAt: now,
        tags: ["formatter", "data", "utility"],
      },
      {
        id: "custom_example_2",
        name: "Conditional Router",
        description: "Route data based on conditions",
        category: NodeCategory.LOGIC,
        inputs: [
          {
            name: "value",
            description: "The value to evaluate",
            type: DataType.ANY,
            required: true,
          },
          {
            name: "condition",
            description: "The condition to check",
            type: DataType.STRING,
            required: true,
            defaultValue: "value > 10",
          },
        ],
        outputs: [
          {
            name: "result",
            description: "The result of the condition",
            type: DataType.BOOLEAN,
            required: true,
          },
          {
            name: "route",
            description: "The route to take (true/false)",
            type: DataType.STRING,
            required: true,
          },
        ],
        logicType: LogicType.CONDITION,
        code: `value > 10`,
        isPublic: true,
        createdAt: now,
        updatedAt: now,
        tags: ["condition", "router", "logic"],
      },
      {
        id: "custom_example_3",
        name: "Email Template",
        description: "Generate an email from a template",
        category: NodeCategory.ACTION,
        inputs: [
          {
            name: "name",
            description: "Recipient name",
            type: DataType.STRING,
            required: true,
          },
          {
            name: "company",
            description: "Company name",
            type: DataType.STRING,
            required: false,
          },
          {
            name: "product",
            description: "Product name",
            type: DataType.STRING,
            required: true,
          },
        ],
        outputs: [
          {
            name: "subject",
            description: "Email subject",
            type: DataType.STRING,
            required: true,
          },
          {
            name: "body",
            description: "Email body",
            type: DataType.STRING,
            required: true,
          },
        ],
        logicType: LogicType.TEMPLATE,
        code: `Subject: Information about {{product}}

Dear {{name}},

Thank you for your interest in {{product}}{{#if company}} from {{company}}{{/if}}.

We would like to provide you with more information about our product and how it can benefit you.

Best regards,
The Sales Team`,
        isPublic: true,
        createdAt: now,
        updatedAt: now,
        tags: ["email", "template", "communication"],
      },
    ];
  }
}

export const customBlockService = new CustomBlockService();
