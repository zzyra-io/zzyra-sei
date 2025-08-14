export const sequentialThinking = {
  id: "sequential-thinking",
  name: "sequential-thinking",
  displayName: "Sequential Thinking",
  description: "Advanced reasoning with step-by-step thinking process",
  category: "reasoning",
  icon: "🧠",
  connection: {
    type: "stdio",
    command: "npx",
    args: ["@modelcontextprotocol/server-sequential-thinking"],
  },
  configSchema: {
    type: "object",
    properties: {
      maxSteps: {
        type: "number",
        description: "Maximum number of thinking steps",
        default: 10,
      },
      temperature: {
        type: "number",
        description: "Temperature for thinking generation",
        default: 0.3,
      },
    },
  },
  examples: [
    {
      name: "Complex Problem Solving",
      description: "Break down complex problems into logical steps",
      configuration: {
        maxSteps: 15,
        temperature: 0.2,
      },
    },
  ],
};

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
        properties: {
          width: { type: "number", default: 1280 },
          height: { type: "number", default: 720 },
        },
      },
    },
  },
  examples: [
    {
      name: "Web Scraping",
      description: "Extract data from websites",
      configuration: {
        headless: true,
        viewport: { width: 1920, height: 1080 },
      },
    },
  ],
};

// Export all default MCP configurations
export const defaultMCPs = {
  sequentialThinking,
  fetch,
  puppeteer,
};
