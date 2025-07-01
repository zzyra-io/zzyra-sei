import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  IsObject,
  IsNotEmpty,
  IsNumber,
  IsUUID,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateTemplateDto {
  @ApiProperty({ example: "Crypto Price Alert System" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: "Monitor cryptocurrency prices and get instant alerts.",
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: "finance" })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({ type: [Object], example: [] })
  @IsArray()
  nodes: any[];

  @ApiProperty({ type: [Object], example: [] })
  @IsArray()
  edges: any[];

  @ApiPropertyOptional({ type: [String], example: ["crypto", "alerts"] })
  @IsArray()
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  is_premium?: boolean;
}

export class UpdateTemplateDto {
  @ApiPropertyOptional({ example: "Crypto Price Alert System" })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    example: "Monitor cryptocurrency prices and get instant alerts.",
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: "finance" })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ type: [Object], example: [] })
  @IsArray()
  @IsOptional()
  nodes?: any[];

  @ApiPropertyOptional({ type: [Object], example: [] })
  @IsArray()
  @IsOptional()
  edges?: any[];

  @ApiPropertyOptional({ type: [String], example: ["crypto", "alerts"] })
  @IsArray()
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  is_premium?: boolean;
}

export class TemplateQueryDto {
  @ApiPropertyOptional({ example: "finance" })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ example: "alert" })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsNumber()
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsNumber()
  @IsOptional()
  limit?: number;
}

export class TemplateResponseDto {
  @ApiProperty()
  @IsUUID()
  id: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsString()
  category: string;

  @ApiProperty({ type: [Object] })
  @IsArray()
  nodes: any[];

  @ApiProperty({ type: [Object] })
  @IsArray()
  edges: any[];

  @ApiProperty({ type: [String] })
  @IsArray()
  tags: string[];

  @ApiProperty()
  @IsBoolean()
  is_premium: boolean;

  @ApiProperty()
  @IsString()
  created_at: string;

  @ApiProperty()
  @IsString()
  updated_at: string;
}
