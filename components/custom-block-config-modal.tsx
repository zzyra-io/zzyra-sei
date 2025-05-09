import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { CustomBlockConfig } from "./custom-block-config";
import { toast } from "./ui/use-toast";
import { useWorkflowStore } from "@/lib/store/workflow-store";

// Define the flexible input types that can handle complex configurations
export type BlockInputValue = string | Record<string, unknown> | unknown[];

interface CustomBlockConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodeId?: string; // If editing an existing node
}

export function CustomBlockConfigModal({
  isOpen,
  onClose,
  nodeId,
}: CustomBlockConfigModalProps) {
  const [loading, setLoading] = useState(false);
  const { nodes, updateNode, addNode } = useWorkflowStore();

  // Get the current node data if editing
  const currentNode = nodeId ? nodes.find((n) => n.id === nodeId) : undefined;
  const initialBlockId = currentNode?.data?.customBlockId;
  const initialInputs = currentNode?.data?.inputs || {};

  const handleSave = async (config: {
    customBlockId: string;
    inputs: Record<string, BlockInputValue>;
  }) => {
    try {
      setLoading(true);

      // Get the selected block details from config to display in node
      const { customBlockId, inputs } = config;

      if (nodeId) {
        // Update existing node
        updateNode({
          id: nodeId,
          data: {
            ...currentNode?.data,
            customBlockId,
            inputs,
          },
        });
        toast({
          title: "Node configuration updated",
          description: "The custom block configuration has been updated.",
        });
      } else {
        // Create new node with custom block config
        const newNodeId = `custom-block-${Date.now()}`;
        addNode({
          id: newNodeId,
          type: "customBlock",
          position: { x: 100, y: 100 }, // Default position, will be adjusted by UI
          data: {
            label: "Custom Block", // This could be updated with the actual block name
            customBlockId,
            inputs,
          },
        });
        toast({
          title: "Custom block added",
          description: "The custom block has been added to your workflow.",
        });
      }

      onClose();
    } catch (error) {
      console.error("Failed to save custom block configuration:", error);
      toast({
        title: "Configuration failed",
        description:
          "There was an error saving the custom block configuration.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='sm:max-w-[600px]'>
        <DialogHeader>
          <DialogTitle>
            {nodeId ? "Edit Custom Block" : "Add Custom Block"}
          </DialogTitle>
          <DialogDescription>
            Configure the custom block parameters for your workflow.
          </DialogDescription>
        </DialogHeader>

        <CustomBlockConfig
          onSave={handleSave}
          initialBlockId={initialBlockId}
          initialInputs={initialInputs}
        />

        <DialogFooter className='mt-4'>
          <Button variant='outline' onClick={onClose} disabled={loading}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
