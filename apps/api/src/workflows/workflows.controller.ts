import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Query,
  HttpStatus,
  UseGuards,
  Request,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from "@nestjs/swagger";
import {
  CreateWorkflowDto,
  UpdateWorkflowDto,
  WorkflowDto,
  PaginatedWorkflowsResponseDto,
  ToggleFavoriteDto,
} from "./dto/workflow.dto";
import {
  ExecuteWorkflowDto,
  ExecuteWorkflowResponseDto,
} from "./dto/execute-workflow.dto";
import { WorkflowsService } from "./workflows.service";
import { Public } from "../auth/decorators/public.decorator";

@ApiTags("workflows")
@Controller("workflows")
@ApiBearerAuth()
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Get()
  @ApiOperation({ summary: "Get all workflows" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: "Returns paginated workflows",
    type: PaginatedWorkflowsResponseDto,
  })
  async findAll(
    @Request() req: { user: { id: string } },
    @Query("page") page = 1,
    @Query("limit") limit = 10
  ): Promise<PaginatedWorkflowsResponseDto> {
    return this.workflowsService.findAll(req.user.id, page, limit);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a workflow by ID" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Return a workflow",
    type: WorkflowDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Workflow not found",
  })
  async findOne(
    @Request() req: { user: { id: string } },
    @Param("id") id: string
  ): Promise<WorkflowDto> {
    return this.workflowsService.findOne(id, req.user.id);
  }

  @Post()
  @ApiOperation({ summary: "Create a new workflow" })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Workflow created successfully",
    type: WorkflowDto,
  })
  async create(
    @Request() req: { user: { id: string } },
    @Body() createWorkflowDto: CreateWorkflowDto
  ): Promise<WorkflowDto> {
    return this.workflowsService.create(createWorkflowDto, req.user.id);
  }

  @Put(":id")
  @ApiOperation({ summary: "Update a workflow" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Workflow updated successfully",
    type: WorkflowDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Workflow not found",
  })
  async update(
    @Request() req: { user: { id: string } },
    @Param("id") id: string,
    @Body() updateWorkflowDto: UpdateWorkflowDto
  ): Promise<WorkflowDto> {
    return this.workflowsService.update(id, updateWorkflowDto, req.user.id);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a workflow" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Workflow deleted successfully",
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Workflow not found",
  })
  async remove(
    @Request() req: { user: { id: string } },
    @Param("id") id: string
  ): Promise<void> {
    return this.workflowsService.remove(id, req.user.id);
  }

  @Post(":id/execute")
  @ApiOperation({ summary: "Execute a workflow" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Workflow execution started",
    type: ExecuteWorkflowResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Workflow not found",
  })
  async execute(
    @Request() req: { user: { id: string } },
    @Param("id") id: string,
    @Body() executeDto: ExecuteWorkflowDto = {}
  ): Promise<ExecuteWorkflowResponseDto> {
    const scheduledTime = executeDto.scheduledTime
      ? new Date(executeDto.scheduledTime)
      : undefined;

    const result = await this.workflowsService.execute(
      id,
      req.user.id,
      scheduledTime,
      executeDto.input
    );

    return {
      executionId: result.executionId,
      status: scheduledTime ? "scheduled" : "immediate",
      scheduledTime: scheduledTime?.toISOString(),
    };
  }

  @Post("toggle-favorite")
  @ApiOperation({ summary: "Toggle workflow favorite status" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Favorite status toggled successfully",
  })
  async toggleFavorite(
    @Request() req: { user: { id: string } },
    @Body() toggleFavoriteDto: ToggleFavoriteDto
  ): Promise<{ isFavorite: boolean }> {
    return this.workflowsService.toggleFavorite(toggleFavoriteDto, req.user.id);
  }
}
