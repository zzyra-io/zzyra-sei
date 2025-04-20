"use client"

import type React from "react"
import { useState } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { BlockType, NodeCategory, BLOCK_CATALOG, getCategoryColor } from "@/types/workflow"

interface BlockCatalogProps {
  onDragStart?: (event: React.DragEvent, blockType: BlockType, blockData: any) => void
  onAddBlock?: (blockType: BlockType, position?: { x: number; y: number }) => void
}

export function BlockCatalog({ onDragStart, onAddBlock }: BlockCatalogProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState("all")

  // Define block categories
  const categories = [
    { id: "all", label: "All" },
    { id: NodeCategory.TRIGGER, label: "Triggers" },
    { id: NodeCategory.ACTION, label: "Actions" },
    { id: NodeCategory.LOGIC, label: "Logic" },
    { id: NodeCategory.FINANCE, label: "Finance" },
  ]

  // Get blocks from our catalog
  const blocks = Object.values(BLOCK_CATALOG).filter((block) => block.type !== BlockType.UNKNOWN)

  // Filter blocks based on search query and active category
  const filteredBlocks = blocks.filter((block) => {
    const matchesSearch =
      block.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      block.description.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategory = activeCategory === "all" || block.category === activeCategory

    return matchesSearch && matchesCategory
  })

  // Handle drag start event
  const handleDragStart = (event: React.DragEvent, block: (typeof blocks)[0]) => {
    // Create a serializable version of the block data
    const blockData = {
      blockType: block.type, // Use the enum value
      label: block.label,
      description: block.description,
      nodeType: block.category,
      iconName: block.icon,
      isEnabled: true,
      config: { ...block.defaultConfig },
      style: {
        backgroundColor: "bg-card",
        borderColor: "border-border",
        textColor: "text-foreground",
        accentColor: getCategoryColor(block.category),
        width: 220,
      },
    }

    // Set the data directly on the dataTransfer object
    event.dataTransfer.setData("application/reactflow/type", block.type)
    event.dataTransfer.setData("application/reactflow/data", JSON.stringify(blockData))
    event.dataTransfer.effectAllowed = "move"

    // Only call onDragStart if it's provided
    if (typeof onDragStart === "function") {
      onDragStart(event, block.type, blockData)
    }
  }

  // Handle block click for direct addition
  const handleBlockClick = (block: (typeof blocks)[0]) => {
    if (typeof onAddBlock === "function") {
      onAddBlock(block.type)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4">
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
        <TabsList className="grid grid-cols-5 mx-4">
          {categories.map((category) => (
            <TabsTrigger key={category.id} value={category.id} className="text-xs">
              {category.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <ScrollArea className="flex-1 p-4">
          <TabsContent value={activeCategory} className="m-0 space-y-2" forceMount>
            {filteredBlocks.map((block) => (
              <div
                key={block.type}
                draggable
                onDragStart={(e) => handleDragStart(e, block)}
                onClick={() => handleBlockClick(block)}
                className={cn(
                  "flex items-center gap-3 rounded-md border p-3 cursor-grab hover:bg-accent hover:text-accent-foreground transition-colors",
                  block.category === NodeCategory.TRIGGER && "border-l-4 border-l-blue-500",
                  block.category === NodeCategory.ACTION && "border-l-4 border-l-green-500",
                  block.category === NodeCategory.LOGIC && "border-l-4 border-l-purple-500",
                  block.category === NodeCategory.FINANCE && "border-l-4 border-l-amber-500",
                )}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-md",
                    block.category === NodeCategory.TRIGGER && "bg-blue-50 text-blue-700",
                    block.category === NodeCategory.ACTION && "bg-green-50 text-green-700",
                    block.category === NodeCategory.LOGIC && "bg-purple-50 text-purple-700",
                    block.category === NodeCategory.FINANCE && "bg-amber-50 text-amber-700",
                  )}
                >
                  {getBlockIcon(block.icon)}
                </div>
                <div>
                  <div className="font-medium">{block.label}</div>
                  <div className="text-xs text-muted-foreground">{block.description}</div>
                </div>
              </div>
            ))}

            {filteredBlocks.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>No blocks found matching your search.</p>
              </div>
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  )
}

// Helper function to get block icon
function getBlockIcon(iconName: string) {
  switch (iconName) {
    case "price-monitor":
      return <span className="text-sm">$</span>
    case "schedule":
      return <span className="text-sm">⏱️</span>
    case "webhook":
      return <span className="text-sm">🔗</span>
    case "email":
      return <span className="text-sm">✉️</span>
    case "notification":
      return <span className="text-sm">🔔</span>
    case "database":
      return <span className="text-sm">💾</span>
    case "wallet":
      return <span className="text-sm">👛</span>
    case "transaction":
      return <span className="text-sm">↗️</span>
    case "condition":
      return <span className="text-sm">⚙️</span>
    case "delay":
      return <span className="text-sm">⏳</span>
    case "transform":
      return <span className="text-sm">⚡</span>
    case "goat-finance":
      return <span className="text-sm">💰</span>
    default:
      return <span className="text-sm">📦</span>
  }
}
