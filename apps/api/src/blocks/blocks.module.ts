import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { BlocksController } from "./blocks.controller";
import { BlocksService } from "./blocks.service";

@Module({
  imports: [DatabaseModule],
  controllers: [BlocksController],
  providers: [BlocksService],
  exports: [BlocksService],
})
export class BlocksModule {}
