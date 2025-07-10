import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  TemplateQueryDto,
  TemplateResponseDto,
} from "./dto/template.dto";
import { Prisma } from "@zyra/database";

@Injectable()
export class TemplateService {
  constructor(private readonly prisma: PrismaService) {}

  async listTemplates(query: TemplateQueryDto): Promise<TemplateResponseDto[]> {
    const { category, search, page = 1, limit = 20 } = query;
    const where: Prisma.WorkflowTemplateWhereInput = {};
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }
    const templates = await this.prisma.client.workflowTemplate.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });
    return templates.map(this.toResponseDto);
  }

  async getTemplate(id: string): Promise<TemplateResponseDto> {
    const template = await this.prisma.client.workflowTemplate.findUnique({
      where: { id },
    });
    if (!template) throw new NotFoundException("Template not found");
    return this.toResponseDto(template);
  }

  async createTemplate(
    data: CreateTemplateDto,
    user: any
  ): Promise<TemplateResponseDto> {
    // Optionally associate with user/creator
    const template = await this.prisma.client.workflowTemplate.create({
      data: {
        name: data.name,
        description: data.description,
        category: data.category,
        nodes: data.nodes,
        edges: data.edges,
        // tags, is_premium: add to schema if needed
      },
    });
    return this.toResponseDto(template);
  }

  async updateTemplate(
    id: string,
    data: UpdateTemplateDto,
    user: any
  ): Promise<TemplateResponseDto> {
    const template = await this.prisma.client.workflowTemplate.findUnique({
      where: { id },
    });
    if (!template) throw new NotFoundException("Template not found");
    // Optionally check user/creator permissions here
    const updated = await this.prisma.client.workflowTemplate.update({
      where: { id },
      data: {
        ...data,
      },
    });
    return this.toResponseDto(updated);
  }

  async deleteTemplate(id: string, user: any): Promise<{ success: boolean }> {
    const template = await this.prisma.client.workflowTemplate.findUnique({
      where: { id },
    });
    if (!template) throw new NotFoundException("Template not found");
    // Optionally check user/creator permissions here
    await this.prisma.client.workflowTemplate.delete({ where: { id } });
    return { success: true };
  }

  private toResponseDto(template: any): TemplateResponseDto {
    return {
      id: template.id,
      name: template.name,
      description: template.description || "",
      category: template.category || "",
      nodes: Array.isArray(template.nodes) ? template.nodes : [],
      edges: Array.isArray(template.edges) ? template.edges : [],
      tags: [], // Add tags if schema supports
      is_premium: false, // Add if schema supports
      created_at: template.createdAt?.toISOString() || "",
      updated_at: template.updatedAt?.toISOString() || "",
    };
  }
}
