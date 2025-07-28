import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../services/database.service';
import { MCPServerManager } from './MCPServerManager';

interface MCPServerTemplate {
  id: string;
  name: string;
  description: string;
  category: 'development' | 'data' | 'automation' | 'integration' | 'ai' | 'blockchain';
  command: string;
  args: string[];
  env: Record<string, string>;
  requiredPermissions: string[];
  configSchema: Record<string, any>;
  examples: Array<{
    name: string;
    description: string;
    toolCalls: Array<{
      tool: string;
      parameters: Record<string, any>;
    }>;
  }>;
}

interface MCPServerRegistration {
  serverId: string;
  userId: string;
  templateId: string;
  customConfig: Record<string, any>;
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'inactive';
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;
}

/**
 * MCP Server Registry for managing custom MCP server registration and approval
 */
@Injectable()
export class MCPServerRegistry {
  private readonly logger = new Logger(MCPServerRegistry.name);
  private serverTemplates = new Map<string, MCPServerTemplate>();
  private registrations = new Map<string, MCPServerRegistration>();

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly mcpServerManager: MCPServerManager,
  ) {
    this.initializeBuiltinTemplates();
  }

  /**
   * Register a new MCP server template
   */
  async registerServerTemplate(template: MCPServerTemplate): Promise<void> {
    try {
      // Validate template
      this.validateServerTemplate(template);
      
      // Store template
      this.serverTemplates.set(template.id, template);
      
      // Save to database if available
      try {
        await (this.databaseService.prisma as any).mcpServerTemplate?.create({
          data: {
            id: template.id,
            name: template.name,
            description: template.description,
            category: template.category,
            command: template.command,
            args: template.args,
            env: template.env,
            requiredPermissions: template.requiredPermissions,
            configSchema: template.configSchema,
            examples: template.examples,
            isBuiltin: false,
            isActive: true,
          },
        });
      } catch (dbError) {
        this.logger.debug('Database not available for template storage');
      }

      this.logger.log(`Registered MCP server template: ${template.name}`);
    } catch (error) {
      this.logger.error(`Failed to register server template ${template.name}:`, error);
      throw error;
    }
  }

  /**
   * Submit a request to register a custom MCP server
   */
  async submitServerRegistration(
    userId: string,
    templateId: string,
    customConfig: Record<string, any>,
  ): Promise<string> {
    try {
      const template = this.serverTemplates.get(templateId);
      if (!template) {
        throw new Error(`Server template ${templateId} not found`);
      }

      // Validate custom configuration
      this.validateCustomConfig(template, customConfig);

      // Create registration request
      const registrationId = `reg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const registration: MCPServerRegistration = {
        serverId: registrationId,
        userId,
        templateId,
        customConfig,
        status: 'pending',
      };

      this.registrations.set(registrationId, registration);

      // Save to database if available
      try {
        await (this.databaseService.prisma as any).mcpServerRegistration?.create({
          data: {
            id: registrationId,
            userId,
            templateId,
            customConfig,
            status: 'pending',
            submittedAt: new Date(),
          },
        });
      } catch (dbError) {
        this.logger.debug('Database not available for registration storage');
      }

      this.logger.log(`MCP server registration submitted: ${registrationId} by user ${userId}`);
      return registrationId;
    } catch (error) {
      this.logger.error(`Failed to submit server registration:`, error);
      throw error;
    }
  }

  /**
   * Approve a server registration (admin function)
   */
  async approveRegistration(
    registrationId: string,
    approvedBy: string,
  ): Promise<void> {
    try {
      const registration = this.registrations.get(registrationId);
      if (!registration) {
        throw new Error(`Registration ${registrationId} not found`);
      }

      if (registration.status !== 'pending') {
        throw new Error(`Registration ${registrationId} is not pending`);
      }

      const template = this.serverTemplates.get(registration.templateId);
      if (!template) {
        throw new Error(`Template ${registration.templateId} not found`);
      }

      // Create MCP server configuration
      const serverConfig = {
        name: `${template.name}-${registration.userId}`,
        command: template.command,
        args: [...template.args],
        env: { ...template.env, ...registration.customConfig },
        description: template.description,
      };

      // Register the actual MCP server
      const serverId = await this.mcpServerManager.registerServer(
        serverConfig,
        registration.userId,
      );

      // Update registration status
      registration.status = 'approved';
      registration.approvedBy = approvedBy;
      registration.approvedAt = new Date();
      registration.serverId = serverId;

      // Update in database if available
      try {
        await (this.databaseService.prisma as any).mcpServerRegistration?.update({
          where: { id: registrationId },
          data: {
            status: 'approved',
            approvedBy,
            approvedAt: new Date(),
            serverId,
          },
        });
      } catch (dbError) {
        this.logger.debug('Database not available for registration update');
      }

      this.logger.log(`Approved MCP server registration: ${registrationId}`);
    } catch (error) {
      this.logger.error(`Failed to approve registration ${registrationId}:`, error);
      throw error;
    }
  }

  /**
   * Reject a server registration (admin function)
   */
  async rejectRegistration(
    registrationId: string,
    rejectedBy: string,
    reason: string,
  ): Promise<void> {
    try {
      const registration = this.registrations.get(registrationId);
      if (!registration) {
        throw new Error(`Registration ${registrationId} not found`);
      }

      if (registration.status !== 'pending') {
        throw new Error(`Registration ${registrationId} is not pending`);
      }

      // Update registration status
      registration.status = 'rejected';
      registration.rejectionReason = reason;

      // Update in database if available
      try {
        await (this.databaseService.prisma as any).mcpServerRegistration?.update({
          where: { id: registrationId },
          data: {
            status: 'rejected',
            rejectedBy,
            rejectedAt: new Date(),
            rejectionReason: reason,
          },
        });
      } catch (dbError) {
        this.logger.debug('Database not available for registration update');
      }

      this.logger.log(`Rejected MCP server registration: ${registrationId} - ${reason}`);
    } catch (error) {
      this.logger.error(`Failed to reject registration ${registrationId}:`, error);
      throw error;
    }
  }

  /**
   * Get available server templates
   */
  getServerTemplates(category?: string): MCPServerTemplate[] {
    const templates = Array.from(this.serverTemplates.values());
    
    if (category) {
      return templates.filter(template => template.category === category);
    }
    
    return templates;
  }

  /**
   * Get user's server registrations
   */
  async getUserRegistrations(userId: string): Promise<MCPServerRegistration[]> {
    try {
      // Try to get from database first
      try {
        const dbRegistrations = await (this.databaseService.prisma as any).mcpServerRegistration?.findMany({
          where: { userId },
          orderBy: { submittedAt: 'desc' },
        });
        
        if (dbRegistrations) {
          return dbRegistrations;
        }
      } catch (dbError) {
        this.logger.debug('Database not available for registration lookup');
      }

      // Fallback to memory
      return Array.from(this.registrations.values())
        .filter(reg => reg.userId === userId);
    } catch (error) {
      this.logger.error(`Failed to get user registrations for ${userId}:`, error);
      return [];
    }
  }

  /**
   * Get pending registrations (admin function)
   */
  async getPendingRegistrations(): Promise<MCPServerRegistration[]> {
    try {
      // Try to get from database first
      try {
        const dbRegistrations = await (this.databaseService.prisma as any).mcpServerRegistration?.findMany({
          where: { status: 'pending' },
          orderBy: { submittedAt: 'asc' },
        });
        
        if (dbRegistrations) {
          return dbRegistrations;
        }
      } catch (dbError) {
        this.logger.debug('Database not available for pending registrations lookup');
      }

      // Fallback to memory
      return Array.from(this.registrations.values())
        .filter(reg => reg.status === 'pending');
    } catch (error) {
      this.logger.error('Failed to get pending registrations:', error);
      return [];
    }
  }

  private validateServerTemplate(template: MCPServerTemplate): void {
    if (!template.id || !template.name || !template.command) {
      throw new Error('Template must have id, name, and command');
    }

    if (!['development', 'data', 'automation', 'integration', 'ai', 'blockchain'].includes(template.category)) {
      throw new Error('Invalid template category');
    }

    // Validate command is safe (basic checks)
    if (template.command.includes('rm ') || template.command.includes('sudo ')) {
      throw new Error('Template command contains potentially dangerous operations');
    }
  }

  private validateCustomConfig(template: MCPServerTemplate, config: Record<string, any>): void {
    // Validate against config schema if provided
    if (template.configSchema) {
      // Basic validation - in production would use JSON Schema validator
      for (const [key, schema] of Object.entries(template.configSchema)) {
        if ((schema as any).required && !config[key]) {
          throw new Error(`Required configuration ${key} is missing`);
        }
      }
    }

    // Security checks
    for (const [key, value] of Object.entries(config)) {
      if (typeof value === 'string' && (value.includes('rm ') || value.includes('sudo '))) {
        throw new Error(`Configuration ${key} contains potentially dangerous values`);
      }
    }
  }

  private initializeBuiltinTemplates(): void {
    // File System MCP Server
    this.serverTemplates.set('filesystem', {
      id: 'filesystem',
      name: 'File System',
      description: 'Access and manipulate files and directories',
      category: 'development',
      command: 'npx',
      args: ['@modelcontextprotocol/server-filesystem'],
      env: {},
      requiredPermissions: ['FILE_SYSTEM_READ', 'FILE_SYSTEM_WRITE'],
      configSchema: {
        basePath: { type: 'string', required: true, description: 'Base directory path' },
        allowedExtensions: { type: 'array', description: 'Allowed file extensions' },
      },
      examples: [
        {
          name: 'Read File',
          description: 'Read contents of a file',
          toolCalls: [
            {
              tool: 'read_file',
              parameters: { path: '/path/to/file.txt' },
            },
          ],
        },
      ],
    });

    // Git MCP Server
    this.serverTemplates.set('git', {
      id: 'git',
      name: 'Git Repository',
      description: 'Git repository operations and version control',
      category: 'development',
      command: 'npx',
      args: ['@modelcontextprotocol/server-git'],
      env: {},
      requiredPermissions: ['GIT_READ', 'GIT_WRITE'],
      configSchema: {
        repository: { type: 'string', required: true, description: 'Git repository path' },
      },
      examples: [
        {
          name: 'Get Status',
          description: 'Get git repository status',
          toolCalls: [
            {
              tool: 'git_status',
              parameters: {},
            },
          ],
        },
      ],
    });

    // SQLite Database MCP Server
    this.serverTemplates.set('sqlite', {
      id: 'sqlite',
      name: 'SQLite Database',
      description: 'Query and manipulate SQLite databases',
      category: 'data',
      command: 'npx',
      args: ['@modelcontextprotocol/server-sqlite'],
      env: {},
      requiredPermissions: ['DATABASE_READ', 'DATABASE_WRITE'],
      configSchema: {
        dbPath: { type: 'string', required: true, description: 'SQLite database file path' },
      },
      examples: [
        {
          name: 'Query Data',
          description: 'Execute SQL query',
          toolCalls: [
            {
              tool: 'query',
              parameters: { sql: 'SELECT * FROM users LIMIT 10' },
            },
          ],
        },
      ],
    });

    // Web Search MCP Server
    this.serverTemplates.set('web-search', {
      id: 'web-search',
      name: 'Web Search',
      description: 'Search the web and retrieve information',
      category: 'data',
      command: 'npx',
      args: ['@modelcontextprotocol/server-brave-search'],
      env: {},
      requiredPermissions: ['WEB_SEARCH'],
      configSchema: {
        apiKey: { type: 'string', required: true, description: 'Brave Search API key' },
      },
      examples: [
        {
          name: 'Search Web',
          description: 'Search for information on the web',
          toolCalls: [
            {
              tool: 'web_search',
              parameters: { query: 'artificial intelligence news' },
            },
          ],
        },
      ],
    });

    this.logger.log(`Initialized ${this.serverTemplates.size} builtin MCP server templates`);
  }
}