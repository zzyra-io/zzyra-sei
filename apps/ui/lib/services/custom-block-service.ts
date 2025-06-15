import type { Database } from "@/types/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CustomBlockDefinition } from "@zyra/types";
import { DataType, LogicType, NodeCategory } from "@zyra/types";

class CustomBlockService {
  private supabase: SupabaseClient<Database> = createClient();

  async getCustomBlocks(): Promise<CustomBlockDefinition[]> {
    try {
      const {
        data: { user },
        error: authError,
      } = await this.supabase.auth.getUser();
      if (authError || !user) throw new Error("Not authenticated");
      // Only public blocks or those created by user
      const { data, error } = await this.supabase
        .from("custom_blocks")
        .select("*")
        .or(`created_by.eq.${user.id},is_public.eq.true`);

      if (error) {
        throw error;
      }

      return data as CustomBlockDefinition[];
    } catch (error) {
      console.error("Error fetching custom blocks:", error);
      return this.getExampleBlocks();
    }
  }

  async getCustomBlockById(id: string): Promise<CustomBlockDefinition | null> {
    try {
      const {
        data: { user },
        error: authError,
      } = await this.supabase.auth.getUser();
      if (authError || !user) throw new Error("Not authenticated");
      const { data, error } = await this.supabase
        .from("custom_blocks")
        .select("*")
        .eq("id", id)
        .eq("created_by", user.id)
        .single();

      if (error) {
        throw error;
      }

      return data as CustomBlockDefinition;
    } catch (error) {
      console.error(`Error fetching custom block with id ${id}:`, error);
      return null;
    }
  }

  async createCustomBlock(
    block: Omit<CustomBlockDefinition, "id" | "createdAt" | "updatedAt">
  ): Promise<CustomBlockDefinition> {
    const now = new Date().toISOString();
    const newBlock: CustomBlockDefinition = {
      ...block,
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
      updatedAt: now,
    };

    try {
      const {
        data: { user },
        error: authError,
      } = await this.supabase.auth.getUser();
      if (authError || !user) throw new Error("Not authenticated");
      const { data, error } = await this.supabase
        .from("custom_blocks")
        .insert({ ...newBlock, created_by: user.id })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data as CustomBlockDefinition;
    } catch (error) {
      console.error("Error creating custom block:", error);
      return newBlock; // Return the local version as fallback
    }
  }

  async updateCustomBlock(
    id: string,
    block: Partial<CustomBlockDefinition>
  ): Promise<CustomBlockDefinition | null> {
    const updates = {
      ...block,
      updatedAt: new Date().toISOString(),
    };

    try {
      const {
        data: { user },
        error: authError,
      } = await this.supabase.auth.getUser();
      if (authError || !user) throw new Error("Not authenticated");
      const { data, error } = await this.supabase
        .from("custom_blocks")
        .update(updates)
        .eq("id", id)
        .eq("created_by", user.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data as CustomBlockDefinition;
    } catch (error) {
      console.error(`Error updating custom block with id ${id}:`, error);
      return null;
    }
  }

  async deleteCustomBlock(id: string): Promise<boolean> {
    try {
      const {
        data: { user },
        error: authError,
      } = await this.supabase.auth.getUser();
      if (authError || !user) throw new Error("Not authenticated");
      const { error } = await this.supabase
        .from("custom_blocks")
        .delete()
        .eq("id", id)
        .eq("created_by", user.id);

      if (error) {
        throw error;
      }

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
        configFields: [
          {
            name: "format",
            label: "Format",
            type: "select",
            options: ["json", "csv", "xml"],
            required: true,
          },
        ],
        inputs: [
          {
            id: "input_1",
            name: "data",
            description: "The data to format",
            dataType: DataType.OBJECT,
            required: true,
          },
          {
            id: "input_2",
            name: "format",
            description: "The format to apply",
            dataType: DataType.STRING,
            required: false,
            defaultValue: "json",
          },
        ],
        outputs: [
          {
            id: "output_1",
            name: "formattedData",
            description: "The formatted data",
            dataType: DataType.STRING,
            required: true,
          },
        ],
        logicType: LogicType.JAVASCRIPT,
        logic: `function process(inputs) {
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
        configFields: [
          {
            name: "condition",
            label: "Condition",
            type: "string",
            required: true,
          },
        ],
        inputs: [
          {
            id: "input_1",
            name: "value",
            description: "The value to evaluate",
            dataType: DataType.ANY,
            required: true,
          },
          {
            id: "input_2",
            name: "condition",
            description: "The condition to check",
            dataType: DataType.STRING,
            required: true,
            defaultValue: "value > 10",
          },
        ],
        outputs: [
          {
            id: "output_1",
            name: "result",
            description: "The result of the condition",
            dataType: DataType.BOOLEAN,
            required: true,
          },
          {
            id: "output_2",
            name: "route",
            description: "The route to take (true/false)",
            dataType: DataType.STRING,
            required: true,
          },
        ],
        logicType: LogicType.CONDITION,
        logic: `value > 10`,
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
        configFields: [
          {
            name: "subject",
            label: "Subject",
            type: "string",
            required: true,
          },
          {
            name: "body",
            label: "Body",
            type: "string",
            required: true,
          },
        ],
        inputs: [
          {
            id: "input_1",
            name: "name",
            description: "Recipient name",
            dataType: DataType.STRING,
            required: true,
          },
          {
            id: "input_2",
            name: "company",
            description: "Company name",
            dataType: DataType.STRING,
            required: false,
          },
          {
            id: "input_3",
            name: "product",
            description: "Product name",
            dataType: DataType.STRING,
            required: true,
          },
        ],
        outputs: [
          {
            id: "output_1",
            name: "subject",
            description: "Email subject",
            dataType: DataType.STRING,
            required: true,
          },
          {
            id: "output_2",
            name: "body",
            description: "Email body",
            dataType: DataType.STRING,
            required: true,
          },
        ],
        logicType: LogicType.TEMPLATE,
        logic: `Subject: Information about {{product}}

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
