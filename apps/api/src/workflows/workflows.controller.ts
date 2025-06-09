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
} from "./dto/workflow.dto";
import { WorkflowsService } from "./workflows.service";

@ApiTags("workflows")
@Controller("workflows")
@ApiBearerAuth()
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Get()
  @ApiOperation({ summary: "Get all workflows" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Return all workflows",
    type: PaginatedWorkflowsResponseDto,
  })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async findAll(
    @Request() req: { user?: { id: string } },
    @Query("page") page = 1,
    @Query("limit") limit = 10
  ): Promise<PaginatedWorkflowsResponseDto> {
    // In a real implementation, we would get the userId from the authenticated user
    // For now, we'll use a hardcoded userId until auth is fully implemented
    const userId = req.user?.id || "user1";
    return this.workflowsService.findAll(userId, +page, +limit);
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
  async findOne(@Param("id") id: string): Promise<WorkflowDto> {
    return this.workflowsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: "Create a new workflow" })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Workflow created successfully",
    type: WorkflowDto,
  })
  async create(
    @Request() req: { user?: { id: string } },
    @Body() createWorkflowDto: CreateWorkflowDto
  ): Promise<WorkflowDto> {
    // In a real implementation, we would get the userId from the authenticated user
    // For now, we'll use a hardcoded userId until auth is fully implemented
    const userId = req.user?.id || "user1";
    return this.workflowsService.create(createWorkflowDto, userId);
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
    @Param("id") id: string,
    @Body() updateWorkflowDto: UpdateWorkflowDto
  ): Promise<WorkflowDto> {
    return this.workflowsService.update(id, updateWorkflowDto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a workflow" })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: "Workflow deleted successfully",
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Workflow not found",
  })
  async remove(@Param("id") id: string): Promise<void> {
    return this.workflowsService.remove(id);
  }
}
