#!/usr/bin/env node

import { spawn } from "child_process";
import { join } from "path";

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error("Usage: @zyra/ai <command>");
  process.exit(1);
}

const command = args[0];

if (command === "mcp:goat") {
  // Run the GOAT MCP server
  const serverPath = join(
    __dirname,
    "..",
    "src",
    "mcps",
    "goat",
    "goat-mcp-server.ts"
  );

  const child = spawn("ts-node", [serverPath], {
    stdio: "inherit",
    env: {
      ...process.env,
      WALLET_PRIVATE_KEY:
        process.env.WALLET_PRIVATE_KEY ||
        "0x0000000000000000000000000000000000000000000000000000000000000001",
      RPC_PROVIDER_URL:
        process.env.RPC_PROVIDER_URL || "https://sepolia.base.org",
    },
  });

  child.on("error", (error) => {
    console.error("Failed to start GOAT MCP server:", error);
    process.exit(1);
  });

  child.on("exit", (code) => {
    process.exit(code || 0);
  });
} else {
  console.error(`Unknown command: ${command}`);
  console.error("Available commands:");
  console.error("  mcp:goat - Start the GOAT MCP server");
  process.exit(1);
}
