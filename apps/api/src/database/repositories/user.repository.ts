import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { User } from "@zyra/database";

@Injectable()
export class UserRepository {
  constructor(private prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    return this.prisma.client.user.findUnique({
      where: { id },
      include: { profile: true },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.client.user.findUnique({
      where: { email },
      include: { profile: true },
    });
  }

  async create(data: { email: string; fullName?: string }): Promise<User> {
    return this.prisma.client.user.create({
      data: {
        email: data.email,
        profile: {
          create: {
            email: data.email,
            fullName: data.fullName,
          },
        },
      },
      include: { profile: true },
    });
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    return this.prisma.client.user.update({
      where: { id },
      data,
      include: { profile: true },
    });
  }

  async updateProfile(
    userId: string,
    data: {
      fullName?: string;
      avatarUrl?: string;
      subscriptionTier?: string;
      subscriptionStatus?: string;
      subscriptionExpiresAt?: Date;
      monthlyExecutionQuota?: number;
      monthlyExecutionsUsed?: number;
      stripeCustomerId?: string;
      stripeSubscriptionId?: string;
      telegramChatId?: string;
      discordWebhookUrl?: string;
      emailNotifications?: boolean;
      telegramHandle?: string;
      discordWebhook?: string;
      darkMode?: boolean;
    }
  ): Promise<User> {
    // Map the frontend field names to database field names
    const profileData: any = {};

    if (data.fullName !== undefined) profileData.fullName = data.fullName;
    if (data.avatarUrl !== undefined) profileData.avatarUrl = data.avatarUrl;
    if (data.subscriptionTier !== undefined)
      profileData.subscriptionTier = data.subscriptionTier;
    if (data.subscriptionStatus !== undefined)
      profileData.subscriptionStatus = data.subscriptionStatus;
    if (data.subscriptionExpiresAt !== undefined)
      profileData.subscriptionExpiresAt = data.subscriptionExpiresAt;
    if (data.monthlyExecutionQuota !== undefined)
      profileData.monthlyExecutionQuota = data.monthlyExecutionQuota;
    if (data.monthlyExecutionsUsed !== undefined)
      profileData.monthlyExecutionsUsed = data.monthlyExecutionsUsed;
    if (data.stripeCustomerId !== undefined)
      profileData.stripeCustomerId = data.stripeCustomerId;
    if (data.stripeSubscriptionId !== undefined)
      profileData.stripeSubscriptionId = data.stripeSubscriptionId;
    if (data.telegramChatId !== undefined)
      profileData.telegramChatId = data.telegramChatId;
    if (data.discordWebhookUrl !== undefined)
      profileData.discordWebhookUrl = data.discordWebhookUrl;

    // Map frontend fields to database fields
    if (data.telegramHandle !== undefined)
      profileData.telegramChatId = data.telegramHandle;
    if (data.discordWebhook !== undefined)
      profileData.discordWebhookUrl = data.discordWebhook;

    return this.prisma.client.user.update({
      where: { id: userId },
      data: {
        profile: {
          upsert: {
            create: {
              email: "", // Will be populated if needed
              ...profileData,
              updatedAt: new Date(),
            },
            update: {
              ...profileData,
              updatedAt: new Date(),
            },
          },
        },
      },
      include: { profile: true },
    });
  }
}
