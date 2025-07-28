import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../services/database.service';
import { MCPServerManager } from './MCPServerManager';

interface MCPServerConnection {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category:
    | 'filesystem'
    | 'web'
    | 'database'
    | 'api'
    | 'automation'
    | 'development';
  icon?: string;
  
  // Connection details to existing MCP server
  connection: {
    type: 'stdio' | 'sse' | 'websocket';
    command?: string; // For stdio connections
    args?: string[];
    url?: string; // For SSE/WebSocket connections
    headers?: Record<string, string>;
  };
  
  // Required configuration from user
  configSchema: {
    type: 'object';
    properties: Record<
      string,
      {
      type: string;
      description: string;
      required?: boolean;
      default?: any;
      enum?: string[];
      format?: string;
      sensitive?: boolean; // For API keys, passwords
      }
    >;
    required?: string[];
  };
  
  // Examples for user guidance
  examples: Array<{
    name: string;
    description: string;
    configuration: Record<string, any>;
  }>;
}

interface DiscoveredTool {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  serverId: string;
}

interface UserServerSelection {
  serverId: string;
  displayName: string;
  enabled: boolean;
  configuration: Record<string, any>; // User-provided config (API keys, paths, etc.)
  selectedTools?: string[]; // Specific tools from this server (empty = all tools)
}

interface UserToolConfiguration {
  servers: UserServerSelection[];
  executionId?: string;
}

// Add the missing UserToolSelection interface
interface UserToolSelection {
  toolId: string;
  serverId: string;
  displayName: string;
  enabled: boolean;
  configuration: Record<string, any>;
}

/**
 * MCP Tools Manager for UI-configurable MCP server connections
 * Manages connections to existing MCP servers and tool discovery
 */
