import { ComponentType } from "react";
import { BlockType } from "@zzyra/types";

// Core block config imports
import { HttpRequestConfig } from "@/components/block-configs/http-request-config";
import { NotificationConfig } from "@/components/block-configs/notification-config";
import { CustomConfig } from "@/components/block-configs/custom-config";
import { EmailConfig } from "@/components/block-configs/email-config";
import { PriceMonitorConfig } from "@/components/block-configs/price-monitor-config";
import { ScheduleConfig } from "@/components/block-configs/schedule-config";
import { WebhookConfig } from "@/components/block-configs/webhook-config";
import { DataTransformConfig } from "@/components/block-configs/data-transform-config";
import WalletListenerConfig from "@/components/block-configs/wallet-listen-config";
import { ConditionConfig } from "@/components/block-configs/condition-config";

// AI Agent config import
import { AIAgentConfig } from "@/components/blocks/ai-agent-block";

// Sei block config imports
import SeiWalletListenerConfig from "@/components/block-configs/sei/SeiWalletListenerConfig";
import SeiSmartContractCallConfig from "@/components/block-configs/sei/SeiSmartContractCallConfig";
import SeiOnchainDataFetchConfig from "@/components/block-configs/sei/SeiOnchainDataFetchConfig";
import SeiPaymentConfig from "@/components/block-configs/sei/SeiPaymentConfig";
import SeiNftConfig from "@/components/block-configs/sei/SeiNftConfig";

// Blockchain operation config imports
import { SendTransactionConfig } from "@/components/block-configs/blockchain/send-transaction-config";
import { CheckBalanceConfig } from "@/components/block-configs/blockchain/check-balance-config";
import { SwapTokensConfig } from "@/components/block-configs/blockchain/swap-tokens-config";
import { CreateWalletConfig } from "@/components/block-configs/blockchain/create-wallet-config";

interface BlockConfigComponent {
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

type BlockConfigComponentType = ComponentType<BlockConfigComponent>;

class BlockConfigRegistry {
  private registry = new Map<BlockType, BlockConfigComponentType>();

  register(blockType: BlockType, component: BlockConfigComponentType) {
    this.registry.set(blockType, component);
  }

  get(blockType: BlockType): BlockConfigComponentType | undefined {
    return this.registry.get(blockType);
  }

  getAll(): [BlockType, BlockConfigComponentType][] {
    return Array.from(this.registry.entries());
  }

  has(blockType: BlockType): boolean {
    return this.registry.has(blockType);
  }
}

const blockConfigRegistry = new BlockConfigRegistry();

// Register core block components
blockConfigRegistry.register(BlockType.HTTP_REQUEST, HttpRequestConfig);
blockConfigRegistry.register(BlockType.NOTIFICATION, NotificationConfig);
blockConfigRegistry.register(BlockType.CUSTOM, CustomConfig);
blockConfigRegistry.register(BlockType.EMAIL, EmailConfig);
blockConfigRegistry.register(BlockType.PRICE_MONITOR, PriceMonitorConfig);
blockConfigRegistry.register(BlockType.SCHEDULE, ScheduleConfig);
blockConfigRegistry.register(BlockType.WEBHOOK, WebhookConfig);
blockConfigRegistry.register(BlockType.DATA_TRANSFORM, DataTransformConfig);
blockConfigRegistry.register(BlockType.WALLET_LISTEN, WalletListenerConfig);
blockConfigRegistry.register(BlockType.CONDITION, ConditionConfig);
blockConfigRegistry.register(BlockType.AI_AGENT, AIAgentConfig);

// Register Sei blockchain block components
blockConfigRegistry.register(
  BlockType.SEI_WALLET_LISTEN,
  SeiWalletListenerConfig
);
blockConfigRegistry.register(
  BlockType.SEI_CONTRACT_CALL,
  SeiSmartContractCallConfig
);
blockConfigRegistry.register(
  BlockType.SEI_DATA_FETCH,
  SeiOnchainDataFetchConfig
);
blockConfigRegistry.register(BlockType.SEI_PAYMENT, SeiPaymentConfig);
blockConfigRegistry.register(BlockType.SEI_NFT, SeiNftConfig);

// Register blockchain operation block components
blockConfigRegistry.register(BlockType.SEND_TRANSACTION, SendTransactionConfig);
blockConfigRegistry.register(BlockType.CHECK_BALANCE, CheckBalanceConfig);
blockConfigRegistry.register(BlockType.SWAP_TOKENS, SwapTokensConfig);
blockConfigRegistry.register(BlockType.CREATE_WALLET, CreateWalletConfig);

export { blockConfigRegistry };
export type { BlockConfigComponentType };
