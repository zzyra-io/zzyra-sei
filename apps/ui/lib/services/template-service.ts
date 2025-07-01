import api from "./api";
import { workflowsApi } from "./api";

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  nodes: any[];
  edges: any[];
  tags: string[];
  is_premium: boolean;
  created_at: string;
  updated_at: string;
}

export class TemplateService {
  async getTemplates(category?: string): Promise<WorkflowTemplate[]> {
    try {
      const params: Record<string, string> = {};
      if (category) params.category = category;
      const response = await api.get("/templates", { params });
      return response.data;
    } catch (error) {
      console.error("Error fetching templates:", error);
      return [];
    }
  }

  async getTemplate(id: string): Promise<WorkflowTemplate | null> {
    try {
      const response = await api.get(`/templates/${id}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching template:", error);
      return null;
    }
  }

  async createWorkflowFromTemplate(templateId: string, name?: string) {
    // Fetch the template and create a workflow using workflowsApi
    const template = await this.getTemplate(templateId);
    if (!template) throw new Error("Template not found");
    const workflowInput = {
      name: name || `${template.name} - Copy`,
      description: template.description,
      nodes: template.nodes,
      edges: template.edges,
    };
    return workflowsApi.createWorkflow(workflowInput);
  }

  async getCategories(): Promise<string[]> {
    try {
      const response = await api.get("/templates");
      const templates: WorkflowTemplate[] = response.data;
      // Extract unique categories
      const categories = Array.from(
        new Set(templates.map((t) => t.category).filter(Boolean))
      );
      return categories;
    } catch (error) {
      console.error("Error fetching template categories:", error);
      return [];
    }
  }
}

export const templateService = new TemplateService();
