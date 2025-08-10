import { Controller, Get, Param } from '@nestjs/common';
import { NotificationService } from '../services/notification.service';

@Controller('test-notification')
export class TestNotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get(':userId')
  async sendTestNotification(@Param('userId') userId: string) {
    await this.notificationService.sendTestNotification(userId);
    return { message: `Test notification sent to user ${userId}` };
  }
}
