import { Module } from '@nestjs/common';
import { MagicAdminService } from './magic-admin.service';
import { MagicTradeService } from './magic-trade.service';
import { DatabaseModule } from './database.module';

/**
 * Magic Link integration module
 * Provides services for Magic Link wallet operations
 */
@Module({
  imports: [DatabaseModule],
  providers: [MagicAdminService, MagicTradeService],
  exports: [MagicAdminService, MagicTradeService],
})
export class MagicModule {}
