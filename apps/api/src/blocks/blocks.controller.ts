import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { BlocksService, BlockType, CustomBlock } from "./blocks.service";

@ApiTags("blocks")
@Controller()
@ApiBearerAuth()
export class BlocksController {
  constructor(private readonly blocksService: BlocksService) {}

  @Get("block-types")
  @ApiOperation({ summary: "Get available block types" })
  @ApiResponse({
    status: 200,
    description: "Returns available block types",
  })
  async getBlockTypes(): Promise<BlockType[]> {
    return this.blocksService.getBlockTypes();
  }

  @Get("block-schema")
  @ApiOperation({ summary: "Get block schema" })
  @ApiResponse({
    status: 200,
    description: "Returns block schema",
  })
  async getBlockSchema(@Query("blockType") blockType: string) {
    return this.blocksService.getBlockSchema(blockType);
  }

  @Get("custom-blocks")
  @ApiOperation({ summary: "Get custom blocks" })
  @ApiResponse({
    status: 200,
    description: "Returns custom blocks",
  })
  async getCustomBlocks(
    @Request() req: { user?: { id: string } }
  ): Promise<CustomBlock[]> {
    const userId = req.user?.id;
    return this.blocksService.getCustomBlocks(userId);
  }

  @Get("custom-blocks/:id")
  @ApiOperation({ summary: "Get custom block by ID" })
  @ApiResponse({
    status: 200,
    description: "Returns custom block",
  })
  async getCustomBlock(
    @Param("id") id: string,
    @Request() req: { user?: { id: string } }
  ): Promise<CustomBlock | null> {
    const userId = req.user?.id;
    return this.blocksService.getCustomBlock(id, userId);
  }

  @Post("custom-blocks")
  @ApiOperation({ summary: "Create custom block" })
  @ApiResponse({
    status: 201,
    description: "Custom block created successfully",
  })
  async createCustomBlock(
    @Request() req: { user?: { id: string } },
    @Body()
    data: {
      name: string;
      description?: string;
      code: string;
      inputs: any[];
      outputs: any[];
      isPublic?: boolean;
    }
  ): Promise<CustomBlock> {
    const userId = req.user?.id || "user1";
    return this.blocksService.createCustomBlock(userId, data);
  }

  @Put("custom-blocks/:id")
  @ApiOperation({ summary: "Update custom block" })
  @ApiResponse({
    status: 200,
    description: "Custom block updated successfully",
  })
  async updateCustomBlock(
    @Param("id") id: string,
    @Request() req: { user?: { id: string } },
    @Body()
    data: {
      name?: string;
      description?: string;
      code?: string;
      inputs?: any[];
      outputs?: any[];
      isPublic?: boolean;
    }
  ): Promise<CustomBlock | null> {
    const userId = req.user?.id || "user1";
    return this.blocksService.updateCustomBlock(id, userId, data);
  }

  @Delete("custom-blocks/:id")
  @ApiOperation({ summary: "Delete custom block" })
  @ApiResponse({
    status: 200,
    description: "Custom block deleted successfully",
  })
  async deleteCustomBlock(
    @Param("id") id: string,
    @Request() req: { user?: { id: string } }
  ): Promise<{ success: boolean }> {
    const userId = req.user?.id || "user1";
    const success = await this.blocksService.deleteCustomBlock(id, userId);
    return { success };
  }
}
