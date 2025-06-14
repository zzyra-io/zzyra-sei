import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Request,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { BlocksService, BlockType, CustomBlock } from "./blocks.service";
import { Public } from "../auth/decorators/public.decorator";

@ApiTags("blocks")
@Controller()
@ApiBearerAuth()
export class BlocksController {
  constructor(private readonly blocksService: BlocksService) {}

  @Public()
  @Get("block-types")
  @ApiOperation({ summary: "Get all available block types" })
  async getBlockTypes() {
    try {
      return this.blocksService.getBlockTypes();
    } catch (error) {
      console.error("Error in block-types API:", error);
      throw new HttpException(
        "Internal server error",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Public()
  @Get("block-schema")
  @ApiOperation({ summary: "Get block schema for a specific type" })
  async getBlockSchema(@Query("type") type?: string) {
    try {
      return this.blocksService.getBlockSchema(type);
    } catch (error) {
      console.error("Error in block-schema API:", error);
      throw new HttpException(
        "Internal server error",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get("custom-blocks")
  @ApiOperation({ summary: "Get custom blocks" })
  async getCustomBlocks(
    @Query("is_public") isPublic?: string,
    @Query("category") category?: string,
    @Request() req?: any
  ) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new HttpException("Unauthorized", HttpStatus.UNAUTHORIZED);
      }

      return this.blocksService.getCustomBlocks(userId, isPublic, category);
    } catch (error) {
      console.error("Error fetching custom blocks:", error);
      throw new HttpException(
        "Failed to fetch custom blocks",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get("custom-blocks/:id")
  @ApiOperation({ summary: "Get custom block by ID" })
  async getCustomBlock(@Param("id") id: string, @Request() req: any) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new HttpException("Unauthorized", HttpStatus.UNAUTHORIZED);
      }

      return this.blocksService.getCustomBlock(id, userId);
    } catch (error) {
      console.error("Error fetching custom block:", error);
      throw new HttpException(
        "Failed to fetch custom block",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post("custom-blocks")
  @ApiOperation({ summary: "Create custom block" })
  async createCustomBlock(@Body() data: any, @Request() req: any) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new HttpException("Unauthorized", HttpStatus.UNAUTHORIZED);
      }

      return this.blocksService.createCustomBlock(userId, data);
    } catch (error) {
      console.error("Error creating custom block:", error);
      throw new HttpException(
        "Failed to create custom block",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete("custom-blocks/:id")
  @ApiOperation({ summary: "Delete custom block" })
  async deleteCustomBlock(@Param("id") id: string, @Request() req: any) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new HttpException("Unauthorized", HttpStatus.UNAUTHORIZED);
      }

      return this.blocksService.deleteCustomBlock(id, userId);
    } catch (error) {
      console.error("Error deleting custom block:", error);
      throw new HttpException(
        "Failed to delete custom block",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
