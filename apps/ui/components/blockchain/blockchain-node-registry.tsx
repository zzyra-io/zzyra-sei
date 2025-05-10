"use client";

import { useEffect } from "react";
import { useReactFlow } from "@xyflow/react";
import { useBlockchainNodes } from "./blockchain-node-factory";

interface BlockchainNodeRegistryProps {
  onNodesRegistered?: () => void;
}

/**
 * Component that registers blockchain node types with the React Flow instance
 * This should be included in the workflow builder to enable blockchain nodes
 */
export const BlockchainNodeRegistry = ({ onNodesRegistered }: BlockchainNodeRegistryProps) => {
  const { getNodeTypes } = useBlockchainNodes();
  const { setNodeTypes } = useReactFlow();
  
  useEffect(() => {
    // Register blockchain node types with React Flow
    setNodeTypes((nodeTypes) => ({
      ...nodeTypes,
      ...getNodeTypes(),
    }));
    
    // Notify parent that nodes are registered
    if (onNodesRegistered) {
      onNodesRegistered();
    }
  }, [setNodeTypes, getNodeTypes, onNodesRegistered]);
  
  // This is a utility component that doesn't render anything
  return null;
};

export default BlockchainNodeRegistry;
