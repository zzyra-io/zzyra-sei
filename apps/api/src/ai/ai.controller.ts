import { Controller, Post, Body } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { EnhancedAiService } from "./enhanced-ai.service";
import {
  GenerateWorkflowDto,
  RefineWorkflowDto,
  WorkflowResponseDto,
} from "./dto/workflow-generation.dto";

@ApiTags("ai")
@Controller("ai")
export class AiController {
  constructor(private readonly aiService: EnhancedAiService) {}

  @Post("generate-block")
  @ApiOperation({ summary: "Generate block using AI" })
  @ApiResponse({
    status: 200,
    description: "Block generated successfully",
  })
  async generateBlock(@Body() data: { prompt: string }) {
    // TODO: Replace with real user/session/metadata extraction
    const userId = "anonymous";
    const sessionId = "session_dummy";
    const metadata = undefined;
    return this.aiService.generateBlock(
      data.prompt,
      userId,
      sessionId,
      metadata
    );
  }

  @Post("/generate-workflow")
  @ApiOperation({ summary: "Generate workflow using AI" })
  @ApiResponse({
    status: 200,
    description: "Workflow generated successfully",
    type: WorkflowResponseDto,
  })
  async generateWorkflow(
    @Body() data: GenerateWorkflowDto
  ): Promise<WorkflowResponseDto> {
    // TODO: Replace with real user/session/metadata extraction
    const userId = "anonymous";
    const sessionId = "session_dummy";
    const metadata = undefined;
    const result = await this.aiService.generateWorkflow(
      data.description,
      userId,
      sessionId,
      data.options || { detailedMode: true, prefillConfig: true },
      data.existingNodes || [],
      data.existingEdges || [],
      metadata
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
    // TODO: Replace with real user/session/metadata extraction
    const userId = "anonymous";
    const sessionId = "session_dummy";
    const metadata = undefined;
    const result = await this.aiService.refineWorkflow(
      data.prompt,
      userId,
      sessionId,
      data.options || {},
      data.nodes,
      data.edges,
      metadata
    );

    return {
      nodes: result.nodes,
      edges: result.edges,
    };
  }
}
