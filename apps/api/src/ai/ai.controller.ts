import { Controller, Post, Body, UseGuards, Request } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { EnhancedAiService } from "./enhanced-ai.service";
import { FeedbackService } from "./services/feedback.service";
import {
  GenerateWorkflowDto,
  RefineWorkflowDto,
  WorkflowResponseDto,
} from "./dto/workflow-generation.dto";

@ApiTags("ai")
@Controller("ai")
export class AiController {
  constructor(
    private readonly aiService: EnhancedAiService,
    private readonly feedbackService: FeedbackService
  ) {}

  @Post("generate-block")
  @ApiOperation({ summary: "Generate block using AI" })
  @ApiResponse({
    status: 200,
    description: "Block generated successfully",
  })
  async generateBlock(
    @Request() req: { user: { id: string } },
    @Body() data: { prompt: string }
  ) {
    const userId = req.user.id;
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
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
    @Request() req: { user: { id: string } },
    @Body() data: GenerateWorkflowDto
  ): Promise<WorkflowResponseDto> {
    const userId = req.user.id;
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
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
    @Request() req: { user: { id: string } },
    @Body() data: RefineWorkflowDto
  ): Promise<WorkflowResponseDto> {
    const userId = req.user.id;
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
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

  @Post("feedback")
  @ApiOperation({ summary: "Submit AI feedback" })
  @ApiResponse({
    status: 200,
    description: "Feedback submitted successfully",
  })
  async submitFeedback(
    @Request() req: { user: { id: string } },
    @Body()
    data: {
      sessionId: string;
      feedbackType:
        | "workflow_generation"
        | "block_generation"
        | "validation"
        | "general";
      rating: number;
      feedback: string;
      metadata: {
        generationPrompt?: string;
        generatedOutput?: unknown;
        executionResult?: "success" | "failure" | "partial";
        processingTime?: number;
        validationErrors?: number;
        context?: Record<string, unknown>;
      };
    }
  ) {
    const userId = req.user.id;

    const feedbackId = await this.feedbackService.recordFeedback(
      userId,
      data.sessionId,
      data.feedbackType,
      data.rating,
      data.feedback,
      data.metadata
    );

    return {
      success: true,
      feedbackId,
      message: "Feedback submitted successfully",
    };
  }
}
