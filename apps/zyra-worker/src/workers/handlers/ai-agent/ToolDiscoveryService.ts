import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../services/database.service';
import { CacheService } from './CacheService';
import { ToolAnalyticsService } from './ToolAnalyticsService';
import { GoatPluginManager } from '../goat/GoatPluginManager';

interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  subcategory?: string;
  type: 'mcp' | 'goat' | 'builtin' | 'custom';
  inputSchema: Record<string, any>;
  outputSchema?: Record<string, any>;
  metadata: {
    version: string;
    author?: string;
    documentation?: string;
    examples: ToolExample[];
    tags: string[];
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    reliability: number; // 0-1 score
    performance: {
      avgResponseTime: number;
      successRate: number;
    };
    dependencies: string[];
    limitations: string[];
  };
  connection: {
    command?: string;
    args?: string[];
    env?: Record<string, string>;
    timeout?: number;
    healthCheck?: string;
  };
  availability: {
    platforms: string[];
    requirements: string[];
    supportedModels: string[];
  };
}

interface ToolExample {
  title: string;
  description: string;
  input: Record<string, any>;
  expectedOutput: any;
  useCase: string;
}

enum ToolCategory {
  DATA_ACCESS = 'data_access',
  WEB_SCRAPING = 'web_scraping',
  FILE_SYSTEM = 'file_system',
  DATABASE = 'database',
  API_INTEGRATION = 'api_integration',
  BLOCKCHAIN = 'blockchain',
  AI_ML = 'ai_ml',
  UTILITIES = 'utilities',
  COMMUNICATION = 'communication',
  DEVELOPMENT = 'development',
  ANALYTICS = 'analytics',
  AUTOMATION = 'automation',
  DEFI = 'defi',
  ERC20 = 'erc20',
}

interface ToolDiscoveryQuery {
  category?: ToolCategory;
  tags?: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  searchTerm?: string;
  minReliability?: number;
  supportedModel?: string;
  platform?: string;
  sortBy?: 'popularity' | 'reliability' | 'performance' | 'name';
  limit?: number;
}

interface ToolRecommendationContext {
  userLevel: 'beginner' | 'intermediate' | 'advanced';
  previousTools: string[];
  currentPrompt: string;
  preferredCategories: ToolCategory[];
  performancePreference: 'speed' | 'reliability' | 'features';
}

