import { Controller, Post, Body } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { AiService } from "./ai.service";

@ApiTags("ai")
@Controller("ai")
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post("generate-block")
  @ApiOperation({ summary: "Generate block using AI" })
  @ApiResponse({
    status: 200,
    description: "Block generated successfully",
  })
  async generateBlock(@Body() data: { prompt: string }) {
    return this.aiService.generateBlock(data.prompt);
  }
}
