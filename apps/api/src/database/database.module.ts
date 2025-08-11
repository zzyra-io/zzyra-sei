import { Module, Global } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import {
  UserRepository,
  WorkflowRepository,
  ExecutionRepository,
  WalletRepository,
  NotificationRepository,
} from "@zzyra/database";

@Global()
@Module({
  providers: [
    PrismaService,
    UserRepository,
    WorkflowRepository,
    ExecutionRepository,
    WalletRepository,
    NotificationRepository,
  ],
  exports: [
    PrismaService,
    UserRepository,
    WorkflowRepository,
    ExecutionRepository,
    WalletRepository,
    NotificationRepository,
  ],
})
export class DatabaseModule {}