@Injectable()
export class ToolDiscoveryService {
  private readonly logger = new Logger(ToolDiscoveryService.name);
  private toolRegistry = new Map<string, ToolDefinition>();
  private categoryIndex = new Map<ToolCategory, Set<string>>();
  private tagIndex = new Map<string, Set<string>>();

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly cacheService: CacheService,
    private readonly toolAnalyticsService: ToolAnalyticsService,
    private readonly goatPluginManager: GoatPluginManager,
  ) {
    this.initializeToolRegistry();
  }

  /**
   * Initialize the tool registry with enhanced metadata
   */
  private async initializeToolRegistry(): Promise<void> {
    try {
      this.logger.log('Initializing enhanced tool registry...');

      // Define comprehensive tool catalog
      const toolDefinitions: ToolDefinition[] = [
        {
          id: 'brave-search',
          name: 'Brave Search',
          description:
            'Search the web using Brave Search API for current information and research',
          category: ToolCategory.DATA_ACCESS,
          subcategory: 'web_search',
          type: 'mcp',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search query' },
              count: {
                type: 'number',
                description: 'Number of results (1-20)',
                default: 10,
              },
              offset: {
                type: 'number',
                description: 'Result offset for pagination',
                default: 0,
              },
              freshness: {
                type: 'string',
                enum: ['pd', 'pw', 'pm', 'py'],
                description: 'Freshness filter',
              },
              safesearch: {
                type: 'string',
                enum: ['strict', 'moderate', 'off'],
                default: 'moderate',
              },
            },
            required: ['query'],
          },
          metadata: {
            version: '1.0',
            author: 'Brave Software',
            documentation: 'https://api.search.brave.com/app/documentation',
            examples: [
              {
                title: 'Basic web search',
                description: 'Search for current information about a topic',
                input: { query: 'latest TypeScript features 2024' },
                expectedOutput:
                  'Search results with titles, descriptions, and URLs',
                useCase: 'Research and information gathering',
              },
              {
                title: 'Fresh content search',
                description: 'Find recent news or updates',
                input: { query: 'AI developments', freshness: 'pw', count: 5 },
                expectedOutput: 'Recent articles and news about AI',
                useCase: 'Stay updated with current events',
              },
            ],
            tags: ['search', 'web', 'research', 'current-info'],
            difficulty: 'beginner',
            reliability: 0.9,
            performance: { avgResponseTime: 1200, successRate: 0.95 },
            dependencies: ['BRAVE_API_KEY'],
            limitations: ['Rate limits apply', 'Requires API key'],
          },
          connection: {
            command: 'npx',
            args: ['@modelcontextprotocol/server-brave-search'],
            env: { BRAVE_API_KEY: 'required' },
            timeout: 10000,
          },
          availability: {
            platforms: ['any'],
            requirements: ['Node.js >= 16', 'Brave API key'],
            supportedModels: ['gpt-4', 'claude-3', 'llama-3'],
          },
        },
        {
          id: 'filesystem',
          name: 'File System',
          description:
            'Read, write, and manage files and directories on the local system',
          category: ToolCategory.FILE_SYSTEM,
          type: 'mcp',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'File or directory path' },
              operation: {
                type: 'string',
                enum: ['read', 'write', 'list', 'delete', 'create'],
              },
              content: {
                type: 'string',
                description: 'Content for write operations',
              },
              recursive: {
                type: 'boolean',
                description: 'Recursive operation for directories',
              },
              pattern: {
                type: 'string',
                description: 'File pattern for filtering',
              },
            },
            required: ['path', 'operation'],
          },
          metadata: {
            version: '1.0',
            author: 'ModelContext Protocol',
            documentation: 'https://github.com/modelcontextprotocol/servers',
            examples: [
              {
                title: 'Read file contents',
                description: 'Read the contents of a specific file',
                input: { path: '/path/to/file.txt', operation: 'read' },
                expectedOutput: 'File contents as string',
                useCase: 'Analyze code, configuration, or data files',
              },
              {
                title: 'List directory contents',
                description: 'Get a list of files and directories',
                input: {
                  path: '/path/to/directory',
                  operation: 'list',
                  pattern: '*.js',
                },
                expectedOutput: 'Array of matching files',
                useCase: 'Explore project structure',
              },
            ],
            tags: ['files', 'directories', 'local-storage', 'io'],
            difficulty: 'beginner',
            reliability: 0.95,
            performance: { avgResponseTime: 200, successRate: 0.98 },
            dependencies: ['file system access'],
            limitations: ['Limited by file permissions', 'Local files only'],
          },
          connection: {
            command: 'npx',
            args: ['@modelcontextprotocol/server-filesystem'],
            timeout: 5000,
          },
          availability: {
            platforms: ['linux', 'macos', 'windows'],
            requirements: ['File system access'],
            supportedModels: ['all'],
          },
        },
        {
          id: 'postgres',
          name: 'PostgreSQL Database',
          description: 'Query and interact with PostgreSQL databases using SQL',
          category: ToolCategory.DATABASE,
          type: 'mcp',
          inputSchema: {
            type: 'object',
            properties: {
              sql: { type: 'string', description: 'SQL query to execute' },
              database: { type: 'string', description: 'Database name' },
              timeout: {
                type: 'number',
                description: 'Query timeout in milliseconds',
                default: 30000,
              },
              format: {
                type: 'string',
                enum: ['json', 'csv', 'table'],
                default: 'json',
              },
              limit: {
                type: 'number',
                description: 'Maximum rows to return',
                default: 100,
              },
            },
            required: ['sql'],
          },
          metadata: {
            version: '1.0',
            author: 'ModelContext Protocol',
            documentation: 'https://github.com/modelcontextprotocol/servers',
            examples: [
              {
                title: 'Select data',
                description: 'Query data from a table',
                input: {
                  sql: 'SELECT * FROM users WHERE active = true LIMIT 10',
                },
                expectedOutput: 'JSON array of user records',
                useCase: 'Data analysis and reporting',
              },
              {
                title: 'Schema exploration',
                description: 'Explore database structure',
                input: {
                  sql: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'",
                },
                expectedOutput: 'List of table names',
                useCase: 'Database discovery and documentation',
              },
            ],
            tags: ['database', 'sql', 'postgres', 'data-query'],
            difficulty: 'intermediate',
            reliability: 0.92,
            performance: { avgResponseTime: 800, successRate: 0.94 },
            dependencies: ['PostgreSQL database', 'DATABASE_URL'],
            limitations: [
              'Read-only by default for safety',
              'Connection limits',
            ],
          },
          connection: {
            command: 'npx',
            args: ['@modelcontextprotocol/server-postgres'],
            env: { DATABASE_URL: 'required' },
            timeout: 30000,
          },
          availability: {
            platforms: ['any'],
            requirements: ['PostgreSQL database access', 'Connection string'],
            supportedModels: ['gpt-4', 'claude-3', 'gemini'],
          },
        },
        {
          id: 'git',
          name: 'Git Version Control',
          description:
            'Interact with Git repositories for version control operations',
          category: ToolCategory.DEVELOPMENT,
          subcategory: 'version_control',
          type: 'mcp',
          inputSchema: {
            type: 'object',
            properties: {
              command: {
                type: 'string',
                description: 'Git command to execute',
              },
              repository: { type: 'string', description: 'Repository path' },
              branch: { type: 'string', description: 'Branch name' },
              message: { type: 'string', description: 'Commit message' },
              files: {
                type: 'array',
                items: { type: 'string' },
                description: 'Files to operate on',
              },
            },
            required: ['command'],
          },
          metadata: {
            version: '1.0',
            author: 'ModelContext Protocol',
            documentation: 'https://github.com/modelcontextprotocol/servers',
            examples: [
              {
                title: 'Check repository status',
                description: 'Get current git status',
                input: { command: 'status', repository: '/path/to/repo' },
                expectedOutput: 'Git status information',
                useCase: 'Code review and development workflow',
              },
              {
                title: 'View commit history',
                description: 'Show recent commits',
                input: { command: 'log', repository: '/path/to/repo' },
                expectedOutput: 'Commit history with messages and authors',
                useCase: 'Track changes and collaboration',
              },
            ],
            tags: ['git', 'version-control', 'development', 'collaboration'],
            difficulty: 'intermediate',
            reliability: 0.88,
            performance: { avgResponseTime: 1000, successRate: 0.91 },
            dependencies: ['Git installation', 'Repository access'],
            limitations: [
              'Requires Git installation',
              'Repository permissions needed',
            ],
          },
          connection: {
            command: 'npx',
            args: ['@modelcontextprotocol/server-git'],
            timeout: 15000,
          },
          availability: {
            platforms: ['linux', 'macos', 'windows'],
            requirements: ['Git installed', 'Repository access'],
            supportedModels: ['gpt-4', 'claude-3'],
          },
        },
        {
          id: 'weather',
          name: 'Weather Information',
          description:
            'Get current weather conditions and forecasts for any location',
          category: ToolCategory.DATA_ACCESS,
          subcategory: 'weather',
          type: 'mcp',
          inputSchema: {
            type: 'object',
            properties: {
              location: {
                type: 'string',
                description: 'City, state, or coordinates',
              },
              units: {
                type: 'string',
                enum: ['metric', 'imperial', 'kelvin'],
                default: 'metric',
              },
              forecast: {
                type: 'boolean',
                description: 'Include forecast data',
                default: false,
              },
              days: {
                type: 'number',
                description: 'Number of forecast days',
                default: 5,
              },
            },
            required: ['location'],
          },
          metadata: {
            version: '1.0',
            author: 'Community',
            documentation: 'https://github.com/modelcontextprotocol/servers',
            examples: [
              {
                title: 'Current weather',
                description: 'Get current weather for a city',
                input: { location: 'New York, NY', units: 'imperial' },
                expectedOutput:
                  'Current temperature, conditions, humidity, etc.',
                useCase: 'Weather-aware planning and decision making',
              },
              {
                title: 'Weather forecast',
                description: 'Get extended forecast',
                input: { location: 'London, UK', forecast: true, days: 7 },
                expectedOutput: '7-day weather forecast',
                useCase: 'Trip planning and scheduling',
              },
            ],
            tags: ['weather', 'forecast', 'location', 'conditions'],
            difficulty: 'beginner',
            reliability: 0.85,
            performance: { avgResponseTime: 1500, successRate: 0.89 },
            dependencies: ['Weather API access'],
            limitations: ['API rate limits', 'Location accuracy varies'],
          },
          connection: {
            command: 'npx',
            args: ['-y', 'mcp-server-weather'],
            timeout: 10000,
          },
          availability: {
            platforms: ['any'],
            requirements: ['Internet connection'],
            supportedModels: ['all'],
          },
        },
        {
          id: 'fetch',
          name: 'HTTP Fetch',
          description: 'Make HTTP requests to web APIs and services',
          category: ToolCategory.API_INTEGRATION,
          type: 'mcp',
          inputSchema: {
            type: 'object',
            properties: {
              url: { type: 'string', description: 'URL to fetch' },
              method: {
                type: 'string',
                enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
                default: 'GET',
              },
              headers: { type: 'object', description: 'HTTP headers' },
              body: { type: 'string', description: 'Request body' },
              timeout: {
                type: 'number',
                description: 'Request timeout in milliseconds',
                default: 10000,
              },
            },
            required: ['url'],
          },
          metadata: {
            version: '1.0',
            author: 'ModelContext Protocol',
            documentation: 'https://github.com/modelcontextprotocol/servers',
            examples: [
              {
                title: 'GET request',
                description: 'Fetch data from an API',
                input: { url: 'https://api.example.com/data', method: 'GET' },
                expectedOutput: 'API response data',
                useCase: 'API integration and data retrieval',
              },
              {
                title: 'POST with data',
                description: 'Send data to an API',
                input: {
                  url: 'https://api.example.com/submit',
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: '{"name": "example"}',
                },
                expectedOutput: 'API response confirming submission',
                useCase: 'Data submission and API interactions',
              },
            ],
            tags: ['http', 'api', 'fetch', 'web-requests'],
            difficulty: 'intermediate',
            reliability: 0.87,
            performance: { avgResponseTime: 2000, successRate: 0.9 },
            dependencies: ['Internet connection'],
            limitations: [
              'CORS restrictions',
              'API rate limits',
              'Timeout constraints',
            ],
          },
          connection: {
            command: 'npx',
            args: ['@modelcontextprotocol/server-fetch'],
            timeout: 15000,
          },
          availability: {
            platforms: ['any'],
            requirements: ['Internet connection'],
            supportedModels: ['all'],
          },
        },
        {
          id: 'puppeteer',
          name: 'Web Browser Automation',
          description:
            'Control a headless browser for web scraping and automation',
          category: ToolCategory.WEB_SCRAPING,
          type: 'mcp',
          inputSchema: {
            type: 'object',
            properties: {
              url: { type: 'string', description: 'URL to navigate to' },
              action: {
                type: 'string',
                enum: ['screenshot', 'scrape', 'click', 'type', 'navigate'],
              },
              selector: {
                type: 'string',
                description: 'CSS selector for element interaction',
              },
              text: { type: 'string', description: 'Text to type' },
              waitFor: {
                type: 'number',
                description: 'Time to wait in milliseconds',
              },
              viewport: { type: 'object', description: 'Viewport size' },
            },
            required: ['url', 'action'],
          },
          metadata: {
            version: '1.0',
            author: 'ModelContext Protocol',
            documentation: 'https://github.com/modelcontextprotocol/servers',
            examples: [
              {
                title: 'Take screenshot',
                description: 'Capture a webpage screenshot',
                input: { url: 'https://example.com', action: 'screenshot' },
                expectedOutput: 'Base64 encoded screenshot image',
                useCase: 'Visual testing and documentation',
              },
              {
                title: 'Scrape page content',
                description: 'Extract text content from a webpage',
                input: {
                  url: 'https://example.com',
                  action: 'scrape',
                  selector: 'h1, p',
                },
                expectedOutput: 'Extracted text content',
                useCase: 'Content analysis and data extraction',
              },
            ],
            tags: ['browser', 'automation', 'scraping', 'screenshots'],
            difficulty: 'advanced',
            reliability: 0.82,
            performance: { avgResponseTime: 3000, successRate: 0.85 },
            dependencies: ['Chromium browser', 'Puppeteer'],
            limitations: [
              'Resource intensive',
              'JavaScript execution required',
              'Bot detection',
            ],
          },
          connection: {
            command: 'npx',
            args: ['@modelcontextprotocol/server-puppeteer'],
            timeout: 30000,
          },
          availability: {
            platforms: ['linux', 'macos', 'windows'],
            requirements: ['Chromium/Chrome browser', 'Sufficient memory'],
            supportedModels: ['gpt-4', 'claude-3'],
          },
        },
        {
          id: 'time',
          name: 'Time and Date',
          description:
            'Get current time, dates, and perform time zone conversions',
          category: ToolCategory.UTILITIES,
          subcategory: 'datetime',
          type: 'mcp',
          inputSchema: {
            type: 'object',
            properties: {
              operation: {
                type: 'string',
                enum: ['now', 'convert', 'format', 'calculate'],
              },
              timezone: { type: 'string', description: 'Target timezone' },
              format: { type: 'string', description: 'Date format string' },
              date: { type: 'string', description: 'Date to operate on' },
            },
            required: ['operation'],
          },
          metadata: {
            version: '1.0',
            author: 'Community',
            documentation: 'https://github.com/modelcontextprotocol/servers',
            examples: [
              {
                title: 'Current time',
                description: 'Get current date and time',
                input: { operation: 'now', timezone: 'America/New_York' },
                expectedOutput: 'Current date and time in specified timezone',
                useCase: 'Scheduling and time-aware operations',
              },
              {
                title: 'Time conversion',
                description: 'Convert time between timezones',
                input: {
                  operation: 'convert',
                  date: '2024-01-01 12:00:00',
                  timezone: 'Europe/London',
                },
                expectedOutput: 'Converted time in target timezone',
                useCase: 'International scheduling and coordination',
              },
            ],
            tags: ['time', 'date', 'timezone', 'scheduling'],
            difficulty: 'beginner',
            reliability: 0.98,
            performance: { avgResponseTime: 100, successRate: 0.99 },
            dependencies: [],
            limitations: ['Limited to standard timezone definitions'],
          },
          connection: {
            command: 'npx',
            args: [
              '-y',
              'mcp-server-time',
              '--local-timezone=America/New_York',
            ],
            timeout: 5000,
          },
          availability: {
            platforms: ['any'],
            requirements: [],
            supportedModels: ['all'],
          },
        },
      ];

      // Register all tools
      for (const tool of toolDefinitions) {
        await this.registerTool(tool);
      }

      // Load and register GOAT tools
      await this.loadGoatTools();

      this.logger.log(
        `Initialized ${toolDefinitions.length} MCP tools + GOAT tools in registry`,
      );
    } catch (error) {
      this.logger.error('Failed to initialize tool registry:', error);
    }
  }

  /**
   * Load GOAT SDK tools and register them in the discovery system
   */
  private async loadGoatTools(): Promise<void> {
    try {
      this.logger.log('Loading GOAT SDK tools...');

      const goatTools = await this.goatPluginManager.getToolsForDiscovery();
      let goatToolCount = 0;

      for (const goatTool of goatTools) {
        const toolDefinition: ToolDefinition = {
          id: goatTool.id,
          name: goatTool.name,
          description: goatTool.description,
          category: this.mapGoatCategoryToToolCategory(goatTool.category),
          subcategory: goatTool.category,
          type: 'goat',
          inputSchema: goatTool.inputSchema || {
            type: 'object',
            properties: {},
            description: 'No parameters required',
          },
          metadata: {
            version: '1.0.0',
            author: 'GOAT SDK',
            documentation: 'https://docs.goat.xyz',
            examples: goatTool.examples.map((example) => ({
              title: `${goatTool.name} Example`,
              description: `Example usage of ${goatTool.name}`,
              input: example.input || {},
              expectedOutput: example.output || 'Operation result',
              useCase: goatTool.description,
            })),
            tags: goatTool.capabilities || [goatTool.category],
            difficulty: this.determineToolDifficulty(goatTool),
            reliability: 0.85, // Default reliability for GOAT tools
            performance: {
              avgResponseTime: 2000, // Default average response time
              successRate: 0.9, // Default success rate
            },
            dependencies: ['EVM_WALLET_PRIVATE_KEY'],
            limitations: ['Requires wallet configuration', 'Network-dependent'],
          },
          connection: {
            // GOAT tools are executed directly, no external command needed
            timeout: 30000,
            healthCheck: 'ping',
          },
          availability: {
            platforms: ['any'],
            requirements: ['Wallet private key', 'Network access'],
            supportedModels: ['gpt-4', 'claude-3', 'gpt-3.5-turbo'],
          },
        };

        await this.registerTool(toolDefinition);
        goatToolCount++;
      }

      this.logger.log(`Loaded ${goatToolCount} GOAT SDK tools`);
    } catch (error) {
      this.logger.error('Failed to load GOAT tools:', error);
    }
  }

  /**
   * Map GOAT tool categories to ToolDiscovery categories
   */
  private mapGoatCategoryToToolCategory(goatCategory: string): ToolCategory {
    const categoryMap: { [key: string]: ToolCategory } = {
      analytics: ToolCategory.ANALYTICS,
      defi: ToolCategory.DEFI,
      erc20: ToolCategory.ERC20,
      blockchain: ToolCategory.BLOCKCHAIN,
      wallet: ToolCategory.BLOCKCHAIN,
      transaction: ToolCategory.BLOCKCHAIN,
      token: ToolCategory.ERC20,
      swap: ToolCategory.DEFI,
      liquidity: ToolCategory.DEFI,
      lending: ToolCategory.DEFI,
      utility: ToolCategory.UTILITIES,
    };

    return categoryMap[goatCategory.toLowerCase()] || ToolCategory.BLOCKCHAIN;
  }

  /**
   * Determine tool difficulty based on GOAT tool characteristics
   */
  private determineToolDifficulty(
    goatTool: any,
  ): 'beginner' | 'intermediate' | 'advanced' {
    const name = goatTool.name.toLowerCase();
    const capabilities = goatTool.capabilities || [];

    // Simple operations are beginner-friendly
    if (
      name.includes('balance') ||
      name.includes('address') ||
      name.includes('get_')
    ) {
      return 'beginner';
    }

    // DeFi and complex operations are advanced
    if (
      capabilities.some((cap: string) =>
        ['defi', 'swap', 'liquidity', 'arbitrage', 'lending'].includes(
          cap.toLowerCase(),
        ),
      )
    ) {
      return 'advanced';
    }

    // Everything else is intermediate
    return 'intermediate';
  }

  /**
   * Register a new tool in the discovery system
   */
  async registerTool(tool: ToolDefinition): Promise<void> {
    try {
      // Update with latest analytics
      const analytics = await this.toolAnalyticsService.getToolMetrics(tool.id);
      if (analytics) {
        tool.metadata.performance.avgResponseTime = analytics.avgResponseTime;
        tool.metadata.performance.successRate = analytics.successRate;
        tool.metadata.reliability = analytics.effectiveness;
      }

      // Register in memory
      this.toolRegistry.set(tool.id, tool);

      // Update category index
      if (!this.categoryIndex.has(tool.category)) {
        this.categoryIndex.set(tool.category, new Set());
      }
      this.categoryIndex.get(tool.category)!.add(tool.id);

      // Update tag index
      for (const tag of tool.metadata.tags) {
        if (!this.tagIndex.has(tag)) {
          this.tagIndex.set(tag, new Set());
        }
        this.tagIndex.get(tag)!.add(tool.id);
      }

      // Cache the tool definition
      await this.cacheService.cacheToolResult(
        { toolName: `tool-def:${tool.id}`, parameters: {}, userId: 'system' },
        tool,
        7200, // 2 hours
      );

      this.logger.debug(
        `Registered tool: ${tool.id} in category ${tool.category}`,
      );
    } catch (error) {
      this.logger.error(`Failed to register tool ${tool.id}:`, error);
    }
  }

  /**
   * Discover tools based on query criteria
   */
  async discoverTools(query: ToolDiscoveryQuery): Promise<ToolDefinition[]> {
    try {
      let candidates = Array.from(this.toolRegistry.values());

      // Apply filters
      if (query.category) {
        candidates = candidates.filter(
          (tool) => tool.category === query.category,
        );
      }

      if (query.tags && query.tags.length > 0) {
        candidates = candidates.filter((tool) =>
          query.tags!.some((tag) => tool.metadata.tags.includes(tag)),
        );
      }

      if (query.difficulty) {
        candidates = candidates.filter(
          (tool) => tool.metadata.difficulty === query.difficulty,
        );
      }

      if (query.minReliability !== undefined) {
        candidates = candidates.filter(
          (tool) => tool.metadata.reliability >= query.minReliability!,
        );
      }

      if (query.supportedModel) {
        candidates = candidates.filter(
          (tool) =>
            tool.availability.supportedModels.includes('all') ||
            tool.availability.supportedModels.includes(query.supportedModel!),
        );
      }

      if (query.platform) {
        candidates = candidates.filter(
          (tool) =>
            tool.availability.platforms.includes('any') ||
            tool.availability.platforms.includes(query.platform!),
        );
      }

      // Text search
      if (query.searchTerm) {
        const searchLower = query.searchTerm.toLowerCase();
        candidates = candidates.filter(
          (tool) =>
            tool.name.toLowerCase().includes(searchLower) ||
            tool.description.toLowerCase().includes(searchLower) ||
            tool.metadata.tags.some((tag) =>
              tag.toLowerCase().includes(searchLower),
            ),
        );
      }

      // Sort results
      if (query.sortBy) {
        candidates = this.sortTools(candidates, query.sortBy);
      }

      // Apply limit
      if (query.limit) {
        candidates = candidates.slice(0, query.limit);
      }

      return candidates;
    } catch (error) {
      this.logger.error('Failed to discover tools:', error);
      return [];
    }
  }

  /**
   * Get intelligent tool recommendations based on context
   */
  async getToolRecommendations(context: ToolRecommendationContext): Promise<{
    primary: ToolDefinition[];
    alternative: ToolDefinition[];
    learning: ToolDefinition[];
  }> {
    try {
      // Get analytics-based recommendations
      const analyticsRecommendations =
        await this.toolAnalyticsService.getToolRecommendations({
          prompt: context.currentPrompt,
          systemPrompt: '',
          provider: 'unknown',
          model: 'unknown',
          userId: 'discovery',
          previousTools: context.previousTools,
        });

      // Convert analytics recommendations to tool definitions
      const primaryTools: ToolDefinition[] = [];
      const alternativeTools: ToolDefinition[] = [];

      for (const rec of analyticsRecommendations) {
        const tool = this.toolRegistry.get(rec.toolName);
        if (tool) {
          if (rec.confidence > 0.7) {
            primaryTools.push(tool);
          } else if (rec.confidence > 0.4) {
            alternativeTools.push(tool);
          }
        }
      }

      // Get learning recommendations based on user level
      const learningTools = this.getLearningRecommendations(context);

      return {
        primary: primaryTools.slice(0, 5),
        alternative: alternativeTools.slice(0, 5),
        learning: learningTools.slice(0, 3),
      };
    } catch (error) {
      this.logger.error('Failed to get tool recommendations:', error);
      return { primary: [], alternative: [], learning: [] };
    }
  }

  /**
   * Get detailed tool information including examples and best practices
   */
  async getToolDetails(toolId: string): Promise<{
    tool: ToolDefinition;
    analytics: any;
    recommendations: string[];
    bestPractices: string[];
    troubleshooting: string[];
  } | null> {
    try {
      const tool = this.toolRegistry.get(toolId);
      if (!tool) {
        return null;
      }

      // Get current analytics
      const analytics = await this.toolAnalyticsService.getToolMetrics(toolId);

      // Generate recommendations
      const recommendations = this.generateToolRecommendations(tool, analytics);

      // Best practices
      const bestPractices = this.generateBestPractices(tool);

      // Troubleshooting tips
      const troubleshooting = this.generateTroubleshootingTips(tool, analytics);

      return {
        tool,
        analytics,
        recommendations,
        bestPractices,
        troubleshooting,
      };
    } catch (error) {
      this.logger.error(`Failed to get tool details for ${toolId}:`, error);
      return null;
    }
  }

  /**
   * Get tool categories with counts and descriptions
   */
  getToolCategories(): Array<{
    category: ToolCategory;
    name: string;
    description: string;
    count: number;
    popularTools: string[];
  }> {
    const categoryInfo = [
      {
        category: ToolCategory.DATA_ACCESS,
        name: 'Data Access',
        description: 'Tools for accessing external data sources and APIs',
      },
      {
        category: ToolCategory.WEB_SCRAPING,
        name: 'Web Scraping',
        description:
          'Tools for extracting data from websites and web applications',
      },
      {
        category: ToolCategory.FILE_SYSTEM,
        name: 'File System',
        description:
          'Tools for reading, writing, and managing files and directories',
      },
      {
        category: ToolCategory.DATABASE,
        name: 'Database',
        description: 'Tools for querying and interacting with databases',
      },
      {
        category: ToolCategory.API_INTEGRATION,
        name: 'API Integration',
        description:
          'Tools for making HTTP requests and integrating with web APIs',
      },
      {
        category: ToolCategory.DEVELOPMENT,
        name: 'Development',
        description: 'Tools for software development and version control',
      },
      {
        category: ToolCategory.UTILITIES,
        name: 'Utilities',
        description: 'General-purpose utility tools for common tasks',
      },
    ];

    return categoryInfo.map((info) => {
      const toolIds = this.categoryIndex.get(info.category) || new Set();
      const tools = Array.from(toolIds)
        .map((id) => this.toolRegistry.get(id)!)
        .filter(Boolean);

      return {
        ...info,
        count: toolIds.size,
        popularTools: tools
          .sort((a, b) => b.metadata.reliability - a.metadata.reliability)
          .slice(0, 3)
          .map((t) => t.name),
      };
    });
  }

  /**
   * Validate tool availability and requirements
   */
  async validateToolAvailability(
    toolId: string,
    context: {
      platform: string;
      model: string;
      environment: Record<string, string>;
    },
  ): Promise<{
    available: boolean;
    issues: string[];
    suggestions: string[];
  }> {
    try {
      const tool = this.toolRegistry.get(toolId);
      if (!tool) {
        return {
          available: false,
          issues: ['Tool not found'],
          suggestions: [],
        };
      }

      const issues: string[] = [];
      const suggestions: string[] = [];

      // Check platform compatibility
      if (
        !tool.availability.platforms.includes('any') &&
        !tool.availability.platforms.includes(context.platform)
      ) {
        issues.push(`Tool not supported on platform: ${context.platform}`);
        suggestions.push(
          `Try running on: ${tool.availability.platforms.join(', ')}`,
        );
      }

      // Check model compatibility
      if (
        !tool.availability.supportedModels.includes('all') &&
        !tool.availability.supportedModels.includes(context.model)
      ) {
        issues.push(`Tool not optimized for model: ${context.model}`);
        suggestions.push(
          `Recommended models: ${tool.availability.supportedModels.join(', ')}`,
        );
      }

      // Check environment dependencies
      for (const dep of tool.metadata.dependencies) {
        if (dep.includes('_KEY') || dep.includes('_TOKEN')) {
          const envVar = dep.toUpperCase();
          if (!context.environment[envVar]) {
            issues.push(`Missing required environment variable: ${envVar}`);
            suggestions.push(`Set ${envVar} in your environment configuration`);
          }
        }
      }

      return {
        available: issues.length === 0,
        issues,
        suggestions,
      };
    } catch (error) {
      this.logger.error(
        `Failed to validate tool availability for ${toolId}:`,
        error,
      );
      return {
        available: false,
        issues: ['Validation failed'],
        suggestions: [],
      };
    }
  }

  // Private helper methods
  private sortTools(tools: ToolDefinition[], sortBy: string): ToolDefinition[] {
    switch (sortBy) {
      case 'popularity':
        return tools.sort(
          (a, b) =>
            b.metadata.performance.successRate -
            a.metadata.performance.successRate,
        );
      case 'reliability':
        return tools.sort(
          (a, b) => b.metadata.reliability - a.metadata.reliability,
        );
      case 'performance':
        return tools.sort(
          (a, b) =>
            a.metadata.performance.avgResponseTime -
            b.metadata.performance.avgResponseTime,
        );
      case 'name':
        return tools.sort((a, b) => a.name.localeCompare(b.name));
      default:
        return tools;
    }
  }

  private getLearningRecommendations(
    context: ToolRecommendationContext,
  ): ToolDefinition[] {
    const allTools = Array.from(this.toolRegistry.values());

    // Filter by difficulty level progression
    let targetDifficulty: ('beginner' | 'intermediate' | 'advanced')[];

    switch (context.userLevel) {
      case 'beginner':
        targetDifficulty = ['beginner'];
        break;
      case 'intermediate':
        targetDifficulty = ['beginner', 'intermediate'];
        break;
      case 'advanced':
        targetDifficulty = ['intermediate', 'advanced'];
        break;
    }

    return allTools
      .filter((tool) => targetDifficulty.includes(tool.metadata.difficulty))
      .filter((tool) => !context.previousTools.includes(tool.id))
      .sort((a, b) => b.metadata.reliability - a.metadata.reliability)
      .slice(0, 5);
  }

  private generateToolRecommendations(
    tool: ToolDefinition,
    analytics: any,
  ): string[] {
    const recommendations: string[] = [];

    if (tool.metadata.reliability < 0.8) {
      recommendations.push(
        'Consider using error handling and retries with this tool',
      );
    }

    if (tool.metadata.performance.avgResponseTime > 2000) {
      recommendations.push(
        'This tool may be slow - consider caching results or using timeouts',
      );
    }

    if (tool.metadata.dependencies.length > 0) {
      recommendations.push(
        `Ensure dependencies are available: ${tool.metadata.dependencies.join(', ')}`,
      );
    }

    if (analytics && analytics.errorRate > 0.1) {
      recommendations.push(
        'Review common error patterns and validate inputs carefully',
      );
    }

    return recommendations;
  }

  private generateBestPractices(tool: ToolDefinition): string[] {
    const practices: string[] = [];

    // General best practices based on tool type
    switch (tool.category) {
      case ToolCategory.DATABASE:
        practices.push(
          'Always use parameterized queries to prevent SQL injection',
        );
        practices.push('Limit result sets to avoid memory issues');
        practices.push('Use read-only connections when possible');
        break;
      case ToolCategory.WEB_SCRAPING:
        practices.push('Respect robots.txt and rate limits');
        practices.push('Handle dynamic content loading appropriately');
        practices.push('Use appropriate user agents');
        break;
      case ToolCategory.API_INTEGRATION:
        practices.push('Implement proper error handling for network issues');
        practices.push('Use authentication tokens securely');
        practices.push('Respect API rate limits');
        break;
      case ToolCategory.FILE_SYSTEM:
        practices.push('Validate file paths to prevent directory traversal');
        practices.push('Handle file permissions and access errors gracefully');
        practices.push('Use appropriate file encoding');
        break;
    }

    return practices;
  }

  private generateTroubleshootingTips(
    tool: ToolDefinition,
    analytics: any,
  ): string[] {
    const tips: string[] = [];

    if (analytics && analytics.errorRate > 0.2) {
      tips.push('High error rate - check input validation and error logs');
    }

    if (tool.metadata.performance.avgResponseTime > 5000) {
      tips.push('Slow response time - consider increasing timeout values');
    }

    if (tool.metadata.dependencies.some((dep) => dep.includes('API'))) {
      tips.push(
        'API dependency detected - verify API keys and network connectivity',
      );
    }

    // Tool-specific troubleshooting
    switch (tool.id) {
      case 'brave-search':
        tips.push('If searches fail, verify BRAVE_API_KEY is set correctly');
        tips.push('Check if you have exceeded your API quota');
        break;
      case 'postgres':
        tips.push('Verify DATABASE_URL format and database connectivity');
        tips.push('Check if database user has necessary permissions');
        break;
      case 'puppeteer':
        tips.push(
          'Ensure sufficient memory is available for browser operations',
        );
        tips.push('Check if Chromium/Chrome is properly installed');
        break;
    }

    return tips;
  }
}
