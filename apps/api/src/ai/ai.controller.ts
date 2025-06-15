import { Controller, Post, Body } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { AiService } from "./ai.service";
import {
  GenerateWorkflowDto,
  RefineWorkflowDto,
  WorkflowResponseDto,
} from "./dto/workflow-generation.dto";

@ApiTags("ai")
@Controller("ai")
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post("generate-block")
  @ApiOperation({ summary: "Generate block using AI" })
  @ApiResponse({
    status: 200,
    description: "Block generated successfully",
  })
  async generateBlock(@Body() data: { prompt: string }) {
    return this.aiService.generateBlock(data.prompt);
  }

  @Post("generate-workflow")
  @ApiOperation({ summary: "Generate workflow using AI" })
  @ApiResponse({
    status: 200,
    description: "Workflow generated successfully",
    type: WorkflowResponseDto,
  })
  async generateWorkflow(
    @Body() data: GenerateWorkflowDto
  ): Promise<WorkflowResponseDto> {
    const result = await this.aiService.generateWorkflow(
      data.description,
      data.options || { detailedMode: true, prefillConfig: true },
      data.existingNodes || [],
      data.existingEdges || []
    );

    return {
      nodes: result.nodes,
      edges: result.edges,
    };
  }

  @Post("refine-workflow")
  @ApiOperation({ summary: "Refine existing workflow using AI" })
  @ApiResponse({
    status: 200,
    description: "Workflow refined successfully",
    type: WorkflowResponseDto,
  })
  async refineWorkflow(
    @Body() data: RefineWorkflowDto
  ): Promise<WorkflowResponseDto> {
    const result = await this.aiService.refineWorkflow(
      data.prompt,
      data.options || {},
      data.nodes,
      data.edges
    );

    return {
      nodes: result.nodes,
      edges: result.edges,
    };
  }
}
