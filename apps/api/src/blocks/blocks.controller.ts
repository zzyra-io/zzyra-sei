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
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import {
  BlocksService,
  BlockType,
  CreateCustomBlockRequest,
} from "./blocks.service";
import { Public } from "../auth/decorators/public.decorator";

@ApiTags("blocks")
@Controller("blocks")
@ApiBearerAuth()
export class BlocksController {
  constructor(private readonly blocksService: BlocksService) {}

  @Public()
  @Get("types")
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
  @Get("schema")
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

  @Get("custom")
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

  @Get("custom/:id")
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

  @Post("custom")
  @ApiOperation({ summary: "Create custom block" })
  async createCustomBlock(
    @Body() data: CreateCustomBlockRequest,
    @Request() req: any
  ) {
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

  @Put("custom/:id")
  @ApiOperation({ summary: "Update custom block" })
  async updateCustomBlock(
    @Param("id") id: string,
    @Body() data: Partial<CreateCustomBlockRequest>,
    @Request() req: any
  ) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new HttpException("Unauthorized", HttpStatus.UNAUTHORIZED);
      }

      return this.blocksService.updateCustomBlock(id, userId, data);
    } catch (error) {
      console.error("Error updating custom block:", error);
      throw new HttpException(
        "Failed to update custom block",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete("custom/:id")
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
