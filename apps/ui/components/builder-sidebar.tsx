"use client";

import { BlockCatalog } from "@/components/block-catalog";
import { BlockSimulator } from "@/components/block-simulator";
import {
  generateAiBlock,
  validateAiBlockForm,
} from "@/components/builder-sidebar-ai-handler";
import { CustomBlockBuilderDialog } from "@/components/custom-block-builder-dialog";
import { CustomBlockCatalog } from "@/components/custom-block-catalog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { saveBlock } from "@/lib/block-library-api";
import { cn } from "@/lib/utils";
import type { CustomBlockDefinition } from "@zyra/types";
import { BlockType, NodeCategory } from "@zyra/types";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  BarChart3,
  Blocks,
  Box,
  Calendar,
  ChevronRight,
  Clock,
  LayoutDashboard,
  Library,
  Loader2,
  PlusCircle,
  PuzzleIcon as PuzzlePiece,
  Save,
  Settings,
  Sparkles,
  Terminal,
  Workflow,
} from "lucide-react";
import { useRouter } from "next/navigation";
import React, { DragEvent, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

// Define scrollbar styles for consistency

// import { AIBlockForm } from "./builders/ai-block-form";
import { CustomBlockConfigModal } from "./custom-block-config-modal";

interface BuilderSidebarProps {
  onAddNode: (
    blockType: BlockType,
    position?: { x: number; y: number }
  ) => void;
  onAddCustomBlock?: (
    customBlock: CustomBlockDefinition,
    position?: { x: number; y: number }
  ) => void;
  onGenerateCustomBlock?: (prompt: string) => Promise<void>;
  workflowName: string;
  workflowDescription: string;
  onWorkflowDetailsChange: (details: {
    name?: string;
    description?: string;
  }) => void;
  nodes: Node[];
  selectedNode?: Node | null;
  onNodeSelect?: (node: Node | null) => void;
  onNodeUpdate?: (nodeId: string, updates: any) => void;
}

// Form schema for saving a block to the library
const saveBlockSchema = z.object({
  name: z
    .string()
    .min(3, {
      message: "Block name must be at least 3 characters.",
    })
    .max(50, {
      message: "Block name must not exceed 50 characters.",
    }),
  description: z
    .string()
    .min(10, {
      message: "Description must be at least 10 characters.",
    })
    .max(200, {
      message: "Description must not exceed 200 characters.",
    }),
  isPublic: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
});

export function BuilderSidebar({
  onAddNode,
  onAddCustomBlock,
  onGenerateCustomBlock,
  workflowName,
  workflowDescription,
  onWorkflowDetailsChange,
  nodes,
  selectedNode,
  onNodeSelect,
  onNodeUpdate,
}: BuilderSidebarProps) {
  const [mainTab, setMainTab] = useState("blocks");
  const [blockCatalogTab, setBlockCatalogTab] = useState("blocks");
  const isMobile = useIsMobile();
  const [isMobileCollapsed, setIsMobileCollapsed] = useState(isMobile);

  // Custom block config modal state
  const [isCustomBlockModalOpen, setIsCustomBlockModalOpen] = useState(false);
  const [selectedNodeForEdit, setSelectedNodeForEdit] = useState<
    string | undefined
  >(undefined);

  // Handler for opening custom block config modal
  const handleOpenCustomBlockModal = (nodeId?: string) => {
    if (nodeId) {
      setSelectedNodeForEdit(nodeId);
    } else {
      setSelectedNodeForEdit(undefined);
    }
    setIsCustomBlockModalOpen(true);
  };

  // Handler for closing custom block config modal
  const handleCloseCustomBlockModal = () => {
    setIsCustomBlockModalOpen(false);
    setSelectedNodeForEdit(undefined);
  };
  const router = useRouter();
  const { toast } = useToast();
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [currentTag, setCurrentTag] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedCustomBlock, setSelectedCustomBlock] =
    useState<CustomBlockDefinition | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creationMethod, setCreationMethod] = useState<
    "ai" | "manual" | "simulation" | null
  >(null);
  const [simulatedBlock, setSimulatedBlock] =
    useState<CustomBlockDefinition | null>(null);
  const [isGeneratingBlock, setIsGeneratingBlock] = useState(false);

  // Form state for AI block generation
  const [aiBlockForm, setAiBlockForm] = useState({
    blockName: "",
    blockDescription: "",
    blockInputs: "",
    blockOutputs: "",
    blockCategory: "ACTION",
  });

  const handleAiFormChange = (field: string, value: string) => {
    setAiBlockForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Handle AI Block submission and generation
  const handleAiBlockSubmit = async () => {
    // Validate the form using the enhanced validation function
    const validationResult = validateAiBlockForm(aiBlockForm);
    if (!validationResult.valid) {
      toast({
        title: "Invalid AI Block Form",
        description:
          validationResult.error || "Please check your inputs and try again",
        variant: "destructive",
      });
      return;
    }

    // Show loading state
    setIsGeneratingBlock(true);

    try {
      // First try to use the AI service
      let generatedBlock;

      try {
        // Call the AI service to generate the block
        const response = await fetch("/api/ai/generate-block", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(aiBlockForm),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || "Failed to generate block with AI"
          );
        }

        // Parse the AI-generated block
        generatedBlock = await response.json();
        console.log("AI-generated block:", generatedBlock);
      } catch (aiError) {
        // If the AI service fails, fall back to local generation
        console.warn(
          "AI service failed, falling back to template generation:",
          aiError
        );
        generatedBlock = generateAiBlock(aiBlockForm);
      }

      // Update state with the generated block
      setSimulatedBlock(generatedBlock);
      setCreationMethod("simulation");

      toast({
        title: "Block Generated Successfully",
        description:
          "Your custom block is ready for simulation. Try it out and make adjustments as needed.",
        variant: "default",
      });
    } catch (error) {
      console.error("Error generating block:", error);
      toast({
        title: "Block Generation Failed",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred during block generation.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingBlock(false);
    }
  };

  useEffect(() => {
    const handleResize = () => {
      if (isMobile) {
        setIsMobileCollapsed(true);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isMobile]);
  // Handle drag start from the catalog
  const handleDragStart = (
    event: DragEvent<Element>,
    blockType: BlockType,
    blockData: Record<string, unknown>
  ) => {
    console.log("Drag started:", blockType, blockData);

    // Set the block type for the drop handler
    event.dataTransfer.setData("application/reactflow/type", blockType);

    // Add additional metadata for node creation
    const metadata = JSON.stringify({
      blockType,
      label: blockData.label || blockType,
      nodeType: blockData.nodeType || NodeCategory.ACTION,
      description: blockData.description || "",
      ...blockData,
    });

    event.dataTransfer.setData("application/reactflow/metadata", metadata);
    event.dataTransfer.effectAllowed = "move";
  };

  // Handle drag start for custom blocks
  const handleCustomBlockDragStart = (
    event: DragEvent<Element>,
    customBlock: CustomBlockDefinition
  ) => {
    console.log("Custom block drag started:", customBlock);
  };

  // Calculate some example stats
  const executionTime =
    nodes.length > 0 ? `${(nodes.length * 0.5).toFixed(1)}s` : "N/A";
  const lastUpdated = new Date().toLocaleDateString();

  return (
    <div className='relative'>
      <div
        className={cn(
          "flex h-full flex-col overflow-hidden bg-muted/5 border-r w-full",
          isMobile ? (isMobileCollapsed ? "hidden" : "block") : "block"
        )}>
        {/* Custom Block Configuration Modal */}
        <CustomBlockConfigModal
          isOpen={isCustomBlockModalOpen}
          onClose={handleCloseCustomBlockModal}
          nodeId={selectedNodeForEdit}
        />

        {isMobile && (
          <button
            onClick={() => setIsMobileCollapsed(!isMobileCollapsed)}
            className='fixed bottom-4 right-4 z-50 bg-primary text-primary-foreground p-3 rounded-full shadow-lg'>
            {isMobileCollapsed ? (
              <ChevronRight className='h-5 w-5' />
            ) : (
              <ChevronRight className='h-5 w-5 rotate-180' />
            )}
          </button>
        )}
        {/* Sidebar Header */}
        <div className='p-4 border-b bg-muted/30'>
          <div className='flex items-center gap-2 mb-1'>
            <Workflow className='h-5 w-5 text-primary' />
            <h2 className='font-semibold text-lg'>Workflow Builder</h2>
          </div>
          <p className='text-xs text-muted-foreground'>
            Design and configure your automation workflow
          </p>
        </div>

        {/* Main Tabs */}
        <div className='border-b'>
          <Tabs value={mainTab} onValueChange={setMainTab} className='w-full'>
            <TabsList className='w-full h-12 flex-wrap'>
              <TabsTrigger
                value='blocks'
                className='flex-1 flex items-center gap-2'>
                <Blocks className='h-4 w-4' />
                <span>Blocks</span>
              </TabsTrigger>
              <TabsTrigger
                value='settings'
                className='flex-1 flex items-center gap-2'>
                <Settings className='h-4 w-4' />
                <span>Settings</span>
              </TabsTrigger>
              <TabsTrigger
                value='stats'
                className='flex-1 flex items-center gap-2'>
                <BarChart3 className='h-4 w-4' />
                <span>Stats</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Additional quick action buttons */}
        <div className='border-b p-2 flex items-center justify-between'>
          <Button
            variant='outline'
            size='sm'
            className='flex items-center gap-1'
            onClick={() => router.push("/blocks/library")}>
            <Library className='h-3.5 w-3.5' />
            <span className='text-xs'>Block Library</span>
          </Button>

          <Button
            variant='outline'
            size='sm'
            className='flex items-center gap-1'
            onClick={() => setCreateModalOpen(true)}>
            <PlusCircle className='h-3.5 w-3.5' />
            <span className='text-xs'>Create Block</span>
          </Button>
        </div>

        {/* Create Custom Block Modal */}
        <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
          <DialogContent className='sm:max-w-[600px]'>
            <DialogHeader>
              <DialogTitle>Create Custom Block</DialogTitle>
              <DialogDescription>
                Design your own custom block with inputs, outputs, and logic.
              </DialogDescription>
            </DialogHeader>

            {creationMethod === null ? (
              <div className='grid grid-cols-2 gap-4 py-4'>
                <Card
                  className='cursor-pointer hover:border-primary transition-colors'
                  onClick={() => setCreationMethod("ai")}>
                  <CardContent className='p-6 flex flex-col items-center justify-center text-center'>
                    <Sparkles className='h-8 w-8 text-primary mb-3' />
                    <h3 className='font-semibold mb-1'>Use AI</h3>
                    <p className='text-sm text-muted-foreground'>
                      Let AI help you create a complete custom block based on
                      your description.
                    </p>
                  </CardContent>
                </Card>

                <Card
                  className='cursor-pointer hover:border-primary transition-colors'
                  onClick={() => setCreationMethod("manual")}>
                  <CardContent className='p-6 flex flex-col items-center justify-center text-center'>
                    <Terminal className='h-8 w-8 text-primary mb-3' />
                    <h3 className='font-semibold mb-1'>Create Manually</h3>
                    <p className='text-sm text-muted-foreground'>
                      Define your block inputs, outputs, and logic yourself.
                    </p>
                  </CardContent>
                </Card>
              </div>
            ) : creationMethod === "manual" ? (
              <div className='border rounded-md overflow-hidden'>
                <CustomBlockBuilderDialog
                  open={true}
                  onOpenChange={() => {
                    setCreateModalOpen(false);
                    setCreationMethod(null);
                  }}
                  initialBlock={undefined}
                  inline={true}
                  onSave={(block) => {
                    // Add the new block to custom blocks
                    if (onAddCustomBlock) {
                      // Create position slightly offset from center of viewport
                      const viewportWidth =
                        window.innerWidth ||
                        document.documentElement.clientWidth;
                      const viewportHeight =
                        window.innerHeight ||
                        document.documentElement.clientHeight;
                      const position = {
                        x: Math.round(viewportWidth / 2) + 100,
                        y: Math.round(viewportHeight / 2) + 100,
                      };
                      onAddCustomBlock(block, position);

                      toast({
                        title: "Block Created",
                        description: `${block.name} has been created and added to your custom blocks.`,
                      });

                      setCreateModalOpen(false);
                      setCreationMethod(null);
                      // Switch to custom tab to see the new block
                      setBlockCatalogTab("custom");
                    }
                  }}
                  onGenerateWithAI={onGenerateCustomBlock}
                />
              </div>
            ) : creationMethod === "simulation" && simulatedBlock ? (
              <div className='py-4'>
                <BlockSimulator
                  block={simulatedBlock}
                  onClose={() => {
                    setCreationMethod("manual");
                  }}
                  onFinalize={(finalizedBlock) => {
                    // Handle the finalized block
                    if (onAddCustomBlock) {
                      // Create position slightly offset from center of viewport
                      const viewportWidth =
                        window.innerWidth ||
                        document.documentElement.clientWidth;
                      const viewportHeight =
                        window.innerHeight ||
                        document.documentElement.clientHeight;
                      const position = {
                        x: Math.round(viewportWidth / 2) + 100,
                        y: Math.round(viewportHeight / 2) + 100,
                      };

                      // Add the custom block to the workflow
                      onAddCustomBlock(finalizedBlock, position);

                      // Save the block to the library
                      saveBlock({
                        blockData: {
                          name: finalizedBlock.name,
                          description: finalizedBlock.description,
                          category: finalizedBlock.category,
                          inputs: finalizedBlock.inputs.map((input) => ({
                            name: input.name,
                            description: input.description || "",
                            dataType: input.dataType,
                            required: input.required,
                          })),
                          outputs: finalizedBlock.outputs.map((output) => ({
                            name: output.name,
                            description: output.description || "",
                            dataType: output.dataType,
                            required: output.required,
                          })),
                          configFields: finalizedBlock.configFields || [],
                          code: finalizedBlock.logic,
                        },
                        blockType: "CUSTOM" as BlockType,
                        isPublic: false,
                        tags: [],
                      })
                        .then(() => {
                          console.log("Block saved to library");
                          // Reset UI state after successful save
                          setSimulatedBlock(null);
                          setCreationMethod(null);
                          // Switch to custom tab to see the new block
                          setBlockCatalogTab("custom");
                        })
                        .catch((error) => {
                          console.error(
                            "Error saving block to library:",
                            error
                          );
                          toast({
                            title: "Error Saving Block",
                            description:
                              "The block was added to your workflow but could not be saved to your library.",
                            variant: "destructive",
                          });
                          // Still reset UI state even on error
                          setSimulatedBlock(null);
                          setCreationMethod(null);
                        });

                      toast({
                        title: "Block Created",
                        description: `${finalizedBlock.name} has been created and added to your custom blocks.`,
                      });

                      setCreateModalOpen(false);
                      setCreationMethod(null);
                      setSimulatedBlock(null);
                      // Switch to custom tab to see the new block
                      setBlockCatalogTab("custom");
                    }
                  }}
                />
              </div>
            ) : (
              <div className='py-4'>
                <h3 className='text-sm font-medium mb-3'>
                  Describe Your Block
                </h3>
                <p className='text-xs text-muted-foreground mb-4'>
                  Describe the purpose of your custom block, what it should do,
                  and any specific inputs or outputs it should have. Our AI will
                  generate a complete block for you to review and modify.
                </p>

                {/* AI Block Generation Form */}
                <div className='space-y-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='block-name'>Block Name</Label>
                    <Input
                      id='block-name'
                      placeholder='E.g., Twitter Sentiment Analysis'
                      value={aiBlockForm.blockName}
                      onChange={(e) =>
                        handleAiFormChange("blockName", e.target.value)
                      }
                    />
                    <p className='text-xs text-muted-foreground'>
                      Give your block a clear, descriptive name
                    </p>
                  </div>

                  <div className='space-y-2'>
                    <Label htmlFor='block-description'>Description</Label>
                    <Textarea
                      id='block-description'
                      placeholder='Describe what this block should do. Example: This block should analyze the sentiment of tweets mentioning a specific keyword.'
                      rows={4}
                      value={aiBlockForm.blockDescription}
                      onChange={(e) =>
                        handleAiFormChange("blockDescription", e.target.value)
                      }
                    />
                  </div>

                  <div className='space-y-2'>
                    <Label htmlFor='block-inputs'>Inputs (optional)</Label>
                    <Textarea
                      id='block-inputs'
                      placeholder='Describe the inputs your block needs. Example: Keyword to search, Number of tweets to analyze'
                      rows={3}
                      value={aiBlockForm.blockInputs}
                      onChange={(e) =>
                        handleAiFormChange("blockInputs", e.target.value)
                      }
                    />
                  </div>

                  <div className='space-y-2'>
                    <Label htmlFor='block-outputs'>Outputs (optional)</Label>
                    <Textarea
                      id='block-outputs'
                      placeholder='Describe the outputs your block should produce. Example: Sentiment score, Top positive/negative words'
                      rows={3}
                      value={aiBlockForm.blockOutputs}
                      onChange={(e) =>
                        handleAiFormChange("blockOutputs", e.target.value)
                      }
                    />
                  </div>

                  <div className='space-y-2'>
                    <Label htmlFor='block-category'>Category (optional)</Label>
                    <Select
                      value={aiBlockForm.blockCategory}
                      onValueChange={(value) =>
                        handleAiFormChange("blockCategory", value)
                      }>
                      <SelectTrigger id='block-category'>
                        <SelectValue placeholder='Select a category' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='ACTION'>Action</SelectItem>
                        <SelectItem value='TRIGGER'>Trigger</SelectItem>
                        <SelectItem value='CONDITION'>Condition</SelectItem>
                        <SelectItem value='TRANSFORMER'>Transformer</SelectItem>
                        <SelectItem value='FINANCE'>Finance</SelectItem>
                        <SelectItem value='AI'>AI</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className='flex justify-end space-x-2 mt-6'>
                  <Button
                    variant='outline'
                    onClick={() => setCreationMethod(null)}
                    disabled={isGeneratingBlock}>
                    Back
                  </Button>
                  <Button
                    onClick={handleAiBlockSubmit}
                    disabled={isGeneratingBlock}>
                    {isGeneratingBlock ? (
                      <>
                        <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className='h-4 w-4 mr-2' />
                        Generate Block
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {creationMethod === null && (
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant='outline'>Cancel</Button>
                </DialogClose>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>

        {/* Tab Content */}
        <div className='flex-1 overflow-hidden'>
          {mainTab === "blocks" && (
            <div className='flex flex-col h-full'>
              <div className='p-4 border-b'>
                <div className='flex items-center gap-2 mb-3'>
                  <PuzzlePiece className='h-4 w-4 text-primary' />
                  <h3 className='font-medium'>Block Catalog</h3>
                </div>

                <Tabs
                  defaultValue='blocks'
                  value={blockCatalogTab}
                  onValueChange={setBlockCatalogTab}>
                  <TabsList className='grid w-full grid-cols-2'>
                    <TabsTrigger value='blocks'>Blocks</TabsTrigger>
                    <TabsTrigger value='custom'>Custom</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className='flex-1 overflow-hidden'>
                {blockCatalogTab === "blocks" && (
                  <ScrollArea className='h-[calc(100vh-200px)]'>
                    <div className='p-4 pt-2'>
                      <div className='text-xs text-muted-foreground mb-3 flex items-center'>
                        <ChevronRight className='h-3 w-3 mr-1' />
                        <span>Drag blocks to the canvas or click to add</span>
                      </div>
                      <BlockCatalog
                        onDragStart={handleDragStart}
                        onAddBlock={onAddNode}
                      />
                    </div>
                  </ScrollArea>
                )}

                {blockCatalogTab === "custom" && (
                  <div className='p-4 pt-2'>
                    <div className='flex items-center mb-3'>
                      <ChevronRight className='h-3 w-3 mr-1' />
                      <span className='text-xs text-muted-foreground'>
                        Custom blocks for your workflow
                      </span>
                    </div>

                    <div className='flex flex-col gap-2 mb-3'>
                      <div className='flex space-x-2'>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => {
                            if (selectedNode?.data?.customBlock) {
                              setSelectedCustomBlock(
                                selectedNode.data.customBlock
                              );
                              setSaveDialogOpen(true);
                            } else {
                              toast({
                                title: "No custom block selected",
                                description:
                                  "Please select a custom block to save to the library.",
                              });
                            }
                          }}
                          disabled={!selectedNode?.data?.customBlock}>
                          <Save className='h-3.5 w-3.5 mr-1' />
                          Save to Library
                        </Button>
                        <Button
                          variant='secondary'
                          size='sm'
                          onClick={() => setCreateModalOpen(true)}>
                          <PlusCircle className='h-3.5 w-3.5 mr-1' />
                          New Block
                        </Button>
                        <Button
                          variant='secondary'
                          size='sm'
                          onClick={() => handleOpenCustomBlockModal()}>
                          <Box className='h-3.5 w-3.5 mr-1' />
                          Configure Block
                        </Button>
                      </div>
                      <p className='text-xs text-muted-foreground'>
                        Select a custom block on the canvas to save it to your
                        personal library
                      </p>
                    </div>
                    <ScrollArea className='h-[calc(100vh-200px)]'>
                      <CustomBlockCatalog
                        onAddBlock={(block, position) => {
                          if (onAddCustomBlock) {
                            // Type assertion to ensure compatibility with CustomBlockDefinition
                            onAddCustomBlock(
                              block as CustomBlockDefinition,
                              position
                            );
                          }
                          // Make sure customBlock has required properties
                          const customBlock = block.data?.customBlock;
                          if (customBlock) {
                            setSelectedCustomBlock(customBlock);
                          }
                        }}
                        onGenerateCustomBlock={onGenerateCustomBlock}
                        onDragStart={handleCustomBlockDragStart}
                        onSelect={(block) => setSelectedCustomBlock(block)}
                      />
                    </ScrollArea>
                  </div>
                )}
              </div>
            </div>
          )}

          {mainTab === "settings" && (
            <ScrollArea className='h-full'>
              <div className='p-4'>
                <div className='flex items-center gap-2 mb-3'>
                  <LayoutDashboard className='h-4 w-4 text-primary' />
                  <h3 className='font-medium'>Workflow Details</h3>
                </div>

                <div className='space-y-4'>
                  <div className='space-y-2'>
                    <Label
                      htmlFor='workflow-name'
                      className='text-xs font-medium'>
                      Name
                    </Label>
                    <Input
                      id='workflow-name'
                      value={workflowName}
                      onChange={(e) =>
                        onWorkflowDetailsChange({ name: e.target.value })
                      }
                      placeholder='Enter workflow name'
                      className='h-9 text-sm'
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label
                      htmlFor='workflow-description'
                      className='text-xs font-medium'>
                      Description
                    </Label>
                    <Textarea
                      id='workflow-description'
                      value={workflowDescription}
                      onChange={(e) =>
                        onWorkflowDetailsChange({ description: e.target.value })
                      }
                      placeholder='Enter workflow description'
                      rows={3}
                      className='text-sm resize-none min-h-[80px]'
                      aria-label='Workflow description'
                    />
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}

          {mainTab === "stats" && (
            <ScrollArea className='h-full'>
              <div className='p-4'>
                <div className='flex items-center gap-2 mb-3'>
                  <BarChart3 className='h-4 w-4 text-primary' />
                  <h3 className='font-medium'>Workflow Stats</h3>
                </div>

                <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                  <Card className='bg-muted/30 border shadow-sm'>
                    <CardContent className='p-3 flex items-center justify-between'>
                      <div>
                        <p className='text-xs text-muted-foreground'>Nodes</p>
                        <p className='text-lg font-semibold'>{nodes.length}</p>
                      </div>
                      <Blocks className='h-8 w-8 text-muted-foreground/50' />
                    </CardContent>
                  </Card>

                  <Card className='bg-muted/30 border shadow-sm'>
                    <CardContent className='p-3 flex items-center justify-between'>
                      <div>
                        <p className='text-xs text-muted-foreground'>
                          Est. Runtime
                        </p>
                        <p className='text-lg font-semibold'>{executionTime}</p>
                      </div>
                      <Clock className='h-8 w-8 text-muted-foreground/50' />
                    </CardContent>
                  </Card>

                  <Card className='bg-muted/30 border shadow-sm col-span-2'>
                    <CardContent className='p-3 flex items-center justify-between'>
                      <div>
                        <p className='text-xs text-muted-foreground'>
                          Last Updated
                        </p>
                        <p className='text-sm font-medium'>{lastUpdated}</p>
                      </div>
                      <Calendar className='h-6 w-6 text-muted-foreground/50' />
                    </CardContent>
                  </Card>
                </div>
              </div>
            </ScrollArea>
          )}
        </div>
      </div>

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Block to Library</DialogTitle>
            <DialogDescription>
              Save this custom block to your library for reuse in other
              workflows.
            </DialogDescription>
          </DialogHeader>

          <SaveBlockForm
            block={selectedCustomBlock}
            onSave={async (data) => {
              try {
                setSaving(true);

                if (!selectedCustomBlock) {
                  throw new Error("No block selected");
                }

                // Determine the category from the block definition or use a default
                let category =
                  selectedCustomBlock.category || NodeCategory.ACTION;
                let blockType = BlockType.CUSTOM;

                // If the node has a blockType property, use it
                if (selectedNode?.data?.blockType) {
                  blockType = selectedNode.data.blockType as BlockType;

                  // For DeFi blocks, set category to FINANCE if not already set
                  if (
                    blockType.toString().startsWith("defi-") &&
                    category === NodeCategory.ACTION
                  ) {
                    category = NodeCategory.FINANCE;
                  }
                }

                // Save with additional metadata
                await saveBlock({
                  name: data.name,
                  description: data.description,
                  blockType: blockType,
                  blockData: selectedCustomBlock,
                  isPublic: data.isPublic,
                  tags: data.tags,
                  category: category,
                });

                toast({
                  title: "Block saved",
                  description:
                    "Your block has been saved to the library. View it in the Block Library.",
                });

                setSaveDialogOpen(false);

                // Optional: Navigate to the library
                if (data.isPublic) {
                  toast({
                    title: "Block shared",
                    description:
                      "Your block is now available to the community.",
                    action: (
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => router.push("/blocks/shared")}>
                        View Shared Blocks
                      </Button>
                    ),
                  });
                }
              } catch (error) {
                console.error("Error saving block:", error);
                toast({
                  title: "Error",
                  description: "Failed to save block to library.",
                  variant: "destructive",
                });
              } finally {
                setSaving(false);
              }
            }}
            saving={saving}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SaveBlockForm({
  block,
  onSave,
  saving,
}: {
  block: CustomBlockDefinition | null;
  onSave: (data: z.infer<typeof saveBlockSchema>) => void;
  saving: boolean;
}) {
  const [currentTag, setCurrentTag] = useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Initialize form with block data if available
  const form = useForm<z.infer<typeof saveBlockSchema>>({
    resolver: zodResolver(saveBlockSchema),
    defaultValues: {
      name: block?.name || "",
      description: block?.description || "",
      isPublic: false,
      tags: [],
    },
  });

  const tags = form.watch("tags");

  const addTag = () => {
    if (currentTag.trim() && !tags.includes(currentTag.trim())) {
      form.setValue("tags", [...tags, currentTag.trim()]);
      setCurrentTag("");

      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  const removeTag = (tag: string) => {
    form.setValue(
      "tags",
      tags.filter((t) => t !== tag)
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSave)} className='space-y-4'>
        <FormField
          control={form.control}
          name='name'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} placeholder='Block name' />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='description'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder='Describe what this block does'
                  className='min-h-20'
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='tags'
          render={() => (
            <FormItem>
              <FormLabel>Tags</FormLabel>
              <div className='flex flex-wrap gap-2 mb-2'>
                {tags.map((tag) => (
                  <Badge key={tag} variant='secondary' className='text-xs py-1'>
                    {tag}
                    <button
                      type='button'
                      className='ml-1 text-muted-foreground hover:text-foreground'
                      onClick={() => removeTag(tag)}>
                      <svg
                        xmlns='http://www.w3.org/2000/svg'
                        width='12'
                        height='12'
                        viewBox='0 0 24 24'
                        fill='none'
                        stroke='currentColor'
                        strokeWidth='2'
                        strokeLinecap='round'
                        strokeLinejoin='round'>
                        <path d='M18 6 6 18' />
                        <path d='m6 6 12 12' />
                      </svg>
                    </button>
                  </Badge>
                ))}
                {tags.length === 0 && (
                  <span className='text-sm text-muted-foreground'>
                    No tags added
                  </span>
                )}
              </div>
              <div className='flex gap-2'>
                <Input
                  ref={inputRef}
                  value={currentTag}
                  onChange={(e) => setCurrentTag(e.target.value)}
                  placeholder='Enter tag'
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                />
                <Button
                  type='button'
                  variant='outline'
                  size='icon'
                  onClick={addTag}
                  title='Add tag'>
                  <PlusCircle className='h-4 w-4' />
                  <span className='sr-only'>Add tag</span>
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='isPublic'
          render={({ field }) => (
            <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
              <div className='space-y-0.5'>
                <FormLabel className='text-base'>Make Public</FormLabel>
                <FormDescription>
                  Allow others to discover and use this block
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <DialogFooter>
          <Button
            type='button'
            variant='outline'
            onClick={() => form.reset()}
            disabled={saving}>
            Reset
          </Button>
          <Button type='submit' disabled={saving}>
            {saving ? (
              <>
                <svg
                  className='animate-spin -ml-1 mr-2 h-4 w-4 text-white'
                  xmlns='http://www.w3.org/2000/svg'
                  fill='none'
                  viewBox='0 0 24 24'>
                  <circle
                    className='opacity-25'
                    cx='12'
                    cy='12'
                    r='10'
                    stroke='currentColor'
                    strokeWidth='4'></circle>
                  <path
                    className='opacity-75'
                    fill='currentColor'
                    d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
                </svg>
                Saving...
              </>
            ) : (
              <>Save to Library</>
            )}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
