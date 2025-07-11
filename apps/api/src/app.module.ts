import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { APP_GUARD } from "@nestjs/core";

// Database and core modules
import { DatabaseModule } from "./database/database.module";

// Domain modules
import { AuthModule } from "./auth/auth.module";
import { UserModule } from "./user/user.module";
import { WorkflowsModule } from "./workflows/workflows.module";
import { ExecutionsModule } from "./executions/executions.module";
import { BlocksModule } from "./blocks/blocks.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { BillingModule } from "./billing/billing.module";
import { AiModule } from "./ai/ai.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { TemplateController, TemplateService } from "./templates";
// import { AppController } from "./app.controller";

// Guards
import { JwtAuthGuard } from "./auth/guards/jwt-auth.guard";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
    DatabaseModule,
    AuthModule,
    UserModule,
    WorkflowsModule,
    ExecutionsModule,
    BlocksModule,
    NotificationsModule,
    BillingModule,
    AiModule,
    DashboardModule,
  ],
  controllers: [TemplateController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    TemplateService,
  ],
})
export class AppModule {}
