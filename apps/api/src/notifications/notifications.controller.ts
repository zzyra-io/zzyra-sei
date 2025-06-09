import { Controller, Get, Post, Body, Query, Request } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { NotificationsService } from "./notifications.service";

@ApiTags("notifications")
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: "Get user notifications" })
  async getNotifications(
    @Request() req: { user?: { id: string } },
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    const userId = req.user?.id || "user1";
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.notificationsService.getNotifications(
      userId,
      pageNum,
      limitNum
    );
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
  ) {
    const userId = req.user?.id || "user1";
    return this.notificationsService.testNotification(userId, data);
  }
}
