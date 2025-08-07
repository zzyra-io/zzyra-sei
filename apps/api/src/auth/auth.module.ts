import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { DatabaseModule } from "../database/database.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { DynamicJwtService } from "./dynamic-jwt.service";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";

@Module({
  imports: [DatabaseModule, PassportModule],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, DynamicJwtService, JwtAuthGuard],
  exports: [AuthService, DynamicJwtService],
})
export class AuthModule {}
