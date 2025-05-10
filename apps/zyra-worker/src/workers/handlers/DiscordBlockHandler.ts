

import { BlockHandler, BlockExecutionContext } from '@zyra/types';


export class DiscordBlockHandler implements BlockHandler {
  async execute(
    data: {
      webhookUrl: string;
      message: string;
    },
    context: BlockExecutionContext,
  ): Promise<Record<string, any>> {
    // Validate inputs
    if (!data.webhookUrl) {
      throw new Error('Webhook URL is required');
    }
    if (!data.message) {
      throw new Error('Message is required');
    }

    // Send message to Discord
    const response = await fetch(data.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: data.message }),
    });

    if (!response.ok) {
      throw new Error(`Discord webhook failed: ${response.statusText}`);
    }

    return { success: true };
  }
}
