"use client";

import type React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { BlockCatalog } from "@/components/block-catalog";
import { CustomBlockCatalog } from "@/components/custom-block-catalog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LayoutDashboard,
  Workflow,
  Blocks,
  PuzzleIcon as PuzzlePiece,
  ChevronRight,
  BarChart3,
  Clock,
  Calendar,
  Settings,
  Library,
  PlusCircle,
  Save,
} from "lucide-react";
import { saveBlock } from "@/lib/block-library-api";
import { useToast } from "@/components/ui/use-toast";
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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { BlockType } from "@/types/workflow";
import type { Node } from "@/components/flow-canvas";
import type { CustomBlockDefinition } from "@/types/custom-block";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const [isMobileCollapsed, setIsMobileCollapsed] = useState(true);
  const isMobile = useIsMobile();
  const router = useRouter();
  const { toast } = useToast();
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [currentTag, setCurrentTag] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedCustomBlock, setSelectedCustomBlock] =
    useState<CustomBlockDefinition | null>(null);

  // Handle drag start from the catalog
  const handleDragStart = (
    event: React.DragEvent,
    blockType: BlockType,
    blockData: any
  ) => {
    console.log("Drag started:", blockType, blockData);
  };

  // Handle drag start for custom blocks
  const handleCustomBlockDragStart = (
    event: React.DragEvent,
    customBlock: CustomBlockDefinition
  ) => {
    console.log("Custom block drag started:", customBlock);
  };

  // Calculate some example stats
  const executionTime =
    nodes.length > 0 ? `${(nodes.length * 0.5).toFixed(1)}s` : "N/A";
  const lastUpdated = new Date().toLocaleDateString();

  return (
    <>
      <div
        className={`h-full flex flex-col bg-background border-r transition-all duration-300 ${
          isMobile
            ? isMobileCollapsed
              ? "w-0 opacity-0 overflow-hidden"
              : "w-full absolute inset-y-0 left-0 z-40"
            : "relative"
        }`}>
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
            onClick={() => router.push("/blocks/create")}>
            <PlusCircle className='h-3.5 w-3.5' />
            <span className='text-xs'>Create Block</span>
          </Button>
        </div>

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
                  value={blockCatalogTab}
                  onValueChange={setBlockCatalogTab}>
                  <TabsList className='w-full grid grid-cols-2 h-9 text-xs'>
                    <TabsTrigger value='blocks' className='text-xs'>
                      Standard Blocks
                    </TabsTrigger>
                    <TabsTrigger value='custom' className='text-xs'>
                      Custom Blocks
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className='flex-1 overflow-hidden'>
                {blockCatalogTab === "blocks" && (
                  <ScrollArea className='h-full'>
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
                  <ScrollArea className='h-full'>
                    <div className='p-4 pt-2'>
                      <div className='text-xs text-muted-foreground mb-3 flex items-center'>
                        <ChevronRight className='h-3 w-3 mr-1' />
                        {blockCatalogTab === "custom" && (
                          <>
                            <div className='flex justify-end mb-2'>
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
                            </div>
                            <CustomBlockCatalog
                              onAddBlock={(block, position) => {
                                if (onAddCustomBlock) {
                                  onAddCustomBlock(block, position);
                                }
                                setSelectedCustomBlock(block);
                              }}
                              onGenerateCustomBlock={onGenerateCustomBlock}
                              onDragStart={handleCustomBlockDragStart}
                              onSelect={(block) =>
                                setSelectedCustomBlock(block)
                              }
                            />
                          </>
                        )}
                      </div>
                    </div>
                  </ScrollArea>
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

                // Save with additional metadata
                await saveBlock({
                  name: data.name,
                  description: data.description,
                  blockType: selectedCustomBlock.blockType,
                  blockData: selectedCustomBlock,
                  isPublic: data.isPublic,
                  tags: data.tags,
                  category: "DEFI",
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
    </>
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
                  onClick={addTag}>
                  <PlusCircle className='h-4 w-4' />
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
