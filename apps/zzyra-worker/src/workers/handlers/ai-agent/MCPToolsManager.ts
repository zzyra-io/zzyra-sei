import { Injectable, Logger } from '@nestjs/common';
import { defaultMCPs } from '@zzyra/types';
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
    | 'development'
    | 'blockchain';
  icon?: string;

  // Connection details to existing MCP server
  connection: {
    type: 'stdio' | 'sse' | 'websocket';
    command?: string; // For stdio connections
    args?: string[];
    url?: string; // For SSE/WebSocket connections
    headers?: Record<string, string>;
    // Dynamic argument mapping for config values
    argMapping?: Record<string, 'positional' | 'flag' | 'env'>;
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
      blockchain: [], // Added for SEI and other blockchain MCP servers
      time: [],
      weather: [],
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

      // Debug logging for SEI MCP server configuration
      if (serverId === 'sei') {
        this.logger.log(`🔧 SEI MCP Server Configuration Debug:`);
        this.logger.log(`User config keys: ${Object.keys(userConfig)}`);
        this.logger.log(
          `Server def argMapping: ${JSON.stringify(serverDef.connection.argMapping)}`,
        );
        this.logger.log(`User config PRIVATE_KEY: ${!!userConfig.PRIVATE_KEY}`);
        this.logger.log(
          `Process env PRIVATE_KEY: ${!!process.env.PRIVATE_KEY}`,
        );
      }

      // Create server configuration with user-provided values
      const args = [...(serverDef.connection.args || [])];
      const env = { ...userConfig };

      // Handle dynamic argument mapping from server definition
      if (serverDef.connection.argMapping) {
        for (const [configKey, mappingType] of Object.entries(
          serverDef.connection.argMapping,
        )) {
          if (userConfig[configKey]) {
            if (mappingType === 'positional') {
              // Pass as positional argument
              args.push(userConfig[configKey]);
            } else if (mappingType === 'flag') {
              // Pass as flag (e.g., --key=value)
              args.push(`--${configKey}=${userConfig[configKey]}`);
            } else if (mappingType === 'env') {
              // Pass as environment variable
              env[configKey] = userConfig[configKey];
            }
          } else {
            // DYNAMIC ENV VAR DISCOVERY - No hardcoded tool-specific logic
            this.logger.log(
              `🔍 Auto-discovering env var: ${configKey} for ${serverId}`,
            );

            // Try exact match first
            if (process.env[configKey]) {
              env[configKey] = process.env[configKey];
              this.logger.log(`✅ Found ${configKey} in process.env`);
            }
            // Smart fallbacks for common patterns
            else if (
              configKey === 'PRIVATE_KEY' &&
              process.env.EVM_WALLET_PRIVATE_KEY
            ) {
              env[configKey] = process.env.EVM_WALLET_PRIVATE_KEY;
              this.logger.log(
                `✅ Mapped EVM_WALLET_PRIVATE_KEY → ${configKey}`,
              );
            } else if (
              configKey === 'WALLET_PRIVATE_KEY' &&
              process.env.EVM_WALLET_PRIVATE_KEY
            ) {
              env[configKey] = process.env.EVM_WALLET_PRIVATE_KEY;
              this.logger.log(
                `✅ Mapped EVM_WALLET_PRIVATE_KEY → ${configKey}`,
              );
            }
          }
        }
      }

      const serverConfig = {
        name: serverDef.displayName,
        command: serverDef.connection.command || '',
        args,
        env,
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
    for (const server of Object.values(defaultMCPs) as MCPServerConnection[]) {
      this.availableServers.set(server.id, server);
    }
    this.logger.log(
      `Initialized ${this.availableServers.size} available MCP server connections`,
    );
  }
}
