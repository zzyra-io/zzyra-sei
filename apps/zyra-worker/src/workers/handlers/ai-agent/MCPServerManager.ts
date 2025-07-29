import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../services/database.service';

interface MCPServer {
  id: string;
  name: string;
  userId: string; // Track which user owns this server
  client: any; // MCP client instance
  tools: MCPTool[];
  resources: MCPResource[];
  status: 'connected' | 'disconnected' | 'error';
  lastHealthCheck?: Date;
}

interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  execute: (params: any) => Promise<any>;
}

interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

interface MCPServerConfig {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  timeout?: number;
}

@Injectable()
export class MCPServerManager {
  private readonly logger = new Logger(MCPServerManager.name);
  private readonly servers = new Map<string, MCPServer>();
  private readonly defaultTimeout = 300000; // 5 minutes to match AI Agent timeout

  constructor(private readonly databaseService: DatabaseService) {}

  async registerServer(
    config: MCPServerConfig,
    userId: string,
  ): Promise<string> {
    try {
      // Create MCP client
      const client = await this.createMCPClient(config);

      // Generate a unique server ID
      const serverId = `mcp-server-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Try to save to database, fallback to memory-only storage
      let serverRecord = { id: serverId, name: config.name };
      try {
        // Use upsert to handle duplicate registrations
        const dbRecord = await (
          this.databaseService.prisma as any
        ).mcpServer?.upsert({
          where: {
            userId_name: {
              userId,
              name: config.name,
            },
          },
          update: {
            command: config.command,
            args: config.args || [],
            env: config.env || {},
            tools: [],
            status: 'connected',
            lastHealthCheck: new Date(),
          },
          create: {
            userId,
            name: config.name,
            command: config.command,
            args: config.args || [],
            env: config.env || {},
            tools: [],
            status: 'connected',
            lastHealthCheck: new Date(),
          },
        });
        if (dbRecord) serverRecord = dbRecord;
      } catch (dbError) {
        this.logger.warn(
          'Database table not available, using memory-only storage for MCP server',
        );
      }

      // Discover available tools and resources
      const tools = await this.discoverTools(client);
      const resources = await this.discoverResources(client);

      // Store in memory cache
      const server: MCPServer = {
        id: serverRecord.id,
        name: config.name,
        userId, // Include the user ID
        client,
        tools: tools.map((tool) => this.createToolExecutor(tool, client)),
        resources,
        status: 'connected',
        lastHealthCheck: new Date(),
      };

      this.servers.set(serverRecord.id, server);

      this.logger.log(
        `Registered MCP server: ${config.name} with ${tools.length} tools and ${resources.length} resources`,
      );
      return serverRecord.id;
    } catch (error) {
      this.logger.error(`Failed to register MCP server ${config.name}:`, error);
      throw new Error(
        `MCP server registration failed: ${(error as Error).message}`,
      );
    }
  }

  async getServer(serverId: string): Promise<MCPServer | null> {
    // Try memory cache first
    if (this.servers.has(serverId)) {
      return this.servers.get(serverId)!;
    }

    // Try to load from database if available
    try {
      const serverRecord = await (
        this.databaseService.prisma as any
      ).mcpServer?.findUnique({
        where: { id: serverId },
      });

      if (serverRecord) {
        const server: MCPServer = {
          id: serverRecord.id,
          name: serverRecord.name,
          userId: serverRecord.userId, // Get userId from database record
          client: null, // Client would need to be recreated
          tools: [],
          resources: [],
          status: 'disconnected',
          lastHealthCheck: serverRecord.lastHealthCheck,
        };

        this.servers.set(serverId, server);
        return server;
      }
    } catch (error) {
      this.logger.debug(
        `Database not available for MCP server lookup: ${serverId}`,
      );
    }

    return null;
  }

  async loadTool(
    toolId: string,
    config: any,
    userId: string,
  ): Promise<MCPTool | null> {
    try {
      // Find server that contains this tool
      const servers = await this.getUserServers(userId);

      for (const server of servers) {
        const tool = server.tools.find((t) => t.name === toolId);
        if (tool) {
          return tool;
        }
      }

      this.logger.warn(`Tool ${toolId} not found for user ${userId}`);
      return null;
    } catch (error) {
      this.logger.error(`Failed to load tool ${toolId}:`, error);
      return null;
    }
  }

  async getUserServers(userId: string): Promise<MCPServer[]> {
    this.logger.log(`Getting servers for user: ${userId}`);
    try {
      // Try database first
      try {
        const serverRecords = await (
          this.databaseService.prisma as any
        ).mcpServer?.findMany({
          where: { userId, status: 'connected' },
        });

        if (serverRecords && serverRecords.length > 0) {
          this.logger.log(
            `Found ${serverRecords.length} servers in database for user ${userId}`,
          );
          const servers = [];
          for (const record of serverRecords) {
            const server = await this.getServer(record.id);
            if (server) {
              servers.push(server);
            }
          }
          return servers;
        } else {
          this.logger.log(
            `No servers found in database for user ${userId}, checking memory...`,
          );
        }
      } catch (dbError) {
        this.logger.debug(
          'Database not available, using memory-only server list',
        );
      }

      // Fallback to memory-only servers - filter by user ID and connected status
      const connectedServers = Array.from(this.servers.values()).filter(
        (server) => server.userId === userId && server.status === 'connected',
      );
      this.logger.log(
        `Found ${connectedServers.length} connected servers in memory for user ${userId}`,
      );
      this.logger.log(
        `All servers in memory: ${Array.from(this.servers.keys()).join(', ')}`,
      );
      this.logger.log(
        `Server statuses: ${Array.from(this.servers.entries())
          .map(([id, server]) => `${id}: ${server.status}`)
          .join(', ')}`,
      );
      return connectedServers;
    } catch (error) {
      this.logger.error(`Failed to get user servers for ${userId}:`, error);
      return [];
    }
  }

  async healthCheck(serverId: string): Promise<boolean> {
    try {
      const server = await this.getServer(serverId);
      if (!server || !server.client) {
        return false;
      }

      // Simple health check - check if client is still connected
      const isHealthy = server.status === 'connected';

      // Update health check timestamp in memory
      server.lastHealthCheck = new Date();

      // Try to update database if available
      try {
        await (this.databaseService.prisma as any).mcpServer?.update({
          where: { id: serverId },
          data: {
            lastHealthCheck: new Date(),
            status: isHealthy ? 'connected' : 'error',
          },
        });
      } catch (dbError) {
        this.logger.debug('Database not available for health check update');
      }

      return isHealthy;
    } catch (error) {
      this.logger.warn(`Health check failed for server ${serverId}:`, error);

      // Mark server as error in memory
      const server = this.servers.get(serverId);
      if (server) {
        server.status = 'error';
      }

      return false;
    }
  }

  private async createMCPClient(config: MCPServerConfig): Promise<any> {
    try {
      // Dynamic import of MCP SDK
      const { Client } = await import(
        '@modelcontextprotocol/sdk/client/index.js'
      );
      const { StdioClientTransport } = await import(
        '@modelcontextprotocol/sdk/client/stdio.js'
      );

      // Create transport for subprocess
      const transport = new StdioClientTransport({
        command: config.command,
        args: config.args || [],
        env: {
          ...process.env,
          ...config.env,
        },
      });

      // Create and connect client
      const client = new Client(
        {
          name: 'zyra-worker',
          version: '1.0.0',
        },
        {
          capabilities: {
            tools: {},
            resources: {},
          },
        },
      );

      await client.connect(transport);
      return client;
    } catch (error) {
      throw new Error(
        `Failed to create MCP client: ${(error as Error).message}`,
      );
    }
  }

  private async discoverTools(client: any): Promise<any[]> {
    try {
      const response = await client.listTools();
      return response.tools || [];
    } catch (error) {
      this.logger.warn('Failed to discover tools:', error);
      return [];
    }
  }

  private async discoverResources(client: any): Promise<MCPResource[]> {
    try {
      const response = await client.listResources();
      return response.resources || [];
    } catch (error) {
      this.logger.warn('Failed to discover resources:', error);
      return [];
    }
  }

  private createToolExecutor(toolDefinition: any, client: any): MCPTool {
    return {
      name: toolDefinition.name,
      description: toolDefinition.description,
      inputSchema: toolDefinition.inputSchema || {},
      execute: async (params: any) => {
        return this.executeToolCall(toolDefinition.name, params, client);
      },
    };
  }

  private async executeToolCall(
    toolName: string,
    params: any,
    client: any,
  ): Promise<any> {
    try {
      const response = await client.callTool({
        name: toolName,
        arguments: params,
      });

      return {
        success: !response.isError,
        result: response.content,
        error: response.isError ? response.content : null,
      };
    } catch (error) {
      this.logger.error(`Tool execution failed for ${toolName}:`, error);
      throw error;
    }
  }
}