@Injectable()
export class MCPToolsManager {
  private readonly logger = new Logger(MCPToolsManager.name);
  private availableServers = new Map<string, MCPServerConnection>();
  private userConfigurations = new Map<string, UserToolConfiguration>();
  private discoveredTools = new Map<string, DiscoveredTool[]>(); // serverId -> tools

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly mcpServerManager: MCPServerManager,
  ) {
    this.initializeAvailableServers();
  }

  /**
   * Get all available MCP servers for UI selection
   */
  getAvailableServers(category?: string): MCPServerConnection[] {
    const servers = Array.from(this.availableServers.values());
    
    if (category) {
      return servers.filter((server) => server.category === category);
    }
    
    return servers.sort((a, b) => a.displayName.localeCompare(b.displayName));
  }

  /**
   * Get servers by category for organized UI display
   */
  getServersByCategory(): Record<string, MCPServerConnection[]> {
    const categories: Record<string, MCPServerConnection[]> = {
      filesystem: [],
      web: [],
      database: [],
      api: [],
      automation: [],
      development: [],
    };

    for (const server of this.availableServers.values()) {
      categories[server.category].push(server);
    }

    return categories;
  }

  /**
   * Get specific server definition for configuration UI
   */
  getServerDefinition(serverId: string): MCPServerConnection | null {
    return this.availableServers.get(serverId) || null;
  }

  /**
   * Connect to an MCP server and discover its tools
   */
  async connectAndDiscoverTools(
    serverId: string,
    userConfig: Record<string, any>,
    userId: string = 'system',
  ): Promise<DiscoveredTool[]> {
    try {
      const serverDef = this.availableServers.get(serverId);
      if (!serverDef) {
        throw new Error(`Server definition ${serverId} not found`);
      }

      // Create server configuration with user-provided values
      const serverConfig = {
        name: serverDef.displayName,
        command: serverDef.connection.command || '',
        args: serverDef.connection.args || [],
        env: userConfig, // User's API keys, paths, etc.
        description: serverDef.description,
      };

      // Connect to the MCP server using our MCPServerManager
      this.logger.log(`Registering server ${serverId} for user ${userId}`);
      const actualServerId = await this.mcpServerManager.registerServer(
        serverConfig,
        userId, // Use the passed user ID
      );
      this.logger.log(`Server registered with ID: ${actualServerId}`);

      // Get the server instance to discover tools
      const serverInstance =
        await this.mcpServerManager.getServer(actualServerId);
      if (!serverInstance) {
        throw new Error(`Failed to get server instance ${actualServerId}`);
      }

      // Extract discovered tools
      const discoveredTools: DiscoveredTool[] = serverInstance.tools.map(
        (tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        serverId: actualServerId,
        }),
      );

      // Cache discovered tools
      this.discoveredTools.set(serverId, discoveredTools);

      this.logger.log(
        `Discovered ${discoveredTools.length} tools from server ${serverId}`,
      );
      return discoveredTools;
    } catch (error) {
      this.logger.error(
        `Failed to discover tools from server ${serverId}:`,
        error,
      );
      return [];
    }
  }

  /**
   * Save user's tool selection and configuration for a block
   */
  async saveUserToolConfiguration(
    userId: string,
    blockId: string,
    toolSelections: UserToolSelection[],
  ): Promise<void> {
      const configKey = `${userId}:${blockId}`;

    // Convert tool selections to server-based configuration
    const serverConfigurations = new Map<string, UserServerSelection>();

    for (const selection of toolSelections) {
      const serverDef = this.availableServers.get(selection.serverId);
      if (!serverDef) continue;

      if (!serverConfigurations.has(selection.serverId)) {
        serverConfigurations.set(selection.serverId, {
          serverId: selection.serverId,
          displayName: serverDef.displayName,
          enabled: selection.enabled,
          configuration: selection.configuration,
          selectedTools: [],
        });
      }

      const serverConfig = serverConfigurations.get(selection.serverId)!;
      serverConfig.selectedTools!.push(selection.toolId);
    }

    const userConfig: UserToolConfiguration = {
      servers: Array.from(serverConfigurations.values()),
    };

    this.userConfigurations.set(configKey, userConfig);

    // Save to memory (database operations removed for now)
    this.logger.log(
      `Saved tool configuration for user ${userId}, block ${blockId}`,
    );
  }

  /**
   * Get user's tool configuration for a block
   */
  async getUserToolConfiguration(
    userId: string,
    blockId: string,
  ): Promise<UserToolSelection[]> {
    const configKey = `${userId}:${blockId}`;

    // Try to get from memory first
    const memoryConfig = this.userConfigurations.get(configKey);
    if (memoryConfig) {
      // Convert back to tool selections
      const toolSelections: UserToolSelection[] = [];
      for (const server of memoryConfig.servers) {
        const serverDef = this.availableServers.get(server.serverId);
        if (!serverDef) continue;

        for (const toolId of server.selectedTools || []) {
          toolSelections.push({
            toolId,
            serverId: server.serverId,
            displayName: `${serverDef.displayName} - ${toolId}`,
            enabled: server.enabled,
            configuration: server.configuration,
          });
        }
      }
      return toolSelections;
    }

    // Try to get from database (database operations removed for now)
    this.logger.log(
      `Loading tool configuration for user ${userId}, block ${blockId} from memory`,
    );

    const storedConfig = this.userConfigurations.get(configKey);
    if (storedConfig) {
      // Convert back to tool selections
      const toolSelections: UserToolSelection[] = [];
      for (const server of storedConfig.servers) {
        const serverDef = this.availableServers.get(server.serverId);
        if (!serverDef) continue;

        for (const toolId of server.selectedTools || []) {
          toolSelections.push({
            toolId,
            serverId: server.serverId,
            displayName: `${serverDef.displayName} - ${toolId}`,
            enabled: server.enabled,
            configuration: server.configuration,
          });
        }
      }
      return toolSelections;
    }

    return [];
  }

  /**
   * Prepare MCP servers for execution based on user's tool selections
   */
  async prepareMCPServersForExecution(
    userId: string,
    toolSelections: UserToolSelection[],
  ): Promise<Array<{ serverId: string; tools: string[] }>> {
    const serverGroups = new Map<string, string[]>();

    for (const selection of toolSelections) {
      if (!selection.enabled) continue;

      const serverDef = this.availableServers.get(selection.serverId);
      if (!serverDef) {
        this.logger.warn(
          `Server definition not found for ${selection.serverId}`,
        );
        continue;
      }

      if (!serverGroups.has(selection.serverId)) {
        serverGroups.set(selection.serverId, []);
      }

      serverGroups.get(selection.serverId)!.push(selection.toolId);
    }

    return Array.from(serverGroups.entries()).map(([serverId, tools]) => ({
      serverId,
      tools,
    }));
  }

  /**
   * Validate tool configuration
   */
  validateToolConfiguration(toolSelections: UserToolSelection[]): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    for (const selection of toolSelections) {
      const serverDef = this.availableServers.get(selection.serverId);
      if (!serverDef) {
        errors.push(`Server ${selection.serverId} not found`);
        continue;
      }

      // Validate configuration against server schema
      const configSchema = serverDef.configSchema;
      for (const [key, schema] of Object.entries(configSchema.properties)) {
        if (schema.required && !selection.configuration[key]) {
          errors.push(
            `Required configuration missing: ${key} for server ${selection.serverId}`,
          );
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Get server configuration for a specific server type
   */
  private getServerConfigForType(
    serverType: string,
    toolSelections: UserToolSelection[],
  ) {
    const relevantSelections = toolSelections.filter(
      (s) => s.serverId === serverType,
    );
    if (relevantSelections.length === 0) return null;

    const serverDef = this.availableServers.get(relevantSelections[0].serverId);
    if (!serverDef) return null;

    // Use the first selection's configuration as the base
    const firstTool = this.availableServers.get(relevantSelections[0].serverId);
    if (!firstTool) return null;

    return {
      name: serverDef.displayName,
      command: serverDef.connection.command,
      args: serverDef.connection.args,
      env: relevantSelections[0].configuration,
    };
  }

  /**
   * Initialize available MCP servers
   */
  private initializeAvailableServers(): void {
    // File System MCP Server
    this.availableServers.set('filesystem', {
      id: 'filesystem',
      name: 'filesystem',
      displayName: 'File System',
      description:
        'Access and manipulate files and directories on the filesystem',
      category: 'filesystem',
      icon: '📁',
      connection: {
        type: 'stdio',
        command: 'npx',
        args: ['@modelcontextprotocol/server-filesystem'],
      },
      configSchema: {
        type: 'object',
        properties: {
          allowedDirectories: {
            type: 'string',
            description: 'Base directory path for file operations',
            required: true,
            format: 'path',
          },
          allowWrite: {
            type: 'boolean',
            description: 'Allow write operations',
            default: false,
          },
        },
        required: ['allowedDirectories'],
      },
      examples: [
        {
          name: 'Project Files Access',
          description: 'Access files in a project directory',
          configuration: {
            allowedDirectories: '/home/user/project',
            allowWrite: true,
          },
        },
      ],
    });

    // Web Search MCP Server (Brave Search)
    this.availableServers.set('brave-search', {
      id: 'brave-search',
      name: 'brave-search',
      displayName: 'Brave Search',
      description: 'Search the web using Brave Search API',
      category: 'web',
      icon: '🔍',
      connection: {
        type: 'stdio',
        command: 'npx',
        args: ['@modelcontextprotocol/server-brave-search'],
      },
      configSchema: {
        type: 'object',
        properties: {
          apiKey: {
            type: 'string',
            description: 'Brave Search API key',
            required: true,
            sensitive: true,
          },
        },
        required: ['apiKey'],
      },
      examples: [
        {
          name: 'Web Search',
          description: 'Search for information on the web',
          configuration: {
            apiKey: 'your-brave-api-key',
          },
        },
      ],
    });

    // SQLite Database MCP Server
    this.availableServers.set('sqlite', {
      id: 'sqlite',
      name: 'sqlite',
      displayName: 'SQLite Database',
      description: 'Query and manipulate SQLite databases',
      category: 'database',
      icon: '🗄️',
      connection: {
        type: 'stdio',
        command: 'npx',
        args: ['@modelcontextprotocol/server-sqlite'],
      },
      configSchema: {
        type: 'object',
        properties: {
          dbPath: {
            type: 'string',
            description: 'Path to SQLite database file',
            required: true,
            format: 'path',
          },
        },
        required: ['dbPath'],
      },
      examples: [
        {
          name: 'App Database',
          description: 'Connect to application database',
          configuration: {
            dbPath: '/data/app.db',
          },
        },
      ],
    });

    // Git Repository MCP Server
    this.availableServers.set('git', {
      id: 'git',
      name: 'git',
      displayName: 'Git Repository',
      description: 'Git version control operations',
      category: 'development',
      icon: '🌿',
      connection: {
        type: 'stdio',
        command: 'npx',
        args: ['@modelcontextprotocol/server-git'],
      },
      configSchema: {
        type: 'object',
        properties: {
          repository: {
            type: 'string',
            description: 'Path to git repository',
            required: true,
            format: 'path',
          },
        },
        required: ['repository'],
      },
      examples: [
        {
          name: 'Project Repository',
          description: 'Work with project git repository',
          configuration: {
            repository: '/home/user/project',
          },
        },
      ],
    });

    // Fetch (HTTP) MCP Server
    this.availableServers.set('fetch', {
      id: 'fetch',
      name: 'fetch',
      displayName: 'HTTP Requests',
      description: 'Make HTTP requests to APIs and web services',
      category: 'api',
      icon: '🌐',
      connection: {
        type: 'stdio',
        command: 'npx',
        args: ['@modelcontextprotocol/server-fetch'],
      },
      configSchema: {
        type: 'object',
        properties: {
          userAgent: {
            type: 'string',
            description: 'User agent for requests',
            default: 'Zyra-AI-Agent/1.0',
          },
          timeout: {
            type: 'number',
            description: 'Request timeout in milliseconds',
            default: 30000,
          },
        },
      },
      examples: [
        {
          name: 'API Requests',
          description: 'Make requests to REST APIs',
          configuration: {
            userAgent: 'MyApp/1.0',
            timeout: 15000,
          },
        },
      ],
    });

    // Puppeteer (Web Automation) MCP Server
    this.availableServers.set('puppeteer', {
      id: 'puppeteer',
      name: 'puppeteer',
      displayName: 'Web Automation',
      description: 'Automate web browsers with Puppeteer',
      category: 'automation',
      icon: '🤖',
      connection: {
        type: 'stdio',
        command: 'npx',
        args: ['@modelcontextprotocol/server-puppeteer'],
      },
      configSchema: {
        type: 'object',
        properties: {
          headless: {
            type: 'boolean',
            description: 'Run browser in headless mode',
            default: true,
          },
          viewport: {
            type: 'object',
            description: 'Browser viewport size',
            default: { width: 1280, height: 720 },
          },
        },
      },
      examples: [
        {
          name: 'Web Scraping',
          description: 'Scrape data from websites',
          configuration: {
            headless: true,
            viewport: { width: 1920, height: 1080 },
          },
        },
      ],
    });

    // GOAT (Blockchain) MCP Server
    this.availableServers.set('goat', {
      id: 'goat',
      name: 'goat',
      displayName: 'GOAT Blockchain',
      description:
        'Blockchain operations using GOAT SDK (wallet management, DeFi, NFTs, etc.)',
      category: 'api',
      icon: '🔗',
      connection: {
        type: 'stdio',
        command: 'ts-node',
        args: ['src/workers/handlers/ai-agent/mcps/goat-mcp-server.ts'],
      },
      configSchema: {
        type: 'object',
        properties: {
          WALLET_PRIVATE_KEY: {
            type: 'string',
            description: 'Private key for wallet operations',
            required: true,
            sensitive: true,
          },
          RPC_PROVIDER_URL: {
            type: 'string',
            description: 'RPC provider URL for blockchain connection',
            required: true,
            default: 'https://sepolia.base.org',
          },
        },
        required: ['WALLET_PRIVATE_KEY', 'RPC_PROVIDER_URL'],
      },
      examples: [
        {
          name: 'Base Sepolia Testnet',
          description: 'Connect to Base Sepolia testnet for development',
          configuration: {
            WALLET_PRIVATE_KEY: '0x...',
            RPC_PROVIDER_URL: 'https://sepolia.base.org',
          },
        },
      ],
    });

    this.logger.log(
      `Initialized ${this.availableServers.size} available MCP server connections`,
    );
  }
}
