export const sequentialThinking = {
  id: 'sequential-thinking',
  name: 'sequential-thinking',
  displayName: 'Sequential Thinking',
  description: 'Advanced reasoning with step-by-step thinking process',
  category: 'reasoning',
  icon: '🧠',
  connection: {
    type: 'stdio',
    command: 'npx',
    args: ['@modelcontextprotocol/server-sequential-thinking'],
  },
  configSchema: {
    type: 'object',
    properties: {
      maxSteps: {
        type: 'number',
        description: 'Maximum number of thinking steps',
        default: 10,
      },
      temperature: {
        type: 'number',
        description: 'Temperature for thinking generation',
        default: 0.3,
      },
    },
  },
  examples: [
    {
      name: 'Complex Problem Solving',
      description: 'Break down complex problems into logical steps',
      configuration: {
        maxSteps: 15,
        temperature: 0.2,
      },
    },
  ],
};

export const fetch = {
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
        default: 'Zzyra-AI-Agent/1.0',
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
};
export const puppeteer = {
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
};

export const goat = {
  id: 'goat',
  name: 'goat',
  displayName: 'GOAT Blockchain',
  description:
    'Blockchain operations using GOAT SDK (wallet management, DeFi, NFTs, etc.) - Now supports Sei Network',
  category: 'api',
  icon: '🔗',
  connection: {
    type: 'stdio',
    command: 'ts-node',
    args: ['./src/mcps/goat/goat-mcp-server.ts'],
  },
  configSchema: {
    type: 'object',
    properties: {
      EVM_WALLET_PRIVATE_KEY: {
        type: 'string',
        description: 'Private key for wallet operations',
        required: true,
        sensitive: true,
      },
      RPC_PROVIDER_URL: {
        type: 'string',
        description:
          'RPC provider URL for blockchain operations (optional, defaults to Sei testnet)',
        required: false,
      },
      USE_BASE_SEPOLIA: {
        type: 'string',
        description: 'Set to "true" to use Base Sepolia instead of Sei testnet',
        required: false,
        default: 'false',
      },
    },
    required: ['EVM_WALLET_PRIVATE_KEY'],
  },
  examples: [
    {
      name: 'Sei Testnet Wallet',
      description: 'Connect to Sei testnet (default)',
      configuration: {
        EVM_WALLET_PRIVATE_KEY: '0x...',
        RPC_PROVIDER_URL:
          'https://yolo-sparkling-sea.sei-atlantic.quiknode.pro/aa0487f22e4ebd479a97f9736eb3c0fb8a2b8e32',
      },
    },
    {
      name: 'Base Sepolia Wallet',
      description: 'Connect to Base Sepolia testnet',
      configuration: {
        EVM_WALLET_PRIVATE_KEY: '0x...',
        RPC_PROVIDER_URL: 'https://sepolia.base.org',
        USE_BASE_SEPOLIA: 'true',
      },
    },
  ],
};

export const git = {
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
};

export const braveSearch = {
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
};

export const time = {
  id: 'time',
  name: 'time',
  displayName: 'Time',
  description: 'Get the current time',
  category: 'time',
  icon: '🕒',
  connection: {
    type: 'stdio',
    command: 'npx',
    args: ['-y', 'mcp-server-time', '--local-timezone=America/New_York'],
  },
};

export const weather = {
  id: 'weather',
  name: 'weather',
  displayName: 'Weather',
  description: 'Get the current weather',
  category: 'weather',
  icon: '🌤️',
  connection: {
    type: 'stdio',
    command: 'npx',
    args: ['-y', 'mcp-server-weather'],
  },
};

export const postgres = {
  id: 'postgres',
  name: 'postgres',
  displayName: 'PostgreSQL',
  description: 'PostgreSQL database operations',
  category: 'database',
  icon: '🐘',
  connection: {
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-postgres'],
    // Dynamic argument mapping - config keys that should be passed as command-line args
    argMapping: {
      databaseUrl: 'positional', // Pass as positional argument
    },
  },
  configSchema: {
    type: 'object',
    properties: {
      databaseUrl: {
        type: 'string',
        description: 'PostgreSQL database URL',
        required: true,
      },
    },
    required: ['databaseUrl'],
  },
  examples: [
    {
      name: 'Database Operations',
      description: 'Connect to PostgreSQL database',
      configuration: {
        databaseUrl: 'postgresql://user:password@localhost:5432/database',
      },
    },
  ],
};

const blockScout = {
  id: 'blockScout',
  name: 'blockScout',
  displayName: 'BlockScout',
  description: 'BlockScout database operations',
  category: 'database',
  icon: '🔗',
  connection: {
    type: 'stdio',
    command: 'docker',
    args: [
      'run',
      '--rm',
      '-i',
      'sparfenyuk/mcp-proxy:latest',
      '--transport',
      'streamablehttp',
      'https://mcp.blockscout.com/mcp/',
    ],
  },
};

