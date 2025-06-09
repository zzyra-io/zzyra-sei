import { Injectable } from "@nestjs/common";

@Injectable()
export class AiService {
  async generateBlock(prompt: string) {
    // Stub implementation - would integrate with AI provider
    return {
      success: true,
      block: {
        name: "Generated Block",
        code: "// Generated code based on prompt",
        description: `Block generated from: ${prompt}`,
      },
    };
  }
}
