/**
 * Wallet providers exports
 *
 * This file exports wagmi connector configurations and adapters.
 * The actual providers are managed by wagmi internally.
 */

// Export wagmi-compatible connectors and configurations
import { mainnet, polygon, optimism, arbitrum } from "wagmi/chains";

// Re-export for centralized access
export { mainnet, polygon, optimism, arbitrum };

/**
 * Export all wallet providers
 */

export * from "./base.provider";
export * from "./magic.provider";
