import { Module, NestModule, MiddlewareConsumer } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { join } from "path";
import { JwtModule } from "@nestjs/jwt";
import { APP_GUARD, APP_FILTER } from "@nestjs/core";

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
import { HealthModule } from "./health/health.module";
import { TransformationsModule } from "./transformations/transformations.module";
import { AIAgentModule } from "./ai-agent/ai-agent.module";
import { SessionKeysModule } from "./session-keys/session-keys.module";
import { TemplateController, TemplateService } from "./templates";
// import { AppController } from "./app.controller";

// Guards
import { JwtAuthGuard } from "./auth/guards/jwt-auth.guard";

// Exception Filters
import { DatabaseExceptionFilter } from "./filters/database-exception.filter";
import { PrismaExceptionFilter } from "./filters/prisma-exception.filter";

// Middleware
import {
  SecurityMiddleware,
  AdminSecurityMiddleware,
} from "./shared/middleware/security.middleware";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Load env from multiple locations to support monorepo setups
      envFilePath: [
        join(process.cwd(), ".env"),
        join(process.cwd(), ".env.local"),
        join(process.cwd(), "../../.env"),
        join(process.cwd(), "../../.env.local"),
      ],
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
    HealthModule,
    TransformationsModule,
    AIAgentModule,
    SessionKeysModule,
  ],
  controllers: [TemplateController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_FILTER,
      useClass: DatabaseExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: PrismaExceptionFilter,
    },
    TemplateService,
    SecurityMiddleware,
    AdminSecurityMiddleware,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply security middleware to all routes
    consumer.apply(SecurityMiddleware).forRoutes("*");

    // Apply admin security middleware to admin routes
    consumer.apply(AdminSecurityMiddleware).forRoutes("*/admin/*");
  }
}
