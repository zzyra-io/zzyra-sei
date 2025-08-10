import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Request,
  Patch,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { NotificationsService } from "./notifications.service";
import { Notification, PaginatedResult } from "@zzyra/database";

@ApiTags("notifications")
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: "Get user notifications" })
  async getNotifications(
    @Request() req: { user?: { id: string } },
    @Query("page") page = 1,
    @Query("limit") limit = 10
  ): Promise<PaginatedResult<Notification>> {
    const userId = req.user?.id || "user1";
    return this.notificationsService.getNotifications(userId, page, limit);
  }

  @Get("unread-count")
  @ApiOperation({ summary: "Get unread notification count" })
  async getUnreadCount(@Request() req: { user?: { id: string } }) {
    const userId = req.user?.id || "user1";
    return this.notificationsService.getUnreadCount(userId);
  }

  @Post("mark-all-read")
  @ApiOperation({ summary: "Mark all notifications as read" })
  async markAllAsRead(@Request() req: { user?: { id: string } }) {
    const userId = req.user?.id || "user1";
    return this.notificationsService.markAllAsRead(userId);
  }

  @Get("logs")
  @ApiOperation({ summary: "Get notification logs" })
  async getNotificationLogs(@Request() req: { user?: { id: string } }) {
    const userId = req.user?.id || "user1";
    return this.notificationsService.getNotificationLogs(userId);
  }

  @Post("test")
  @ApiOperation({ summary: "Send test notification" })
  async testNotification(
    @Request() req: { user?: { id: string } },
    @Body() data: { type: string; title: string; message: string }
  ): Promise<{ success: boolean; notification: any }> {
    const userId = req.user?.id || "user1";
    return this.notificationsService.testNotification(userId, data);
  }

  @Patch()
  async markAsRead(
    @Request() req: { user?: { id: string } },
    @Body() body: { id: string }
  ): Promise<Notification> {
    const userId = req.user?.id || "user1";
    return this.notificationsService.markAsRead(userId, body.id);
  }
}
