import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  HttpStatus,
  HttpException,
  Request,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ExecutionsService } from "./executions.service";
import { NodeExecutionsService } from "./node-executions.service";
import { NodeLogsService } from "./node-logs.service";
import {
  ExecutionActionDto,
  WorkflowExecutionDto,
  NodeExecutionDto,
  NodeLogDto,
} from "./dto/execution.dto";

@ApiTags("executions")
@Controller("executions")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ExecutionsController {
  constructor(
    private readonly executionsService: ExecutionsService,
    private readonly nodeExecutionsService: NodeExecutionsService,
    private readonly nodeLogsService: NodeLogsService
  ) {}

  @Get()
  @ApiOperation({ summary: "Get workflow executions" })
  @ApiQuery({
    name: "workflowId",
    required: true,
    description: "ID of the workflow",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    description: "Number of records to return",
  })
  @ApiQuery({
    name: "offset",
    required: false,
    description: "Number of records to skip",
  })
  @ApiQuery({
    name: "status",
    required: false,
    description: "Filter by status",
  })
  @ApiQuery({
    name: "sortKey",
    required: false,
    description: "Field to sort by",
  })
  @ApiQuery({
    name: "sortOrder",
    required: false,
    description: "Sort order (asc or desc)",
  })
  @ApiResponse({
    status: 200,
    description: "Returns workflow executions",
    type: [WorkflowExecutionDto],
  })
  async getWorkflowExecutions(
    @Request() req: { user: { id: string } },
    @Query("workflowId") workflowId: string,
    @Query("limit") limit = 10,
    @Query("offset") offset = 0,
    @Query("status") status = "all",
    @Query("sortKey") sortKey = "started_at",
    @Query("sortOrder") sortOrder = "desc"
  ): Promise<{ executions: any[]; total: number }> {
    try {
      // Get executions for the authenticated user
      const executions = await this.executionsService.findAll(
        req.user.id,
        +limit
      );

      // Filter by workflowId if provided
      const filteredExecutions = workflowId
        ? executions.filter((exec) => exec.workflowId === workflowId)
        : executions;

      return {
        executions: filteredExecutions,
        total: filteredExecutions.length,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new HttpException(
        `Failed to get workflow executions: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get("stats")
  @ApiOperation({ summary: "Get execution statistics" })
  @ApiQuery({
    name: "workflowId",
    required: false,
    description: "Filter by workflow ID",
  })
  @ApiResponse({
    status: 200,
    description: "Returns execution statistics",
  })
  async getStats(
    @Request() req: { user?: { id: string } },
    @Query("workflowId") workflowId?: string
  ): Promise<any> {
    try {
      const userId = req.user?.id;
      return await this.executionsService.getStats(userId, workflowId);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new HttpException(
        `Failed to get execution stats: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get("trends")
  @ApiOperation({ summary: "Get execution trends" })
  @ApiQuery({
    name: "days",
    required: false,
    description: "Number of days to get trends for",
  })
  @ApiQuery({
    name: "workflowId",
    required: false,
    description: "Filter by workflow ID",
  })
  @ApiResponse({
    status: 200,
    description: "Returns execution trends",
  })
  async getTrends(
    @Request() req: { user?: { id: string } },
    @Query("days") days = 7,
    @Query("workflowId") workflowId?: string
  ): Promise<any> {
    try {
      const userId = req.user?.id;
      return await this.executionsService.getTrends(userId, +days, workflowId);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new HttpException(
        `Failed to get execution trends: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get("heatmap")
  @ApiOperation({ summary: "Get execution heatmap" })
  @ApiQuery({
    name: "workflowId",
    required: false,
    description: "Filter by workflow ID",
  })
  @ApiResponse({
    status: 200,
    description: "Returns execution heatmap",
  })
  async getHeatmap(
    @Request() req: { user?: { id: string } },
    @Query("workflowId") workflowId?: string
  ): Promise<any> {
    try {
      const userId = req.user?.id;
      return await this.executionsService.getHeatmap(userId, workflowId);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new HttpException(
        `Failed to get execution heatmap: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get("nodes")
  @ApiOperation({ summary: "Get node executions for a workflow execution" })
  @ApiQuery({
    name: "executionId",
    required: true,
    description: "ID of the workflow execution",
  })
  @ApiResponse({
    status: 200,
    description: "Returns node executions",
    type: [NodeExecutionDto],
  })
  async getNodeExecutions(
    @Query("executionId") executionId: string
  ): Promise<{ nodes: any[] }> {
    try {
      const nodes =
        await this.nodeExecutionsService.findByExecutionId(executionId);
      return { nodes };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new HttpException(
        `Failed to get node executions: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get("node-logs")
  @ApiOperation({ summary: "Get logs for a node execution" })
  @ApiQuery({
    name: "nodeExecutionId",
    required: true,
    description: "ID of the node execution",
  })
  @ApiResponse({
    status: 200,
    description: "Returns node logs",
    type: [NodeLogDto],
  })
  async getNodeLogs(
    @Query("nodeExecutionId") nodeExecutionId: string
  ): Promise<{ logs: any[] }> {
    try {
      const logs =
        await this.nodeLogsService.findByNodeExecutionId(nodeExecutionId);
      return { logs };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new HttpException(
        `Failed to get node logs: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get("node-logs-by-node")
  @ApiOperation({ summary: "Get logs for a node by executionId and nodeId" })
  @ApiQuery({
    name: "executionId",
    required: true,
    description: "ID of the workflow execution",
  })
  @ApiQuery({
    name: "nodeId",
    required: true,
    description: "ID of the node",
  })
  @ApiResponse({
    status: 200,
    description: "Returns node logs",
    type: [NodeLogDto],
  })
  async getNodeLogsByNode(
    @Query("executionId") executionId: string,
    @Query("nodeId") nodeId: string
  ): Promise<{ logs: any[] }> {
    try {
      const logs = await this.nodeLogsService.findByExecutionAndNode(
        executionId,
        nodeId
      );
      return { logs };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new HttpException(
        `Failed to get node logs: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get(":id")
  @ApiOperation({ summary: "Get execution by ID" })
  @ApiParam({ name: "id", description: "ID of the execution" })
  @ApiResponse({
    status: 200,
    description: "Returns execution details",
    type: WorkflowExecutionDto,
  })
  @ApiResponse({ status: 404, description: "Execution not found" })
  async getExecution(
    @Request() req: { user: { id: string } },
    @Param("id") id: string
  ): Promise<any> {
    try {
      return await this.executionsService.findOne(id, req.user.id);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new HttpException(
        `Failed to get execution: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get(":id/complete")
  @ApiOperation({ summary: "Get complete execution data with logs and nodes" })
  @ApiParam({ name: "id", description: "ID of the execution" })
  @ApiResponse({
    status: 200,
    description: "Returns complete execution data",
  })
  @ApiResponse({ status: 404, description: "Execution not found" })
  async getCompleteExecution(
    @Request() req: { user: { id: string } },
    @Param("id") id: string
  ): Promise<any> {
    try {
      return await this.executionsService.findOneComplete(id, req.user.id);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new HttpException(
        `Failed to get execution: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get("public/:id")
  @ApiOperation({ summary: "Get execution by ID (public)" })
  @ApiParam({ name: "id", description: "ID of the execution" })
  @ApiResponse({
    status: 200,
    description: "Returns execution details",
    type: WorkflowExecutionDto,
  })
  @ApiResponse({ status: 404, description: "Execution not found" })
  async getExecutionPublic(@Param("id") id: string): Promise<any> {
    try {
      // For development, allow public access to execution data
      return await this.executionsService.findOnePublic(id);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new HttpException(
        `Failed to get execution: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post(":id/retry")
  @ApiOperation({ summary: "Retry a workflow execution" })
  @ApiParam({ name: "id", description: "ID of the workflow execution" })
  @ApiResponse({ status: 200, description: "Execution retried successfully" })
  async retryExecution(
    @Request() req: { user: { id: string } },
    @Param("id") id: string,
    @Body() actionDto: ExecutionActionDto
  ): Promise<any> {
    try {
      return await this.executionsService.retry(id, req.user.id);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new HttpException(
        `Failed to retry execution: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post(":id/cancel")
  @ApiOperation({ summary: "Cancel a workflow execution" })
  @ApiParam({ name: "id", description: "ID of the workflow execution" })
  @ApiResponse({ status: 200, description: "Execution cancelled successfully" })
  async cancelExecution(
    @Param("id") id: string,
    @Body() actionDto: ExecutionActionDto
  ): Promise<any> {
    try {
      return await this.executionsService.cancel(id, actionDto.nodeId);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new HttpException(
        `Failed to cancel execution: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post(":id/pause")
  @ApiOperation({ summary: "Pause a workflow execution" })
  @ApiParam({ name: "id", description: "ID of the workflow execution" })
  @ApiResponse({ status: 200, description: "Execution paused successfully" })
  async pauseExecution(
    @Param("id") id: string,
    @Body() actionDto: ExecutionActionDto
  ): Promise<any> {
    try {
      return await this.executionsService.pause(id, actionDto.nodeId);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new HttpException(
        `Failed to pause execution: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post(":id/resume")
  @ApiOperation({ summary: "Resume a workflow execution" })
  @ApiParam({ name: "id", description: "ID of the workflow execution" })
  @ApiResponse({ status: 200, description: "Execution resumed successfully" })
  async resumeExecution(
    @Param("id") id: string,
    @Body() actionDto: ExecutionActionDto
  ): Promise<any> {
    try {
      return await this.executionsService.resume(id, actionDto.nodeId);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new HttpException(
        `Failed to resume execution: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
