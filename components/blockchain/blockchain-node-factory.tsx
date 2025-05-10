"use client";

import { useCallback } from "react";
import { NodeTypes } from "@xyflow/react";
import { BlockchainNode } from "./blockchain-node";
import { BlockchainNodeType, getBlockchainNodeMetadata } from "@/lib/web3/blockchain-nodes";
import { BlockType, NodeCategory } from "@/types/workflow";

// Define the node types mapping for React Flow
export const getBlockchainNodeTypes = (): NodeTypes => {
  return {
    "blockchain-node": BlockchainNode,
  };
};

// Factory function to create blockchain node data
export const createBlockchainNodeData = (
  nodeType: BlockchainNodeType,
  position = { x: 0, y: 0 },
  id?: string
) => {
  const metadata = getBlockchainNodeMetadata(nodeType);
  
  return {
    id: id || `blockchain-${nodeType}-${Date.now()}`,
    type: "blockchain-node",
    position,
    data: {
      label: metadata.label,
      description: metadata.description,
      blockType: BlockType.CUSTOM,
      category: NodeCategory.FINANCE,
      blockchainNodeType: nodeType,
      config: { ...metadata.defaultConfig },
      inputs: true,
      outputs: true,
      inputCount: 1,
      outputCount: 1,
    },
  };
};

// Hook to use blockchain nodes in the workflow builder
export const useBlockchainNodes = () => {
  // Create a new blockchain node
  const createNode = useCallback((
    nodeType: BlockchainNodeType,
    position = { x: 0, y: 0 },
    id?: string
  ) => {
    return createBlockchainNodeData(nodeType, position, id);
  }, []);
  
  // Update node configuration
  const updateNodeConfig = useCallback((
    nodeId: string,
    config: any,
    nodes: any[],
    setNodes: (nodes: any) => void
  ) => {
    setNodes(
      nodes.map(node => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              config: {
                ...node.data.config,
                ...config,
              },
            },
          };
        }
        return node;
      })
    );
  }, []);
  
  // Get available blockchain node types grouped by category
  const getAvailableNodeTypes = useCallback(() => {
    const transactionNodes = [
      BlockchainNodeType.TRANSACTION_MONITOR,
      BlockchainNodeType.TRANSACTION_VERIFY,
      BlockchainNodeType.TRANSACTION_HISTORY,
    ];
    
    const tokenNodes = [
      BlockchainNodeType.TOKEN_TRANSFER,
      BlockchainNodeType.TOKEN_APPROVAL,
      BlockchainNodeType.TOKEN_BALANCE,
    ];
    
    const contractNodes = [
      BlockchainNodeType.CONTRACT_INTERACTION,
      BlockchainNodeType.CONTRACT_DEPLOY,
      BlockchainNodeType.CONTRACT_VERIFY,
    ];
    
    const defiNodes = [
      BlockchainNodeType.DEFI_SWAP,
      BlockchainNodeType.DEFI_LIQUIDITY,
      BlockchainNodeType.DEFI_YIELD,
    ];
    
    const nftNodes = [
      BlockchainNodeType.NFT_MINT,
      BlockchainNodeType.NFT_TRANSFER,
      BlockchainNodeType.NFT_MARKETPLACE,
    ];
    
    const chainNodes = [
      BlockchainNodeType.CHAIN_MONITOR,
      BlockchainNodeType.CHAIN_SWITCH,
      BlockchainNodeType.GAS_OPTIMIZER,
    ];
    
    return {
      transaction: transactionNodes.map(type => ({
        type,
        metadata: getBlockchainNodeMetadata(type),
      })),
      token: tokenNodes.map(type => ({
        type,
        metadata: getBlockchainNodeMetadata(type),
      })),
      contract: contractNodes.map(type => ({
        type,
        metadata: getBlockchainNodeMetadata(type),
      })),
      defi: defiNodes.map(type => ({
        type,
        metadata: getBlockchainNodeMetadata(type),
      })),
      nft: nftNodes.map(type => ({
        type,
        metadata: getBlockchainNodeMetadata(type),
      })),
      chain: chainNodes.map(type => ({
        type,
        metadata: getBlockchainNodeMetadata(type),
      })),
    };
  }, []);
  
  return {
    createNode,
    updateNodeConfig,
    getAvailableNodeTypes,
    getNodeTypes: getBlockchainNodeTypes,
  };
};

export default useBlockchainNodes;
