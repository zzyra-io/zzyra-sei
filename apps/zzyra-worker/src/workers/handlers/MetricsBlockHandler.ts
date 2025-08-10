import { getOrCreateHistogram, getOrCreateCounter } from '../../lib/prometheus';
import type { Histogram, Counter } from 'prom-client';

import { BlockExecutionContext, BlockType, BlockHandler } from '@zzyra/types';

export class MetricsBlockHandler implements BlockHandler {
  private duration: Histogram<string>;
  private failures: Counter<string>;

  constructor(
    private blockType: BlockType,
    private inner: BlockHandler,
  ) {
    this.duration = getOrCreateHistogram({
      name: 'node_execution_duration_seconds',
      help: 'Duration of node execution in seconds',
      labelNames: ['blockType'],
      buckets: [0.1, 0.5, 1, 2, 5],
    }) as Histogram<string>;
    this.failures = getOrCreateCounter({
      name: 'node_execution_failures_total',
      help: 'Total number of failed node executions',
      labelNames: ['blockType'],
    }) as Counter<string>;
  }

  async execute(node: any, ctx: BlockExecutionContext): Promise<any> {
    const labels = { blockType: this.blockType };
    const end = this.duration.startTimer(labels);
    try {
      const result = await this.inner.execute(node, ctx);
      end();
      return result;
    } catch (e: any) {
      this.failures.inc(labels);
      end();
      throw e;
    }
  }
}