export const sei = {
  id: 'sei',
  name: 'sei',
  displayName: 'Sei Network',
  description:
    'Local Sei Network MCP Server - blockchain operations, token management, NFT operations, and smart contracts with wallet functionality',
  category: 'blockchain',
  icon: '⚡',
  connection: {
    type: 'stdio',
    command: 'ts-node',
    args: ['./src/mcps/sei/sei-mcp-server.ts'],
    argMapping: {
      WALLET_MODE: 'env',
      PRIVATE_KEY: 'env',
      CUSTOM_RPC_URL: 'env',
      CUSTOM_CHAIN_ID: 'env',
      SEI_NETWORK: 'env',
      SEI_TESTNET_RPC: 'env',
      SEI_TESTNET_CHAIN_ID: 'env',
      SEI_TESTNET_NAME: 'env',
      SEI_TESTNET_NETWORK: 'env',
      SEI_TESTNET_EXPLORER_NAME: 'env',
      SEI_TESTNET_EXPLORER_URL: 'env',
      SEI_MAINNET_RPC: 'env',
    },
  },
  configSchema: {
    type: 'object',
    properties: {
      WALLET_MODE: {
        type: 'string',
        description:
          'Wallet mode: private-key (enables wallet) or disabled (read-only)',
        enum: ['private-key', 'disabled'],
        default: 'private-key',
        required: true,
      },
      PRIVATE_KEY: {
        type: 'string',
        description: 'Private key for wallet operations (use dedicated wallet)',
        required: true,
        sensitive: true,
      },
      CUSTOM_RPC_URL: {
        type: 'string',
        description:
          'Custom RPC URL for Sei Network (optional, uses default endpoints)',
        required: false,
      },
      CUSTOM_CHAIN_ID: {
        type: 'string',
        description:
          'Custom chain ID (optional, uses default: 1329 for mainnet)',
        required: false,
      },
      SEI_NETWORK: {
        type: 'string',
        description: 'Sei network to use: mainnet or testnet',
        enum: ['mainnet', 'testnet'],
        default: 'mainnet',
        required: false,
      },
      SEI_TESTNET_RPC: {
        type: 'string',
        description:
          'Custom RPC URL for Sei testnet (e.g., QuickNode endpoint)',
        required: false,
      },
      SEI_TESTNET_CHAIN_ID: {
        type: 'string',
        description: 'Chain ID for Sei testnet (default: 1328)',
        required: false,
      },
      SEI_TESTNET_NAME: {
        type: 'string',
        description: 'Display name for Sei testnet',
        required: false,
      },
      SEI_TESTNET_NETWORK: {
        type: 'string',
        description: 'Network identifier for Sei testnet (e.g., atlantic-2)',
        required: false,
      },
      SEI_TESTNET_EXPLORER_NAME: {
        type: 'string',
        description: 'Name of the Sei testnet block explorer',
        required: false,
      },
      SEI_TESTNET_EXPLORER_URL: {
        type: 'string',
        description: 'URL of the Sei testnet block explorer',
        required: false,
      },
      SEI_MAINNET_RPC: {
        type: 'string',
        description: 'Custom RPC URL for Sei mainnet',
        required: false,
      },
    },
    required: ['WALLET_MODE', 'PRIVATE_KEY'],
  },
  examples: [
    {
      name: 'Sei Mainnet with Wallet',
      description: 'Full wallet functionality on Sei mainnet',
      configuration: {
        WALLET_MODE: 'private-key',
        PRIVATE_KEY: '0x...',
        SEI_NETWORK: 'mainnet',
      },
    },
    {
      name: 'Sei Atlantic-2 Testnet with Wallet',
      description:
        'Full wallet functionality on Sei atlantic-2 testnet with custom configuration',
      configuration: {
        WALLET_MODE: 'private-key',
        PRIVATE_KEY: '0x...',
        SEI_NETWORK: 'testnet',
        SEI_TESTNET_RPC:
          'https://yolo-sparkling-sea.sei-atlantic.quiknode.pro/aa0487f22e4ebd479a97f9736eb3c0fb8a2b8e32',
        SEI_TESTNET_NETWORK: 'atlantic-2',
        SEI_TESTNET_EXPLORER_URL: 'https://testnet.seistream.app',
      },
    },
    {
      name: 'Sei Read-Only Mode',
      description: 'Read-only blockchain data access',
      configuration: {
        WALLET_MODE: 'disabled',
        PRIVATE_KEY: '0x...',
        SEI_NETWORK: 'mainnet',
      },
    },
  ],
};

// Export all MCP configurations as a single object
export const defaultMCPs = {
  'sequential-thinking': sequentialThinking,
  fetch,
  puppeteer,
  goat,
  sei,
  git,
  'brave-search': braveSearch,
  time,
  weather,
  postgres,
  blockScout,
};
