

import { BlockExecutionContext, BlockHandler } from '@zyra/types';


export class LLMPromptBlockHandler implements BlockHandler {
  async execute(node: any, ctx: BlockExecutionContext): Promise<any> {
    const cfg = (node.data as any).config;
    const { promptTemplate, model, temperature = 0.7, maxTokens = 150 } = cfg;
    if (!promptTemplate) throw new Error('LLM Prompt missing promptTemplate');
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OpenAI API key not set');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: promptTemplate }],
        temperature,
        max_tokens: maxTokens,
      }),
    });
    if (!response.ok) throw new Error(`OpenAI API error: ${response.status}`);
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    return { text: content };
  }
}
