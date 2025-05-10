

import { Logger } from '@nestjs/common';
import { BlockExecutionContext, BlockHandler } from '@zyra/types';


export class WebhookBlockHandler implements BlockHandler {
  private readonly logger = new Logger(WebhookBlockHandler.name);

  async execute(node: any, ctx: BlockExecutionContext): Promise<any> {
    const cfg = (node.data as any).config || {};
    
    // Validate URL
    if (!cfg.url) {
      throw new Error('Webhook URL is required');
    }

    // Prepare request options
    const method = (cfg.method || 'GET').toUpperCase();
    const requestHeaders: Record<string, string> = {
      'Accept': 'application/json, text/plain, */*',
      ...this.normalizeHeaders(cfg.headers || {})
    };

    // Add Content-Type for requests with body
    if (cfg.body && !requestHeaders['content-type']) {
      requestHeaders['content-type'] = 'application/json';
    }

    const requestOptions: RequestInit = {
      method,
      headers: requestHeaders,
    };

    // Add body for non-GET requests
    if (method !== 'GET' && cfg.body) {
      requestOptions.body = typeof cfg.body === 'string' 
        ? cfg.body 
        : JSON.stringify(cfg.body);
    }

    this.logger.debug(`Making ${method} request to ${cfg.url}`);

    try {
      const res = await fetch(cfg.url, requestOptions);
      
      if (!res.ok) {
        throw new Error(`Webhook returned HTTP ${res.status}: ${await res.text()}`);
      }

      const contentType = res.headers.get('content-type') || '';
      return contentType.includes('application/json')
        ? await res.json()
        : await res.text();
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      this.logger.error(`Webhook request failed: ${errorMessage}`);
      throw new Error(`Webhook request failed: ${errorMessage}`);
    }
  }

  private normalizeHeaders(headers: Record<string, any>): Record<string, string> {
    const normalized: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(headers)) {
      const normalizedKey = key.toLowerCase();
      normalized[normalizedKey] = String(value);
    }
    
    return normalized;
  }
}
