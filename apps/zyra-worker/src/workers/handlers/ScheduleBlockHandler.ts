

import { BlockExecutionContext, BlockHandler } from '@zyra/types';


export class ScheduleBlockHandler implements BlockHandler {
  async execute(node: any, ctx: BlockExecutionContext): Promise<any> {
    const cfg = (node.data as any).config;
    // Return schedule config; scheduling is handled by external trigger
    return { interval: cfg.interval, time: cfg.time };
  }
}
