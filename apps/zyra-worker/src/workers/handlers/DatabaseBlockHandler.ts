import { Injectable, Logger } from '@nestjs/common';
import { BlockExecutionContext, BlockHandler } from '@zyra/types';
import { DatabaseService } from '../../services/database.service';

@Injectable()
export class DatabaseBlockHandler implements BlockHandler {
  private readonly logger = new Logger(DatabaseBlockHandler.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async execute(node: any, ctx: BlockExecutionContext): Promise<any> {
    const cfg = (node.data as any).config;

    if (!cfg.table || !cfg.operation) {
      throw new Error('Database block missing table or operation');
    }

    try {
      if (cfg.operation === 'select') {
        // Use Prisma for select operations
        const result = await this.databaseService.prisma.$queryRawUnsafe(
          `SELECT ${cfg.query || '*'} FROM ${cfg.table}`,
        );
        return result;
      } else if (cfg.operation === 'insert') {
        // Use Prisma for insert operations
        if (!cfg.values) {
          throw new Error('Insert operation requires values');
        }

        const columns = Object.keys(cfg.values).join(', ');
        const placeholders = Object.keys(cfg.values)
          .map(() => '?')
          .join(', ');
        const values = Object.values(cfg.values);

        const result = await this.databaseService.prisma.$executeRawUnsafe(
          `INSERT INTO ${cfg.table} (${columns}) VALUES (${placeholders})`,
          ...values,
        );
        return { insertedCount: result };
      } else {
        throw new Error(`Unsupported database operation: ${cfg.operation}`);
      }
    } catch (error: any) {
      this.logger.error(`Database operation failed: ${error.message}`);
      throw new Error(
        `DATABASE block ${cfg.operation} error: ${error.message}`,
      );
    }
  }
}
