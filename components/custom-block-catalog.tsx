"use client"

import { useState, useEffect } from "react"
import { Search, PlusCircle, Edit, Trash2, Copy, Sparkles } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/components/ui/use-toast"
import { type CustomBlockDefinition, LogicType } from "@/types/custom-block"
import { BlockType, NodeCategory } from "@/types/workflow"
import { CustomBlockBuilderDialog } from "./custom-block-builder-dialog"
import { customBlockService } from "@/lib/services/custom-block-service"
import { cn } from "@/lib/utils"

interface CustomBlockCatalogProps {
  onAddBlock: (block: CustomBlockDefinition) => void
  onGenerateCustomBlock?: (prompt: string) => Promise<void>
  onDragStart?: (event: React.DragEvent, block: CustomBlockDefinition) => void
}

export function CustomBlockCatalog({ onAddBlock, onGenerateCustomBlock, onDragStart }: CustomBlockCatalogProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [customBlocks, setCustomBlocks] = useState<CustomBlockDefinition[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<string>("all")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedBlock, setSelectedBlock] = useState<CustomBlockDefinition | null>(null)
  const { toast } = useToast()

  // Load custom blocks
  useEffect(() => {
    const loadBlocks = async () => {
      setIsLoading(true)
      try {
        // Try to load blocks from the database
        const blocks = await customBlockService.getCustomBlocks()

        // If no blocks are found, use example blocks
        if (blocks.length === 0) {
          setCustomBlocks(customBlockService.getExampleBlocks())
        } else {
          setCustomBlocks(blocks)
        }
      } catch (error) {
        console.error("Error loading custom blocks:", error)
        // Fallback to example blocks on error
        setCustomBlocks(customBlockService.getExampleBlocks())
        toast({
          title: "Error loading blocks",
          description: "Using example blocks instead",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadBlocks()
  }, [toast])

  // Filter blocks based on search query and active category
  const filteredBlocks = customBlocks.filter((block) => {
    const matchesSearch =
      block.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      block.description.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategory = activeCategory === "all" || block.category === activeCategory

    return matchesSearch && matchesCategory
  })

  // Handle creating a new block
  const handleCreateBlock = async (block: CustomBlockDefinition) => {
    try {
      // In a real app, we would save to the database here
      // const savedBlock = await customBlockService.createCustomBlock(block)

      // For now, just add to the local state
      setCustomBlocks((prev) => [...prev, block])

      toast({
        title: "Block Created",
        description: `${block.name} has been created successfully`,
      })
    } catch (error) {
      console.error("Error creating block:", error)
      toast({
        title: "Error",
        description: "Failed to create block",
        variant: "destructive",
      })
    }
  }

  // Handle updating a block
  const handleUpdateBlock = async (block: CustomBlockDefinition) => {
    try {
      // In a real app, we would update in the database here
      // const updatedBlock = await customBlockService.updateCustomBlock(block.id, block)

      // For now, just update the local state
      setCustomBlocks((prev) => prev.map((b) => (b.id === block.id ? block : b)))

      toast({
        title: "Block Updated",
        description: `${block.name} has been updated successfully`,
      })
    } catch (error) {
      console.error("Error updating block:", error)
      toast({
        title: "Error",
        description: "Failed to update block",
        variant: "destructive",
      })
    }
  }

  // Handle deleting a block
  const handleDeleteBlock = async () => {
    if (!selectedBlock) return

    try {
      // In a real app, we would delete from the database here
      // await customBlockService.deleteCustomBlock(selectedBlock.id)

      // For now, just remove from the local state
      setCustomBlocks((prev) => prev.filter((b) => b.id !== selectedBlock.id))

      toast({
        title: "Block Deleted",
        description: `${selectedBlock.name} has been deleted`,
      })
    } catch (error) {
      console.error("Error deleting block:", error)
      toast({
        title: "Error",
        description: "Failed to delete block",
        variant: "destructive",
      })
    } finally {
      setIsDeleteDialogOpen(false)
      setSelectedBlock(null)
    }
  }

  // Handle duplicating a block
  const handleDuplicateBlock = (block: CustomBlockDefinition) => {
    const duplicatedBlock: CustomBlockDefinition = {
      ...block,
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: `${block.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    setCustomBlocks((prev) => [...prev, duplicatedBlock])

    toast({
      title: "Block Duplicated",
      description: `Created a copy of ${block.name}`,
    })
  }

  // Get icon for logic type
  const getLogicTypeIcon = (logicType: LogicType) => {
    switch (logicType) {
      case LogicType.JAVASCRIPT:
        return "JS"
      case LogicType.JSON_TRANSFORM:
        return "JSON"
      case LogicType.TEMPLATE:
        return "TPL"
      case LogicType.CONDITION:
        return "IF"
      default:
        return "?"
    }
  }
  
  // Handle drag start event for custom blocks
  const handleDragStart = (event: React.DragEvent, block: CustomBlockDefinition) => {
    // Create a serializable version of the block data
    const blockData = {
      label: block.name,
      description: block.description,
      blockType: BlockType.CUSTOM,
      customBlockId: block.id,
      nodeType: block.category,
      iconName: "custom-block",
      isEnabled: true,
      config: {},
      style: {
        backgroundColor: "bg-card",
        borderColor: "border-border",
        textColor: "text-foreground",
        accentColor: block.category === NodeCategory.TRIGGER ? "blue" :
                    block.category === NodeCategory.ACTION ? "green" :
                    block.category === NodeCategory.LOGIC ? "purple" : "amber",
        width: 220,
      },
    };

    // Set the data directly on the dataTransfer object
    event.dataTransfer.setData("application/reactflow/type", BlockType.CUSTOM);
    event.dataTransfer.setData(
      "application/reactflow/data",
      JSON.stringify(blockData)
    );
    event.dataTransfer.setData(
      "application/reactflow/customBlock",
      JSON.stringify(block)
    );
    event.dataTransfer.effectAllowed = "move";

    // Only call onDragStart if it's provided
    if (typeof onDragStart === "function") {
      onDragStart(event, block);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium">Custom Blocks</h3>
          {onGenerateCustomBlock && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => {
                const prompt = window.prompt("Enter a description for your custom block:");
                if (prompt && prompt.trim()) {
                  onGenerateCustomBlock(prompt.trim());
                }
              }}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              AI Generate
            </Button>
          )}
          <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Create
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search blocks..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <Tabs value={activeCategory} onValueChange={setActiveCategory} className="flex-1 flex flex-col">
        <TabsList className="grid grid-cols-5 mx-4 mt-4">
          <TabsTrigger value="all" className="text-xs">
            All
          </TabsTrigger>
          <TabsTrigger value={NodeCategory.TRIGGER} className="text-xs">
            Triggers
          </TabsTrigger>
          <TabsTrigger value={NodeCategory.ACTION} className="text-xs">
            Actions
          </TabsTrigger>
          <TabsTrigger value={NodeCategory.LOGIC} className="text-xs">
            Logic
          </TabsTrigger>
          <TabsTrigger value={NodeCategory.FINANCE} className="text-xs">
            Finance
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1 p-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <p className="text-muted-foreground">Loading blocks...</p>
            </div>
          ) : filteredBlocks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No custom blocks found</p>
              <p className="text-xs text-muted-foreground">
                {searchQuery ? "Try a different search term" : "Click 'Create' to add your first custom block or use AI to generate one"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBlocks.map((block) => (
                <Card 
                  key={block.id} 
                  className="overflow-hidden"
                  draggable
                  onDragStart={(e) => handleDragStart(e, block)}
                >
                  <CardHeader className="p-4 pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-base">{block.name}</CardTitle>
                        <CardDescription className="text-xs line-clamp-1">{block.description}</CardDescription>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <span className="sr-only">Open menu</span>
                            <svg
                              width="15"
                              height="15"
                              viewBox="0 0 15 15"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                            >
                              <path
                                d="M3.625 7.5C3.625 8.12132 3.12132 8.625 2.5 8.625C1.87868 8.625 1.375 8.12132 1.375 7.5C1.375 6.87868 1.87868 6.375 2.5 6.375C3.12132 6.375 3.625 6.87868 3.625 7.5ZM8.625 7.5C8.625 8.12132 8.12132 8.625 7.5 8.625C6.87868 8.625 6.375 8.12132 6.375 7.5C6.375 6.87868 6.87868 6.375 7.5 6.375C8.12132 6.375 8.625 6.87868 8.625 7.5ZM13.625 7.5C13.625 8.12132 13.1213 8.625 12.5 8.625C11.8787 8.625 11.375 8.12132 11.375 7.5C11.375 6.87868 11.8787 6.375 12.5 6.375C13.1213 6.375 13.625 6.87868 13.625 7.5Z"
                                fill="currentColor"
                                fillRule="evenodd"
                                clipRule="evenodd"
                              ></path>
                            </svg>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedBlock(block)
                              setIsCreateDialogOpen(true)
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicateBlock(block)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => {
                              setSelectedBlock(block)
                              setIsDeleteDialogOpen(true)
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          block.category === NodeCategory.TRIGGER && "bg-blue-50 text-blue-700 border-blue-200",
                          block.category === NodeCategory.ACTION && "bg-green-50 text-green-700 border-green-200",
                          block.category === NodeCategory.LOGIC && "bg-purple-50 text-purple-700 border-purple-200",
                          block.category === NodeCategory.FINANCE && "bg-amber-50 text-amber-700 border-amber-200",
                        )}
                      >
                        {block.category}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {getLogicTypeIcon(block.logicType)}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {block.inputs.length} in / {block.outputs.length} out
                      </Badge>
                    </div>
                  </CardContent>
                  <CardFooter className="p-2 bg-muted/50 flex justify-between">
                    <div className="text-xs text-muted-foreground flex items-center">
                      <span className="mr-1">Drag to canvas or</span>
                    </div>
                    <Button size="sm" onClick={() => onAddBlock(block)}>
                      Add to Canvas
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </Tabs>

      <CustomBlockBuilderDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        initialBlock={selectedBlock || undefined}
        onSave={(block) => {
          if (selectedBlock) {
            handleUpdateBlock(block)
          } else {
            handleCreateBlock(block)
          }
          setSelectedBlock(null)
        }}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Custom Block</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedBlock?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedBlock(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBlock}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
