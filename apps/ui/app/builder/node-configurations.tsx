import { BlockType } from "@/lib/types";
import { useMemo } from "react";
import CustomNode from "@/components/custom-node_improved";
import FloatingEdge from "@/components/custom-edge";
import CustomConnectionLine from "@/components/custom-connection-line";
import { MarkerType } from "@xyflow/react";

export const useNodeConfigurations = () => {
  // Memoize node and edge types for performance
  const nodeTypes = useMemo(() => {
    return Object.fromEntries(
      Object.values(BlockType).map((blockType) => [
        blockType || "custom",
        CustomNode,
      ])
    );
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
