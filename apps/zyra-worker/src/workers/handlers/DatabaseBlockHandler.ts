
import { createServiceClient } from '../../lib/supabase/serviceClient';

import { BlockExecutionContext, BlockHandler } from '@zyra/types';


export class DatabaseBlockHandler implements BlockHandler {
  async execute(node: any, ctx: BlockExecutionContext): Promise<any> {
    const cfg = (node.data as any).config;
    const supabase = createServiceClient();
    if (!cfg.table || !cfg.operation)
      throw new Error('Database block missing table or operation');
    if (cfg.operation === 'select') {
      const { data, error } = await supabase
        .from(cfg.table)
        .select(cfg.query || '*');
      if (error)
        throw new Error(`DATABASE block select error: ${error.message}`);
      return data;
    } else if (cfg.operation === 'insert') {
      const { data, error } = await supabase
        .from(cfg.table)
        .insert(cfg.values)
        .select();
      if (error)
        throw new Error(`DATABASE block insert error: ${error.message}`);
      return data;
    } else {
      throw new Error(`Unsupported database operation: ${cfg.operation}`);
    }
  }
}
