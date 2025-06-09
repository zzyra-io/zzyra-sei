import { Controller, Get, Put, Body, UseGuards, Request } from "@nestjs/common";
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
  async getProfile(
    @Request() req: { user?: { id: string } }
  ): Promise<ProfileResponseDto> {
    // In production, this would come from JWT auth guard
    const userId = req.user?.id || "user1";
    return this.userService.getProfile(userId);
  }

  @Put("profile")
  @ApiOperation({ summary: "Update user profile" })
  @ApiResponse({
    status: 200,
    description: "Profile updated successfully",
    type: ProfileResponseDto,
  })
  async updateProfile(
    @Request() req: { user?: { id: string } },
    @Body() updateData: UpdateProfileDto
  ): Promise<ProfileResponseDto> {
    // In production, this would come from JWT auth guard
    const userId = req.user?.id || "user1";
    return this.userService.updateProfile(userId, updateData);
  }

  @Get("usage")
  @ApiOperation({ summary: "Get user usage statistics" })
  @ApiResponse({
    status: 200,
    description: "Returns user usage data",
    type: UsageResponseDto,
  })
  async getUsage(
    @Request() req: { user?: { id: string } }
  ): Promise<UsageResponseDto> {
    // In production, this would come from JWT auth guard
    const userId = req.user?.id || "user1";
    return this.userService.getUsage(userId);
  }
}
