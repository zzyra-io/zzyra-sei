import { BlockType } from "@zyra/types";
import { ComponentType } from "react";
import { DataTransformConfig } from "@/components/block-configs/data-transform-config";
import { CalculatorConfig } from "@/components/block-configs/calculator-config";
import { ComparatorConfig } from "@/components/block-configs/comparator-config";
import { DatabaseConfig } from "@/components/block-configs/database-config";
import { DelayConfig } from "@/components/block-configs/delay-config";
import { WalletConfig } from "@/components/block-configs/wallet-config";
import { BlockchainReadConfig } from "@/components/block-configs/blockchain-read-config";
import { TransactionConfig } from "@/components/block-configs/transaction-config";
import { TransformConfig } from "@/components/block-configs/transform-config";
import { GoatFinanceConfig } from "@/components/block-configs/goat-finance-config";
import { HttpRequestConfig } from "@/components/block-configs/http-request-config";
import { PriceMonitorConfig } from "@/components/block-configs/price-monitor-config";
import { EmailConfig } from "@/components/block-configs/email-config";
import { NotificationConfig } from "@/components/block-configs/notification-config";
import { ConditionConfig } from "@/components/block-configs/condition-config";
import { ScheduleConfig } from "@/components/block-configs/schedule-config";
import { WebhookConfig } from "@/components/block-configs/webhook-config";

export interface BlockConfigComponentProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  executionStatus?: "idle" | "running" | "success" | "error" | "warning";
  executionData?: {
    startTime?: string;
    endTime?: string;
    duration?: number;
    error?: string;
    lastResponse?: Record<string, unknown>;
  };
  onTest?: () => void;
}

type BlockConfigComponent = ComponentType<BlockConfigComponentProps>;

class BlockConfigRegistry {
  private configs = new Map<BlockType | string, BlockConfigComponent>();

  register(blockType: BlockType | string, component: BlockConfigComponent) {
    this.configs.set(blockType, component);
  }

  get(blockType: BlockType | string): BlockConfigComponent | undefined {
    return this.configs.get(blockType);
  }

  has(blockType: BlockType | string): boolean {
    return this.configs.has(blockType);
  }

  getAllRegisteredTypes(): (BlockType | string)[] {
    return Array.from(this.configs.keys());
  }
}

// Create singleton instance
export const blockConfigRegistry = new BlockConfigRegistry();

// Register the Data Transform config component
blockConfigRegistry.register("DATA_TRANSFORM", DataTransformConfig);

// Register additional config components that don't self-register
blockConfigRegistry.register("CALCULATOR", CalculatorConfig);
blockConfigRegistry.register("COMPARATOR", ComparatorConfig);
blockConfigRegistry.register("DATABASE", DatabaseConfig);
blockConfigRegistry.register("DELAY", DelayConfig);
blockConfigRegistry.register("WALLET", WalletConfig);
blockConfigRegistry.register("BLOCKCHAIN_READ", BlockchainReadConfig);
blockConfigRegistry.register("TRANSACTION", TransactionConfig);
blockConfigRegistry.register("TRANSFORM", TransformConfig);
blockConfigRegistry.register("GOAT_FINANCE", GoatFinanceConfig);
blockConfigRegistry.register("HTTP_REQUEST", HttpRequestConfig);
blockConfigRegistry.register("PRICE_MONITOR", PriceMonitorConfig);
blockConfigRegistry.register("EMAIL", EmailConfig);
blockConfigRegistry.register("NOTIFICATION", NotificationConfig);
blockConfigRegistry.register("CONDITION", ConditionConfig);
blockConfigRegistry.register("SCHEDULE", ScheduleConfig);
blockConfigRegistry.register("WEBHOOK", WebhookConfig);

// Export the registry instance
export default blockConfigRegistry;
