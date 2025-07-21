import { ComponentType } from "react";
import { BlockType } from "@zyra/types";

// Existing block config imports
import { HttpRequestConfig } from "@/components/block-configs/http-request-config";
import { NotificationConfig } from "@/components/block-configs/notification-config";
import { CustomConfig } from "@/components/block-configs/custom-config";

// Sei block config imports
import SeiWalletListenerConfig from "@/components/block-configs/sei/SeiWalletListenerConfig";
import SeiSmartContractCallConfig from "@/components/block-configs/sei/SeiSmartContractCallConfig";
import SeiOnchainDataFetchConfig from "@/components/block-configs/sei/SeiOnchainDataFetchConfig";
import SeiPaymentConfig from "@/components/block-configs/sei/SeiPaymentConfig";
import SeiNftConfig from "@/components/block-configs/sei/SeiNftConfig";

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

// Register existing block components
blockConfigRegistry.register(BlockType.HTTP_REQUEST, HttpRequestConfig);
blockConfigRegistry.register(BlockType.NOTIFICATION, NotificationConfig);
blockConfigRegistry.register(BlockType.CUSTOM, CustomConfig);

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

export { blockConfigRegistry };
export type { BlockConfigComponentType };
