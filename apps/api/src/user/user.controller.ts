import {
  Controller,
  Get,
  Put,
  Body,
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
import { UserService } from "./user.service";
import {
  UpdateProfileDto,
  ProfileResponseDto,
  UsageResponseDto,
} from "./dto/user.dto";

@ApiTags("user")
@Controller("user")
@ApiBearerAuth()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get("profile")
  @ApiOperation({ summary: "Get user profile" })
  @ApiResponse({
    status: 200,
    description: "Returns user profile",
    type: ProfileResponseDto,
  })
  async getProfile(@Request() req: any) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new HttpException("Unauthorized", HttpStatus.UNAUTHORIZED);
      }

      const profile = await this.userService.getProfile(userId);
      return profile;
    } catch (error) {
      console.error("Error fetching user profile:", error);
      throw new HttpException(
        "Failed to fetch user profile",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Put("profile")
  @ApiOperation({ summary: "Update user profile" })
  @ApiResponse({
    status: 200,
    description: "Profile updated successfully",
    type: ProfileResponseDto,
  })
  async updateProfile(
    @Body()
    data: {
      full_name?: string;
      email_notifications?: boolean;
      telegram_handle?: string;
      discord_webhook?: string;
      dark_mode?: boolean;
    },
    @Request() req: any
  ) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new HttpException("Unauthorized", HttpStatus.UNAUTHORIZED);
      }

      const profile = await this.userService.updateProfile(userId, data);
      return profile;
    } catch (error) {
      console.error("Error updating user profile:", error);
      throw new HttpException(
        "Failed to update user profile",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get("usage")
  @ApiOperation({ summary: "Get user usage statistics" })
  @ApiResponse({
    status: 200,
    description: "Returns user usage data",
    type: UsageResponseDto,
  })
  async getUsage(@Request() req: any) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new HttpException("Unauthorized", HttpStatus.UNAUTHORIZED);
      }

      const usage = await this.userService.getUsage(userId);
      return usage;
    } catch (error) {
      console.error("Error fetching usage data:", error);
      throw new HttpException(
        "Failed to fetch usage data",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
