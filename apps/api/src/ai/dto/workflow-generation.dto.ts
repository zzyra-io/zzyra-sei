import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  ValidateNested,
  IsIn,
} from "class-validator";
import { Type } from "class-transformer";

export class GenerationOptionsDto {
  @ApiProperty({ description: "Enable detailed mode for generation" })
  @IsBoolean()
  detailedMode: boolean;

  @ApiProperty({ description: "Enable prefill configuration" })
  @IsBoolean()
  prefillConfig: boolean;

  @ApiProperty({
    description: "Domain hint for better generation",
    required: false,
  })
  @IsOptional()
  @IsString()
  domainHint?: string;

  @ApiProperty({
    description: "User level",
    required: false,
    enum: ["beginner", "intermediate", "advanced"],
  })
  @IsOptional()
  @IsIn(["beginner", "intermediate", "advanced"])
  userLevel?: "beginner" | "intermediate" | "advanced";

  @ApiProperty({ description: "Enable security", required: false })
  @IsOptional()
  @IsBoolean()
  enableSecurity?: boolean;

  @ApiProperty({ description: "Enable validation", required: false })
  @IsOptional()
  @IsBoolean()
  enableValidation?: boolean;

  @ApiProperty({ description: "Auto heal", required: false })
  @IsOptional()
  @IsBoolean()
  autoHeal?: boolean;
}

export class WorkflowNodeDto {
  @ApiProperty({ description: "Node ID" })
  @IsString()
  id: string;

  @ApiProperty({ description: "Node type" })
  @IsString()
  type: string;

  @ApiProperty({ description: "Node position" })
  position: { x: number; y: number };

  @ApiProperty({ description: "Node data" })
  data: Record<string, unknown>;

  @ApiProperty({ description: "Node measured", required: false })
  @IsOptional()
  measured?: Record<string, unknown>;

  @ApiProperty({ description: "Node selected", required: false })
  @IsOptional()
  selected?: boolean;

  @ApiProperty({ description: "Node dragging", required: false })
  @IsOptional()
  dragging?: boolean;
}

export class WorkflowEdgeDto {
  @ApiProperty({ description: "Edge ID" })
  @IsString()
  id: string;

  @ApiProperty({ description: "Source node ID" })
  @IsString()
  source: string;

  @ApiProperty({ description: "Target node ID" })
  @IsString()
  target: string;

  @ApiProperty({ description: "Source handle", required: false })
  @IsOptional()
  @IsString()
  sourceHandle?: string;

  @ApiProperty({ description: "Target handle", required: false })
  @IsOptional()
  @IsString()
  targetHandle?: string;

  @ApiProperty({ description: "Edge type", required: false })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({ description: "Edge markerEnd", required: false })
  @IsOptional()
  markerEnd?: Record<string, unknown>;

  @ApiProperty({ description: "Edge animated", required: false })
  @IsOptional()
  animated?: boolean;

  @ApiProperty({ description: "Edge style", required: false })
  @IsOptional()
  style?: Record<string, unknown>;
}

export class GenerateWorkflowDto {
  @ApiProperty({ description: "Natural language description of the workflow" })
  @IsString()
  description: string;

  @ApiProperty({ description: "Session ID", required: false })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiProperty({ description: "Metadata", required: false })
  @IsOptional()
  metadata?: Record<string, unknown>;

  @ApiProperty({ description: "Generation options", required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => GenerationOptionsDto)
  options?: GenerationOptionsDto;

  @ApiProperty({ description: "Existing workflow nodes", required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowNodeDto)
  existingNodes?: WorkflowNodeDto[];

  @ApiProperty({ description: "Existing workflow edges", required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowEdgeDto)
  existingEdges?: WorkflowEdgeDto[];
}

export class RefineWorkflowDto {
  @ApiProperty({ description: "Refinement prompt" })
  @IsString()
  prompt: string;

  @ApiProperty({ description: "Refinement options", required: false })
  @IsOptional()
  options?: {
    preserveConnections?: boolean;
    focusArea?: string;
    intensity?: "light" | "medium" | "heavy";
  };

  @ApiProperty({ description: "Current workflow nodes" })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowNodeDto)
  nodes: WorkflowNodeDto[];

  @ApiProperty({ description: "Current workflow edges" })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowEdgeDto)
  edges: WorkflowEdgeDto[];
}

export class WorkflowResponseDto {
  @ApiProperty({ description: "Generated workflow nodes" })
  nodes: WorkflowNodeDto[];

  @ApiProperty({ description: "Generated workflow edges" })
  edges: WorkflowEdgeDto[];
}
