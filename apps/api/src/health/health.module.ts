import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { DatabaseHealthIndicator } from "./database.health";
import { DatabaseModule } from "../database/database.module";

@Module({
  imports: [DatabaseModule],
  controllers: [HealthController],
  providers: [DatabaseHealthIndicator],
  exports: [DatabaseHealthIndicator],
})
export class HealthModule {}
