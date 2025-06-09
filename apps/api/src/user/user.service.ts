import { Injectable, NotFoundException } from "@nestjs/common";
import { UserRepository } from "@zyra/database";
import {
  UpdateProfileDto,
  ProfileResponseDto,
  UsageResponseDto,
} from "./dto/user.dto";

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async getProfile(userId: string): Promise<ProfileResponseDto> {
    const user = await this.userRepository.findWithProfileAndWallets(userId);

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Return default profile if no profile exists
    if (!user.profile) {
      return {
        id: userId,
        full_name: "",
        email_notifications: true,
        telegram_handle: "",
        discord_webhook: "",
        dark_mode: false,
        subscription_tier: "free",
        subscription_status: "active",
        subscription_expires_at: null,
        monthly_execution_quota: 100,
        monthly_executions_used: 0,
        updated_at: new Date().toISOString(),
      };
    }

    return {
      id: user.id,
      full_name: user.profile.fullName || "",
      email_notifications: true,
      telegram_handle: user.profile.telegramChatId || "",
      discord_webhook: user.profile.discordWebhookUrl || "",
      dark_mode: false,
      subscription_tier: user.profile.subscriptionTier || "free",
      subscription_status: user.profile.subscriptionStatus || "active",
      subscription_expires_at:
        user.profile.subscriptionExpiresAt?.toISOString() || null,
      monthly_execution_quota: user.profile.monthlyExecutionQuota || 100,
      monthly_executions_used: user.profile.monthlyExecutionsUsed || 0,
      updated_at:
        user.profile.updatedAt?.toISOString() || new Date().toISOString(),
    };
  }

  async updateProfile(
    userId: string,
    updateData: UpdateProfileDto
  ): Promise<ProfileResponseDto> {
    await this.userRepository.updateProfile(userId, {
      fullName: updateData.full_name,
      telegramChatId: updateData.telegram_handle,
      discordWebhookUrl: updateData.discord_webhook,
    });

    return this.getProfile(userId);
  }

  async getUsage(userId: string): Promise<UsageResponseDto> {
    const user = await this.userRepository.findWithProfileAndWallets(userId);

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return {
      monthly_execution_quota: user.profile?.monthlyExecutionQuota || 100,
      monthly_executions_used: user.profile?.monthlyExecutionsUsed || 0,
      subscription_tier: user.profile?.subscriptionTier || "free",
    };
  }
}
