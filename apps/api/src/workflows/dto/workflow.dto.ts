import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsOptional, IsArray, ValidateNested } from "class-validator";
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
