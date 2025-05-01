// Define the AIProvider interface
export interface AIProvider {
  generateFlow(
    prompt: string,
    userId: string
  ): Promise<{
    nodes: any[];
    edges: any[];
  }>;
}
