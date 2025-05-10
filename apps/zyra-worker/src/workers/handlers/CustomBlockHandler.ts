
import { createServiceClient } from '../../lib/supabase/serviceClient';
import { executeCustomBlockLogic } from '../../types/custom-block';

import { BlockExecutionContext, BlockHandler } from '@zyra/types';


export class CustomBlockHandler implements BlockHandler {
  async execute(node: any, ctx: BlockExecutionContext): Promise<any> {
    const cfg = (node.data as any).config;
    const supabase = createServiceClient();
    const blockId = cfg.customBlockId || cfg.blockId;
    const { data: blockDef, error } = await supabase
      .from('custom_blocks')
      .select('*')
      .eq('id', blockId)
      .single();
    if (error || !blockDef)
      throw new Error(`Custom block ${blockId} not found`);
    const result = await executeCustomBlockLogic(
      blockDef as any,
      cfg.inputs || {},
    );
    if (!result.success)
      throw new Error(`Custom block execution error: ${result.error}`);
    return result.outputs;
  }
}
