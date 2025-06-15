import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsDateString, IsString } from "class-validator";

export class ExecuteWorkflowDto {
  @ApiProperty({
    description:
      "ISO 8601 date string for when to execute the workflow. If not provided, executes immediately.",
    example: "2024-12-25T10:00:00.000Z",
    required: false,
  })
  @IsOptional()
  @IsDateString()
  scheduledTime?: string;

  @ApiProperty({
    description:
      "Cron expression for recurring executions (alternative to scheduledTime)",
    example: "0 9 * * 1-5", // Every weekday at 9 AM
    required: false,
  })
  @IsOptional()
  @IsString()
  cronExpression?: string;

  @ApiProperty({
    description: "Input data for the workflow execution",
    example: { key: "value" },
    required: false,
  })
  @IsOptional()
  input?: Record<string, any>;
}

export class ExecuteWorkflowResponseDto {
  @ApiProperty({
    description: "The unique identifier for the execution",
    example: "exec_1234567890_abcdef123",
  })
  executionId: string;

  @ApiProperty({
    description: "Whether the execution was scheduled or started immediately",
    example: "scheduled",
    enum: ["immediate", "scheduled", "recurring"],
  })
  status: "immediate" | "scheduled" | "recurring";

  @ApiProperty({
    description: "When the execution is scheduled to run (if scheduled)",
    example: "2024-12-25T10:00:00.000Z",
    required: false,
  })
  scheduledTime?: string;
}
