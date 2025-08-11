import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { EmailService } from './email.service';
import { NotificationGateway } from '@/gateways/notification.gateway';

@Module({
  providers: [NotificationService, EmailService, NotificationGateway],
  controllers: [],
  exports: [NotificationService, NotificationGateway],
})
export class NotificationModule {}
