import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { EmailService } from './email.service';
import { TestNotificationController } from '@/controllers/test-notification.controller';
import { NotificationGateway } from '@/gateways/notification.gateway';

@Module({
  providers: [NotificationService, EmailService, NotificationGateway],
  controllers: [TestNotificationController],
  exports: [NotificationService, NotificationGateway],
})
export class NotificationModule {}
