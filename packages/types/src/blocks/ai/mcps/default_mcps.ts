export const fetch = {
  id: "fetch",
  name: "fetch",
  displayName: "HTTP Requests",
  description: "Make HTTP requests to APIs and web services",
  category: "api",
  icon: "🌐",
  connection: {
    type: "stdio",
    command: "npx",
    args: ["@modelcontextprotocol/server-fetch"],
  },
  configSchema: {
    type: "object",
    properties: {
      userAgent: {
        type: "string",
        description: "User agent for requests",
        default: "Zzyra-AI-Agent/1.0",
      },
      timeout: {
        type: "number",
        description: "Request timeout in milliseconds",
        default: 30000,
      },
    },
  },
  examples: [
    {
      name: "API Requests",
      description: "Make requests to REST APIs",
      configuration: {
        userAgent: "MyApp/1.0",
        timeout: 15000,
      },
    },
  ],
};
export const puppeteer = {
  id: "puppeteer",
  name: "puppeteer",
  displayName: "Web Automation",
  description: "Automate web browsers with Puppeteer",
  category: "automation",
  icon: "🤖",
  connection: {
    type: "stdio",
    command: "npx",
    args: ["@modelcontextprotocol/server-puppeteer"],
  },
  configSchema: {
    type: "object",
    properties: {
      headless: {
        type: "boolean",
        description: "Run browser in headless mode",
        default: true,
      },
      viewport: {
        type: "object",
        description: "Browser viewport size",
        default: { width: 1280, height: 720 },
      },
    },
  },
  examples: [
    {
      name: "Web Scraping",
      description: "Scrape data from websites",
      configuration: {
        headless: true,
        viewport: { width: 1920, height: 1080 },
      },
    },
  ],
};

export const goat = {
  id: "goat",
  name: "goat",
  displayName: "GOAT Blockchain",
  description:
    "Blockchain operations using GOAT SDK (wallet management, DeFi, NFTs, etc.)",
  category: "api",
  icon: "🔗",
  connection: {
    type: "stdio",
    command: "ts-node",
    args: ["./src/mcps/goat/goat-mcp-server.ts"],
  },
  configSchema: {
    type: "object",
    properties: {
      WALLET_PRIVATE_KEY: {
        type: "string",
        description: "Private key for wallet operations",
        required: true,
        sensitive: true,
      },
      RPC_PROVIDER_URL: {
        type: "string",
        description: "RPC provider URL for blockchain operations",
        required: true,
      },
    },
    required: ["WALLET_PRIVATE_KEY", "RPC_PROVIDER_URL"],
  },
  examples: [
    {
      name: "Base Sepolia Wallet",
      description: "Connect to Base Sepolia testnet",
      configuration: {
        WALLET_PRIVATE_KEY: "0x...",
        RPC_PROVIDER_URL: "https://sepolia.base.org",
      },
    },
  ],
};

export const git = {
  id: "git",
  name: "git",
  displayName: "Git Repository",
  description: "Git version control operations",
  category: "development",
  icon: "🌿",
  connection: {
    type: "stdio",
    command: "npx",
    args: ["@modelcontextprotocol/server-git"],
  },
  configSchema: {
    type: "object",
    properties: {
      repository: {
        type: "string",
        description: "Path to git repository",
        required: true,
        format: "path",
      },
    },
    required: ["repository"],
  },
  examples: [
    {
      name: "Project Repository",
      description: "Work with project git repository",
      configuration: {
        repository: "/home/user/project",
      },
    },
  ],
};

export const braveSearch = {
  id: "brave-search",
  name: "brave-search",
  displayName: "Brave Search",
  description: "Search the web using Brave Search API",
  category: "web",
  icon: "🔍",
  connection: {
    type: "stdio",
    command: "npx",
    args: ["@modelcontextprotocol/server-brave-search"],
  },
  configSchema: {
    type: "object",
    properties: {
      apiKey: {
        type: "string",
        description: "Brave Search API key",
        required: true,
        sensitive: true,
      },
    },
    required: ["apiKey"],
  },
  examples: [
    {
      name: "Web Search",
      description: "Search for information on the web",
      configuration: {
        apiKey: "your-brave-api-key",
      },
    },
  ],
};

export const time = {
  id: "time",
  name: "time",
  displayName: "Time",
  description: "Get the current time",
  category: "time",
  icon: "🕒",
  connection: {
    type: "stdio",
    command: "npx",
    args: ["-y", "mcp-server-time", "--local-timezone=America/New_York"],
  },
};

export const weather = {
  id: "weather",
  name: "weather",
  displayName: "Weather",
  description: "Get the current weather",
  category: "weather",
  icon: "🌤️",
  connection: {
    type: "stdio",
    command: "npx",
    args: ["-y", "mcp-server-weather"],
  },
};

export const postgres = {
  id: "postgres",
  name: "postgres",
  displayName: "PostgreSQL",
  description: "PostgreSQL database operations",
  category: "database",
  icon: "🐘",
  connection: {
    type: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-postgres"],
    // Dynamic argument mapping - config keys that should be passed as command-line args
    argMapping: {
      databaseUrl: "positional", // Pass as positional argument
    },
  },
  configSchema: {
    type: "object",
    properties: {
      databaseUrl: {
        type: "string",
        description: "PostgreSQL database URL",
        required: true,
      },
    },
    required: ["databaseUrl"],
  },
  examples: [
    {
      name: "Database Operations",
      description: "Connect to PostgreSQL database",
      configuration: {
        databaseUrl: "postgresql://user:password@localhost:5432/database",
      },
    },
  ],
};

export const blockScout = {
  id: "blockScout",
  name: "blockScout",
  displayName: "BlockScout",
  description: "BlockScout database operations",
  category: "database",
  icon: "🔗",
  connection: {
    type: "stdio",
    command: "docker",
    args: [
      "run",
      "--rm",
      "-i",
      "sparfenyuk/mcp-proxy:latest",
      "--transport",
      "streamablehttp",
      "https://mcp.blockscout.com/mcp/",
    ],
  },
};
