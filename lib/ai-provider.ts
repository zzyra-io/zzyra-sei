// Define the AIProvider interface
export interface AIProvider {
  /**
   * Generate a workflow flow with nodes and edges
   */
  generateFlow(
    prompt: string,
    userId: string
  ): Promise<{
    nodes: any[];
    edges: any[];
  }>;

  /**
   * Generate a custom block definition or partial definition
   */
  generateCustomBlock(
    prompt: string,
    systemPrompt: string,
    userId: string
  ): Promise<any>;
}
