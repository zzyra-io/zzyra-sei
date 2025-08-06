import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { SessionKeysController } from "./session-keys.controller";
import { SessionKeysService } from "./session-keys.service";
import { SessionMonitoringService } from "./session-monitoring.service";
import { SessionKeyCryptoService } from "../shared/services/session-key-crypto.service";
import { DatabaseModule } from "../database/database.module";

/**
 * Session Keys Module
 * Following NestJS modular architecture guidelines
 */
@Module({
  imports: [
    DatabaseModule,
    ScheduleModule.forRoot(), // Enable cron jobs for monitoring
  ],
  controllers: [SessionKeysController],
  providers: [
    SessionKeysService,
    SessionMonitoringService,
    SessionKeyCryptoService,
  ],
  exports: [
    SessionKeysService,
    SessionMonitoringService,
    SessionKeyCryptoService,
  ],
})
export class SessionKeysModule {}
