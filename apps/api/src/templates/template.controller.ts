import { JwtAuthGuard } from "@/auth/guards/jwt-auth.guard";
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { TemplateService } from "./template.service";
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  TemplateQueryDto,
  TemplateResponseDto,
} from "./dto/template.dto";

@ApiTags("templates")
@Controller("templates")
@ApiBearerAuth()
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  @Get()
  @ApiOperation({ summary: "List all templates" })
  @ApiQuery({ name: "category", required: false })
  @ApiQuery({ name: "search", required: false })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "limit", required: false })
  @ApiResponse({ status: 200, type: [TemplateResponseDto] })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async listTemplates(
    @Query() query: TemplateQueryDto
  ): Promise<TemplateResponseDto[]> {
    return this.templateService.listTemplates(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get template details" })
  @ApiParam({ name: "id", description: "Template ID" })
  @ApiResponse({ status: 200, type: TemplateResponseDto })
  async getTemplate(@Param("id") id: string): Promise<TemplateResponseDto> {
    return this.templateService.getTemplate(id);
  }

  @Post()
  @ApiOperation({ summary: "Create a new template" })
  @ApiResponse({ status: 201, type: TemplateResponseDto })
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async createTemplate(
    @Body() body: CreateTemplateDto,
    @Request() req: any
  ): Promise<TemplateResponseDto> {
    return this.templateService.createTemplate(body, req.user);
  }

  @Put(":id")
  @ApiOperation({ summary: "Update a template" })
  @ApiParam({ name: "id", description: "Template ID" })
  @ApiResponse({ status: 200, type: TemplateResponseDto })
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async updateTemplate(
    @Param("id") id: string,
    @Body() body: UpdateTemplateDto,
    @Request() req: any
  ): Promise<TemplateResponseDto> {
    return this.templateService.updateTemplate(id, body, req.user);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a template" })
  @ApiParam({ name: "id", description: "Template ID" })
  @ApiResponse({ status: 200, description: "Template deleted." })
  @UseGuards(JwtAuthGuard)
  async deleteTemplate(@Param("id") id: string, @Request() req: any) {
    return this.templateService.deleteTemplate(id, req.user);
  }
}
