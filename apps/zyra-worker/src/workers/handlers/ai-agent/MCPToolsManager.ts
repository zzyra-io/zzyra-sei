import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../services/database.service';
import { MCPServerManager } from './MCPServerManager';

interface MCPServerConnection {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: 'filesystem' | 'web' | 'database' | 'api' | 'automation' | 'development';
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
    properties: Record<string, {
      type: string;
      description: string;
      required?: boolean;
      default?: any;
      enum?: string[];
      format?: string;
      sensitive?: boolean; // For API keys, passwords
    }>;
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
      return servers.filter(server => server.category === category);
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
      const actualServerId = await this.mcpServerManager.registerServer(
        serverConfig,
        'system', // System connection for tool discovery
      );

      // Get the server instance to discover tools
      const serverInstance = await this.mcpServerManager.getServer(actualServerId);
      if (!serverInstance) {
        throw new Error(`Failed to get server instance ${actualServerId}`);
      }

      // Extract discovered tools
      const discoveredTools: DiscoveredTool[] = serverInstance.tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        serverId: actualServerId,
      }));

      // Cache discovered tools
      this.discoveredTools.set(serverId, discoveredTools);

      this.logger.log(`Discovered ${discoveredTools.length} tools from server ${serverId}`);
      return discoveredTools;
    } catch (error) {
      this.logger.error(`Failed to discover tools from server ${serverId}:`, error);
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
    try {
      const configKey = `${userId}:${blockId}`;
      this.userToolConfigurations.set(configKey, toolSelections);

      // Save to database if available
      try {
        await (this.databaseService.prisma as any).aiAgentToolConfiguration?.upsert({
          where: { userId_blockId: { userId, blockId } },
          create: {
            userId,
            blockId,
            toolSelections: toolSelections as any,
            createdAt: new Date(),
          },
          update: {
            toolSelections: toolSelections as any,
            updatedAt: new Date(),
          },
        });
      } catch (dbError) {
        this.logger.debug('Database not available for tool configuration storage');
      }

      this.logger.log(`Saved tool configuration for user ${userId}, block ${blockId}: ${toolSelections.length} tools`);
    } catch (error) {
      this.logger.error(`Failed to save tool configuration:`, error);
      throw error;
    }
  }

  /**
   * Get user's tool configuration for a block
   */
  async getUserToolConfiguration(
    userId: string,
    blockId: string,
  ): Promise<UserToolSelection[]> {
    try {
      // Try database first
      try {
        const dbConfig = await (this.databaseService.prisma as any).aiAgentToolConfiguration?.findUnique({
          where: { userId_blockId: { userId, blockId } },
        });
        
        if (dbConfig) {
          return dbConfig.toolSelections as UserToolSelection[];
        }
      } catch (dbError) {
        this.logger.debug('Database not available for tool configuration lookup');
      }

      // Fallback to memory
      const configKey = `${userId}:${blockId}`;
      return this.userToolConfigurations.get(configKey) || [];
    } catch (error) {
      this.logger.error(`Failed to get tool configuration for user ${userId}, block ${blockId}:`, error);
      return [];
    }
  }

  /**
   * Prepare MCP servers based on user's tool selections
   * This is called during AI Agent execution to set up only the needed MCP servers
   */
  async prepareMCPServersForExecution(
    userId: string,
    toolSelections: UserToolSelection[],
  ): Promise<Array<{ serverId: string; tools: string[] }>> {
    const serverToolMap = new Map<string, string[]>();
    const preparedServers: Array<{ serverId: string; tools: string[] }> = [];

    try {
      // Group tools by server type
      for (const selection of toolSelections.filter(s => s.enabled)) {
        const toolDef = this.availableTools.get(selection.toolId);
        if (!toolDef) continue;

        if (!serverToolMap.has(toolDef.serverType)) {
          serverToolMap.set(toolDef.serverType, []);
        }
        serverToolMap.get(toolDef.serverType)!.push(toolDef.name);
      }

      // Register MCP servers for each server type needed
      for (const [serverType, tools] of serverToolMap.entries()) {
        const serverConfig = this.getServerConfigForType(serverType, toolSelections);
        
        if (serverConfig) {
          const serverId = await this.mcpServerManager.registerServer(
            serverConfig,
            userId,
          );
          
          preparedServers.push({ serverId, tools });
        }
      }

      this.logger.log(`Prepared ${preparedServers.length} MCP servers for user ${userId}`);
      return preparedServers;
    } catch (error) {
      this.logger.error(`Failed to prepare MCP servers for execution:`, error);
      return [];
    }
  }

  /**
   * Validate tool configuration before saving
   */
  validateToolConfiguration(toolSelections: UserToolSelection[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const selection of toolSelections) {
      const toolDef = this.availableTools.get(selection.toolId);
      if (!toolDef) {
        errors.push(`Tool ${selection.toolId} not found`);
        continue;
      }

      // Validate required parameters
      if (toolDef.inputSchema.required) {
        for (const requiredParam of toolDef.inputSchema.required) {
          if (!selection.configuration[requiredParam] && !selection.customParameters?.[requiredParam]) {
            errors.push(`Required parameter ${requiredParam} missing for tool ${selection.displayName}`);
          }
        }
      }

      // Validate environment variables if needed
      if (toolDef.serverConfig.requiredEnvVars) {
        for (const envVar of toolDef.serverConfig.requiredEnvVars) {
          if (!selection.configuration[envVar]) {
            errors.push(`Required environment variable ${envVar} missing for tool ${selection.displayName}`);
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private getServerConfigForType(serverType: string, toolSelections: UserToolSelection[]) {
    // Find tool selections for this server type to get configuration
    const relevantSelections = toolSelections.filter(s => {
      const toolDef = this.availableTools.get(s.toolId);
      return toolDef?.serverType === serverType && s.enabled;
    });

    if (relevantSelections.length === 0) return null;

    // Get base server config from first tool
    const firstTool = this.availableTools.get(relevantSelections[0].toolId);
    if (!firstTool) return null;

    // Merge configurations from all relevant tool selections
    const mergedEnv = { ...firstTool.serverConfig.env };
    for (const selection of relevantSelections) {
      Object.assign(mergedEnv, selection.configuration);
    }

    return {
      name: `${serverType}-${Date.now()}`,
      command: firstTool.serverConfig.command,
      args: firstTool.serverConfig.args,
      env: mergedEnv,
      description: `MCP server for ${serverType} tools`,
    };
  }

  private initializeAvailableServers(): void {
    // File System MCP Server
    this.availableServers.set('filesystem', {
      id: 'filesystem',
      name: 'filesystem',
      displayName: 'File System',
      description: 'Access and manipulate files and directories on the filesystem',
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

    this.logger.log(`Initialized ${this.availableServers.size} available MCP server connections`);
  }
      displayName: 'Write File',
      description: 'Write content to a file',
      category: 'filesystem',
      icon: '✏️',
      serverType: 'filesystem',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path where to write the file',
            required: true,
          },
          content: {
            type: 'string',
            description: 'Content to write to the file',
            required: true,
          },
        },
        required: ['path', 'content'],
      },
      examples: [
        {
          name: 'Create Text File',
          description: 'Create a new text file',
          parameters: { path: '/path/to/new-file.txt', content: 'Hello World!' },
        },
      ],
      serverConfig: {
        command: 'npx',
        args: ['@modelcontextprotocol/server-filesystem'],
        env: {},
        requiredEnvVars: ['FILESYSTEM_BASE_PATH'],
      },
    });

    // Web Search Tools
    this.availableTools.set('web-search', {
      id: 'web-search',
      name: 'web_search',
      displayName: 'Web Search',
      description: 'Search the web for information',
      category: 'web',
      icon: '🔍',
      serverType: 'web-search',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query',
            required: true,
          },
          count: {
            type: 'number',
            description: 'Number of results to return',
            default: 10,
          },
          offset: {
            type: 'number',
            description: 'Offset for pagination',
            default: 0,
          },
        },
        required: ['query'],
      },
      examples: [
        {
          name: 'Search News',
          description: 'Search for recent news',
          parameters: { query: 'artificial intelligence news', count: 5 },
        },
      ],
      serverConfig: {
        command: 'npx',
        args: ['@modelcontextprotocol/server-brave-search'],
        env: {},
        requiredEnvVars: ['BRAVE_SEARCH_API_KEY'],
      },
    });

    // Database Tools
    this.availableTools.set('sql-query', {
      id: 'sql-query',
      name: 'query',
      displayName: 'SQL Query',
      description: 'Execute SQL queries on a database',
      category: 'database',
      icon: '🗄️',
      serverType: 'sqlite',
      inputSchema: {
        type: 'object',
        properties: {
          sql: {
            type: 'string',
            description: 'SQL query to execute',
            required: true,
          },
        },
        required: ['sql'],
      },
      examples: [
        {
          name: 'Select Users',
          description: 'Get list of users',
          parameters: { sql: 'SELECT * FROM users LIMIT 10' },
        },
      ],
      serverConfig: {
        command: 'npx',
        args: ['@modelcontextprotocol/server-sqlite'],
        env: {},
        requiredEnvVars: ['SQLITE_DB_PATH'],
      },
    });

    // Git Tools
    this.availableTools.set('git-status', {
      id: 'git-status',
      name: 'git_status',
      displayName: 'Git Status',
      description: 'Get git repository status',
      category: 'development',
      icon: '📋',
      serverType: 'git',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      examples: [
        {
          name: 'Check Status',
          description: 'Check git repository status',
          parameters: {},
        },
      ],
      serverConfig: {
        command: 'npx',
        args: ['@modelcontextprotocol/server-git'],
        env: {},
        requiredEnvVars: ['GIT_REPOSITORY_PATH'],
      },
    });

    // HTTP API Tool
    this.availableTools.set('http-request', {
      id: 'http-request',
      name: 'http_request',
      displayName: 'HTTP Request',
      description: 'Make HTTP requests to APIs',
      category: 'api',
      icon: '🌐',
      serverType: 'http',
      inputSchema: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'URL to make request to',
            required: true,
            format: 'uri',
          },
          method: {
            type: 'string',
            description: 'HTTP method',
            default: 'GET',
            enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
          },
          headers: {
            type: 'object',
            description: 'Request headers',
          },
          body: {
            type: 'string',
            description: 'Request body',
          },
        },
        required: ['url'],
      },
      examples: [
        {
          name: 'Get API Data',
          description: 'Fetch data from an API',
          parameters: { url: 'https://api.example.com/data', method: 'GET' },
        },
      ],
      serverConfig: {
        command: 'npx',
        args: ['@modelcontextprotocol/server-fetch'],
        env: {},
      },
    });

    this.logger.log(`Initialized ${this.availableTools.size} available MCP tools for UI configuration`);
  }
}