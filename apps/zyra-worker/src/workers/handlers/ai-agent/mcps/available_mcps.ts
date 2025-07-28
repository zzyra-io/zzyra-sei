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
    'Blockchain operations using GOAT SDK (wallet management, DeFi, NFTs, etc.)',
  category: 'api',
  icon: '🔗',
  connection: {
    type: 'stdio',
    command: 'ts-node',
  },
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
