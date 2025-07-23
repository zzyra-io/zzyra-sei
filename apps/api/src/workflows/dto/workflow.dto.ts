import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsBoolean,
  IsNumber,
} from "class-validator";
import { Type } from "class-transformer";

export class CreateWorkflowDto {
  @ApiProperty({ description: "Name of the workflow" })
  @IsString()
  name: string;

  @ApiProperty({ description: "Description of the workflow", required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: "Workflow nodes configuration" })
  @IsArray()
  nodes: Record<string, unknown>[];

  @ApiProperty({ description: "Workflow edges configuration" })
  @IsArray()
  edges: Record<string, unknown>[];

  @ApiProperty({
    description: "Whether the workflow is public",
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiProperty({ description: "Tags for the workflow", required: false })
  @IsOptional()
  @IsArray()
  tags?: string[];
}

export class UpdateWorkflowDto {
  @ApiProperty({ description: "Name of the workflow", required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: "Description of the workflow", required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: "Workflow nodes configuration", required: false })
  @IsOptional()
  @IsArray()
  nodes?: Record<string, unknown>[];

  @ApiProperty({ description: "Workflow edges configuration", required: false })
  @IsOptional()
  @IsArray()
  edges?: Record<string, unknown>[];

  @ApiProperty({
    description: "Whether the workflow is public",
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiProperty({ description: "Tags for the workflow", required: false })
  @IsOptional()
  @IsArray()
  tags?: string[];
}

export class WorkflowStatisticsDto {
  @ApiProperty({ description: "Total number of executions" })
  totalExecutions: number;

  @ApiProperty({ description: "Success rate percentage" })
  successRate: number;

  @ApiProperty({ description: "Average execution time in milliseconds" })
  avgExecutionTime: number;

  @ApiProperty({ description: "Number of nodes in the workflow" })
  nodeCount: number;

  @ApiProperty({ description: "Last execution status" })
  lastStatus: string;

  @ApiProperty({ description: "Last execution timestamp", required: false })
  lastExecutedAt?: string;

  @ApiProperty({ description: "Recent activity statistics" })
  recentActivity: {
    successful: number;
    failed: number;
    running: number;
  };
}

export class WorkflowDto {
  @ApiProperty({ description: "Unique identifier for the workflow" })
  id: string;

  @ApiProperty({ description: "Name of the workflow" })
  name: string;

  @ApiProperty({ description: "Description of the workflow" })
  description?: string;

  @ApiProperty({ description: "Workflow nodes configuration" })
  nodes: Record<string, unknown>[];

  @ApiProperty({ description: "Workflow edges configuration" })
  edges: Record<string, unknown>[];

  @ApiProperty({ description: "User ID who created the workflow" })
  userId: string;

  @ApiProperty({ description: "Whether the workflow is public" })
  isPublic: boolean;

  @ApiProperty({ description: "Tags for the workflow" })
  tags: string[];

  @ApiProperty({ description: "Creation timestamp" })
  createdAt: string;

  @ApiProperty({ description: "Last update timestamp" })
  updatedAt: string;

  @ApiProperty({ description: "Workflow version" })
  version: number;

  @ApiProperty({ description: "Whether the workflow is favorited by the user" })
  isFavorite: boolean;

  @ApiProperty({ description: "Workflow statistics", required: false })
  statistics?: WorkflowStatisticsDto;

  @ApiProperty({ description: "Last execution timestamp", required: false })
  lastRun?: string;
}

export class PaginatedWorkflowsResponseDto {
  @ApiProperty({ type: [WorkflowDto] })
  data: WorkflowDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;
}

export class ToggleFavoriteDto {
  @ApiProperty({ description: "Workflow ID" })
  @IsString()
  id: string;

  @ApiProperty({ description: "Whether to mark as favorite" })
  @IsBoolean()
  isFavorite: boolean;
}
