import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString, IsObject } from "class-validator";

export class CreateExecutionDto {
  @ApiProperty({ description: "ID of the workflow to execute" })
  @IsString()
  workflowId: string;

  @ApiProperty({ description: "Input data for the execution", required: false })
  @IsOptional()
  @IsObject()
  input?: any;

  @ApiProperty({
    description: "Type of trigger that started this execution",
    required: false,
  })
  @IsOptional()
  @IsString()
  triggerType?: string;
}

export class UpdateExecutionDto {
  @ApiProperty({ description: "New status for the execution", required: false })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({
    description: "Error message if execution failed",
    required: false,
  })
  @IsOptional()
  @IsString()
  error?: string;

  @ApiProperty({
    description: "Output data from the execution",
    required: false,
  })
  @IsOptional()
  @IsObject()
  output?: any;
}

export class PaginationMetaDto {
  @ApiProperty({ description: "Total number of items" })
  total: number = 0;

  @ApiProperty({ description: "Current page number" })
  page: number = 1;

  @ApiProperty({ description: "Number of items per page" })
  limit: number = 10;

  @ApiProperty({ description: "Total number of pages" })
  totalPages: number = 0;

  constructor(partial?: Partial<PaginationMetaDto>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}

// Move WorkflowExecutionDto before PaginatedExecutionsResponseDto
export class WorkflowExecutionDto {
  @ApiProperty({ description: "Unique identifier for the execution" })
  id: string = "";

  @ApiProperty({ description: "ID of the workflow being executed" })
  workflow_id: string = "";

  @ApiProperty({
    description: "Current status of the execution",
    enum: ["pending", "running", "completed", "failed", "paused"],
  })
  status: "pending" | "running" | "completed" | "failed" | "paused" = "pending";

  @ApiProperty({ description: "When the execution started" })
  started_at: string = "";

  @ApiProperty({ description: "When the execution completed", required: false })
  completed_at?: string;

  @ApiProperty({
    description: "Error message if execution failed",
    required: false,
  })
  error?: string;

  @ApiProperty({
    description: "Input data for the workflow execution",
    required: false,
  })
  input_data?: Record<string, unknown>;

  @ApiProperty({
    description: "Output data from the workflow execution",
    required: false,
  })
  output_data?: Record<string, unknown>;

  constructor(partial?: Partial<WorkflowExecutionDto>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}

export class PaginatedExecutionsResponseDto {
  @ApiProperty({
    description: "Array of workflow executions",
    type: [WorkflowExecutionDto],
  })
  data: WorkflowExecutionDto[] = [];

  @ApiProperty({ description: "Pagination metadata", type: PaginationMetaDto })
  meta: PaginationMetaDto = new PaginationMetaDto();

  constructor(partial?: Partial<PaginatedExecutionsResponseDto>) {
    if (partial) {
      Object.assign(this, partial);
      if (partial.meta) {
        this.meta = new PaginationMetaDto(partial.meta);
      }
    }
  }
}

export class NodeExecutionDto {
  @ApiProperty({ description: "Unique identifier for the node execution" })
  id: string = "";

  @ApiProperty({
    description: "ID of the workflow execution this node belongs to",
  })
  execution_id: string = "";

  @ApiProperty({ description: "ID of the node in the workflow" })
  node_id: string = "";

  @ApiProperty({
    description: "Current status of the node execution",
    enum: ["pending", "running", "completed", "failed", "paused"],
  })
  status: "pending" | "running" | "completed" | "failed" | "paused" = "pending";

  @ApiProperty({ description: "When the node execution started" })
  started_at: string = "";

  @ApiProperty({
    description: "When the node execution completed",
    required: false,
  })
  completed_at?: string;

  @ApiProperty({
    description: "Error message if node execution failed",
    required: false,
  })
  error?: string;

  @ApiProperty({
    description: "Input data for the node execution",
    required: false,
  })
  input_data?: Record<string, unknown>;

  @ApiProperty({
    description: "Output data from the node execution",
    required: false,
  })
  output_data?: Record<string, unknown>;

  constructor(partial?: Partial<NodeExecutionDto>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}

export class NodeLogDto {
  @ApiProperty({ description: "Unique identifier for the log entry" })
  id: string = "";

  @ApiProperty({ description: "ID of the node execution this log belongs to" })
  node_execution_id: string = "";

  @ApiProperty({ description: "Log message content" })
  message: string = "";

  @ApiProperty({
    description: "Log level",
    enum: ["info", "warn", "error", "debug"],
  })
  level: "info" | "warn" | "error" | "debug" = "info";

  @ApiProperty({ description: "When the log was created" })
  created_at: string = "";

  constructor(partial?: Partial<NodeLogDto>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}

export class ExecutionActionDto {
  @ApiProperty({
    description: "Optional node ID for targeted actions",
    required: false,
  })
  nodeId?: string;

  constructor(partial?: Partial<ExecutionActionDto>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}

export class ExecutionActionResponseDto {
  @ApiProperty({ description: "Whether the action was successful" })
  success: boolean = false;

  @ApiProperty({ description: "Response message" })
  message: string = "";

  constructor(partial?: Partial<ExecutionActionResponseDto>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}
