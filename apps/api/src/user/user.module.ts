import { Module } from "@nestjs/common";
import { UserController } from "./user.controller";
import { UserService } from "./user.service";
import { WalletsController } from "./wallets.controller";
import { WalletsService } from "./wallets.service";

@Module({
  controllers: [UserController, WalletsController],
  providers: [UserService, WalletsService],
  exports: [UserService, WalletsService],
})
export class UserModule {}
