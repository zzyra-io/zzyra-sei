// import AgentNode from "@/components/blocks/ai-agent-block";
// import { AgentNodeComponent } from "@/components/blocks/ai-agent-block";
import { AgentNode } from "@/components/blocks/ai-agent-block";
import CustomConnectionLine from "@/components/custom-connection-line";
import FloatingEdge from "@/components/custom-edge";
import CustomNode from "@/components/custom-node_improved";
import { BlockType } from "@/lib/types";
import { MarkerType } from "@xyflow/react";
import { useMemo } from "react";

export const useNodeConfigurations = () => {
  // Memoize node and edge types for performance
  const nodeTypes = useMemo(() => {
    // Custom nodes type based, later merge with normal nodes in object
    const nodes = {
      ...Object.fromEntries(
        Object.values(BlockType).map((blockType) => [blockType, CustomNode])
      ),
      [BlockType.AI_AGENT]: AgentNode,
      [BlockType.CUSTOM]: CustomNode,
      // object
    };

    console.log("nodesMMMPSDS", nodes);
    return nodes;
  }, []);
  //   const edgeTypes = useMemo(() => {
  //     return Object.fromEntries(
  //       Object.values(BlockType).map((blockType) => [blockType, CustomEdge])
  //     );
  //   }, []);

  const edgeTypes = {
    floating: FloatingEdge,
    CUSTOM: FloatingEdge,
  };

  const connectionLineTypes = useMemo(() => {
    return Object.fromEntries(
      Object.values(BlockType).map((blockType) => [
        blockType,
        CustomConnectionLine,
      ])
    );
  }, []);

  const defaultEdgeOptions = {
    type: "CUSTOM",
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: "#b1b1b7",
    },
  };

  return { nodeTypes, edgeTypes, connectionLineTypes, defaultEdgeOptions };
};
