import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { UserController } from "./user.controller";
import { UserService } from "./user.service";
import { WalletsController } from "./wallets.controller";
import { WalletsService } from "./wallets.service";

@Module({
  imports: [DatabaseModule],
  controllers: [UserController, WalletsController],
  providers: [UserService, WalletsService],
  exports: [UserService, WalletsService],
})
export class UserModule {}
