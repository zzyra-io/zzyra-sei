"use client";

import { BlockCatalog } from "@/components/block-catalog";
import {
  generateAiBlock,
  validateAiBlockForm,
} from "@/components/builder-sidebar-ai-handler";
import { CustomBlockCatalog } from "@/components/custom-block-catalog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import type { CustomBlockDefinition } from "@zyra/types";
import { BlockType, NodeCategory } from "@zyra/types";
import {
  BarChart3,
  Blocks,
  Box,
  ChevronRight,
  LayoutDashboard,
  Library,
  PlusCircle,
  PuzzleIcon as PuzzlePiece,
  Settings,
  Workflow,
} from "lucide-react";
import { useRouter } from "next/navigation";
import React, { DragEvent, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

// Define scrollbar styles for consistency

// import { AIBlockForm } from "./builders/ai-block-form";
import api from "@/lib/services/api";
import { DynamicWidget } from "@dynamic-labs/sdk-react-core";
import CustomBlocksModal from "./custom-blocks-modal";

interface BuilderSidebarProps {
  onAddNode: (
    blockType: BlockType,
    position?: { x: number; y: number }
  ) => void;
  onAddCustomBlock?: (
    customBlock: CustomBlockDefinition,
    position?: { x: number; y: number },
    method: "manual" | "ai"
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
}

function isCustomBlockDefinition(obj: any): obj is CustomBlockDefinition {
  return (
    obj &&
    typeof obj === "object" &&
    "name" in obj &&
    "inputs" in obj &&
    "outputs" in obj
  );
}

function hasData(node: any): node is { data: any } {
  return node && typeof node === "object" && "data" in node;
}

// Form schema for saving a block to the library
const saveBlockSchema = z.object({
  name: z.string().min(3).max(50),
  description: z.string().min(10).max(200),
  isPublic: z.boolean(),
  tags: z.array(z.string()),
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
}: BuilderSidebarProps) {
  const [mainTab, setMainTab] = useState("blocks");
  const [blockCatalogTab, setBlockCatalogTab] = useState("blocks");
  const isMobile = useIsMobile();
  const [isMobileCollapsed, setIsMobileCollapsed] = useState(isMobile);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const router = useRouter();
  const { toast } = useToast();

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

  // Calculate some example stats
  // const executionTime =
  //   nodes.length > 0 ? `${(nodes.length * 0.5).toFixed(1)}s` : "N/A";
  // const lastUpdated = new Date().toLocaleDateString();

  return (
    <div className='relative h-full'>
      <div
        className={cn(
          "flex h-full flex-col overflow-hidden bg-muted/5 border-r w-full transition-all duration-300",
          isMobile
            ? isMobileCollapsed
              ? "w-0 opacity-0"
              : "w-full opacity-100"
            : "w-full opacity-100"
        )}>
        {/* Mobile Toggle Button */}
        {isMobile && (
          <button
            onClick={() => setIsMobileCollapsed(!isMobileCollapsed)}
            className='fixed top-1/2 left-2 z-50 bg-primary text-primary-foreground p-2 rounded-full shadow-lg transition-transform duration-200 hover:scale-110'
            style={{ transform: "translateY(-50%)" }}
            aria-label={isMobileCollapsed ? "Open sidebar" : "Close sidebar"}
            title={isMobileCollapsed ? "Open sidebar" : "Close sidebar"}>
            <ChevronRight
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                !isMobileCollapsed && "rotate-180"
              )}
            />
          </button>
        )}

        {/* Sidebar Header */}
        <div className='p-4 border-b bg-muted/30 flex-shrink-0'>
          <div className='flex items-center gap-2 mb-1'>
            <Workflow className='h-5 w-5 text-primary' />
            <h2 className='font-semibold text-lg'>Workflow Builder</h2>
          </div>
          <p className='text-xs text-muted-foreground'>
            Design and configure your automation workflow
          </p>
        </div>

        {/* Main Tabs */}
        <div className='px-4 py-3 border-b bg-muted/20 flex-shrink-0'>
          <Tabs value={mainTab} onValueChange={setMainTab} className='w-full'>
            <TabsList className='grid w-full grid-cols-3 h-9 bg-muted/40'>
              <TabsTrigger value='blocks' className='text-xs font-medium'>
                <PuzzlePiece className='h-3 w-3 mr-1' />
                Blocks
              </TabsTrigger>
              <TabsTrigger value='settings' className='text-xs font-medium'>
                <Settings className='h-3 w-3 mr-1' />
                Settings
              </TabsTrigger>
              <TabsTrigger value='stats' className='text-xs font-medium'>
                <BarChart3 className='h-3 w-3 mr-1' />
                Stats
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
          <CustomBlocksModal
            onAddCustomBlock={
              onAddCustomBlock ||
              ((block, position, method) => {
                console.log("Add custom block:", block, position, method);
              })
            }
            onGenerateCustomBlock={onGenerateCustomBlock || (async () => {})}
            setBlockCatalogTab={setBlockCatalogTab}
          />
        </div>

        {/* Tab Content */}
        <div className='flex-1 overflow-hidden'>
          {mainTab === "blocks" && (
            <div className='flex flex-col h-full'>
              {/* Block Library Section */}
              <div className='px-4 py-3 border-b bg-muted/10'>
                <div className='flex items-center justify-between mb-2'>
                  <div className='flex items-center gap-2'>
                    <Library className='h-4 w-4 text-primary' />
                    <h3 className='font-medium text-sm'>Block Library</h3>
                  </div>
                </div>
                <p className='text-xs text-muted-foreground'>
                  Drag blocks to the canvas or click to add
                </p>
              </div>

              {/* Block Catalog Tabs */}
              <div className='px-4 py-3 border-b bg-muted/5'>
                <Tabs
                  defaultValue='blocks'
                  value={blockCatalogTab}
                  onValueChange={setBlockCatalogTab}>
                  <TabsList className='grid w-full grid-cols-2 h-8'>
                    <TabsTrigger value='blocks' className='text-xs'>
                      <Blocks className='h-3 w-3 mr-1' />
                      Blocks
                    </TabsTrigger>
                    <TabsTrigger value='custom' className='text-xs'>
                      <Box className='h-3 w-3 mr-1' />
                      Custom
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Block Content Area */}
              <div className='flex-1 overflow-hidden'>
                {blockCatalogTab === "blocks" && (
                  <div className='h-full px-4 py-3'>
                    <BlockCatalog
                      onDragStart={handleDragStart}
                      onAddBlock={onAddNode}
                      // Remove onAddCustomBlock prop if not supported
                    />
                  </div>
                )}

                {blockCatalogTab === "custom" && (
                  <div className='px-4 py-3'>
                    <div className='mb-3'>
                      <p className='text-xs text-muted-foreground'>
                        Custom blocks for your workflow
                      </p>
                    </div>
                    <CustomBlockCatalog
                      onAddBlock={(b) => {
                        if (isCustomBlockDefinition(b) && onAddCustomBlock) {
                          const position = {
                            x: Math.round(Math.random() * 300),
                            y: Math.round(Math.random() * 300),
                          };
                          onAddCustomBlock(b, position);
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {mainTab === "settings" && (
            <div className='h-full'>
              <DynamicWidget variant='modal' />
              <div className='px-4 py-4 border-b bg-muted/10'>
                <div className='flex items-center gap-2 mb-2'>
                  <LayoutDashboard className='h-4 w-4 text-primary' />
                  <h3 className='font-medium text-sm'>Workflow Details</h3>
                </div>
              </div>

              <div className='px-4 py-4 space-y-4'>
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
          )}

          {mainTab === "stats" && (
            <div className='h-full'>
              <div className='px-4 py-4 border-b bg-muted/10'>
                <div className='flex items-center gap-2 mb-2'>
                  <BarChart3 className='h-4 w-4 text-primary' />
                  <h3 className='font-medium text-sm'>Workflow Statistics</h3>
                </div>
              </div>

              <div className='px-4 py-4 space-y-4'>
                <div className='grid grid-cols-2 gap-3'>
                  <div className='bg-muted/20 rounded-lg p-3'>
                    <div className='text-xs text-muted-foreground mb-1'>
                      Nodes
                    </div>
                    <div className='text-lg font-semibold'>{nodes.length}</div>
                  </div>
                  <div className='bg-muted/20 rounded-lg p-3'>
                    <div className='text-xs text-muted-foreground mb-1'>
                      Status
                    </div>
                    <div className='text-sm font-medium text-green-600'>
                      Ready
                    </div>
                  </div>
                </div>

                <div className='space-y-2'>
                  <div className='text-xs font-medium text-muted-foreground'>
                    Node Types
                  </div>
                  <div className='space-y-1'>
                    {nodes.length === 0 ? (
                      <p className='text-xs text-muted-foreground italic'>
                        No nodes added yet
                      </p>
                    ) : (
                      <p className='text-xs text-muted-foreground'>
                        Add some blocks to see statistics
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
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
            block={
              hasData(selectedNode)
                ? (selectedNode.data.blockData as CustomBlockDefinition | null)
                : null
            }
            onSave={async (data) => {
              try {
                setSaving(true);

                if (!hasData(selectedNode) || !selectedNode.data.blockData) {
                  throw new Error("No block selected");
                }

                // Determine the category from the block definition or use a default
                const category =
                  selectedNode.data.blockData.category || NodeCategory.ACTION;
                let blockType = BlockType.CUSTOM;

                // If the node has a blockType property, use it
                if (selectedNode.data.blockType) {
                  blockType = selectedNode.data.blockType as BlockType;

                  // Save with additional metadata
                  await api.post("/blocks/custom", {
                    name: data.name,
                    description: data.description,
                    blockType: blockType,
                    blockData: selectedNode.data.blockData,
                    isPublic: data.isPublic,
                    tags: data.tags,
                    category: category,
                  });
                  toast({
                    title: "Block saved",
                    description:
                      "Your block has been saved to the library. View it in the Block Library.",
                  });

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
                }
              } catch (error) {
                console.error("Error saving block:", error);
                toast({
                  title: "Error",
                  description: "Failed to save block to library.",
                  variant: "destructive",
                });
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

  // Ensure all default values are always present
  const form = useForm<z.infer<typeof saveBlockSchema>>({
    resolver: zodResolver(saveBlockSchema),
    defaultValues: {
      name: block?.name || "",
      description: block?.description || "",
      isPublic: false,
      tags: [],
    },
    mode: "onChange",
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
      tags.filter((t: string) => t !== tag)
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
                {tags.map((tag: string) => (
                  <Badge key={tag} variant='secondary' className='text-xs py-1'>
                    {tag}
                    <button
                      type='button'
                      className='ml-1 text-muted-foreground hover:text-foreground'
                      onClick={() => removeTag(tag)}
                      title={`Remove ${tag} tag`}
                      aria-label={`Remove ${tag} tag`}>
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
