import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// Import our modular MCP server components
import { getSupportedNetworks } from './chains';
// import { registerEVMPrompts } from './prompts'; // Temporarily disabled
import { registerEVMResources } from './resources';
import { registerEVMTools } from './tools';
import { registerEVMPrompts } from './prompts';

// Create and configure the MCP server
async function createSeiMcpServer() {
  try {
    // Create a new MCP server instance
    const server = new McpServer({
      name: 'sei-mcp-server',
      version: '1.0.0',
    });

    // Register all resources, tools, and prompts
    registerEVMResources(server);
    registerEVMTools(server);
    registerEVMPrompts(server);

    // Log server information
    console.error(
      `Sei MCP Server initialized for networks: ${getSupportedNetworks().join(', ')}`,
    );

    return server;
  } catch (error) {
    console.error('Failed to initialize Sei MCP server:', error);
    process.exit(1);
  }
}

// Start the server
async function main() {
  try {
    // Create the MCP server with all components
    const server = await createSeiMcpServer();

    // Setup transport and start server
    const transport = new StdioServerTransport();
    await server.connect(transport);

    console.error('Sei MCP Server running on stdio');
  } catch (error) {
    console.error('Fatal error in main():', error);
    process.exit(1);
  }
}

// Export the server creation function for testing
export { createSeiMcpServer };

// Start the server when this module is executed
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
