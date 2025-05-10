"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  Clock,
  Mail,
  Bell,
  Database,
  Wallet,
  ArrowUpRight,
  Zap,
  DollarSign,
  Package,
  Calendar,
  Webhook,
  Filter,
  BarChart3,
  GripHorizontal,
  Star,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  BlockType,
  NodeCategory,
  getCategoryColor,
  BlockMetadata,
} from "@/types/workflow";

interface BlockCatalogProps {
  onDragStart?: (
    event: React.DragEvent,
    blockType: BlockType,
    blockData: any
  ) => void;
  onAddBlock?: (
    blockType: BlockType,
    position?: { x: number; y: number }
  ) => void;
}

export function BlockCatalog({ onDragStart, onAddBlock }: BlockCatalogProps) {
  const FAVORITES_KEY = "block_favorites";
  const RECENT_KEY = "block_recent";
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [favorites, setFavorites] = useState<BlockType[]>(() => {
    const stored = localStorage.getItem(FAVORITES_KEY);
    return stored ? JSON.parse(stored) : [];
  });
  const [recents, setRecents] = useState<BlockType[]>(() => {
    const stored = localStorage.getItem(RECENT_KEY);
    return stored ? JSON.parse(stored) : [];
  });
  const [blocks, setBlocks] = useState<BlockMetadata[]>([]);
  useEffect(() => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }, [favorites]);
  useEffect(() => {
    localStorage.setItem(RECENT_KEY, JSON.stringify(recents));
  }, [recents]);
  useEffect(() => {
    fetch("/api/block-types")
      .then((res) => res.json())
      .then((data: BlockMetadata[]) => setBlocks(data))
      .catch((err) => console.error("Failed to load block types", err));
  }, []);
  const toggleFavorite = (type: BlockType) =>
    setFavorites((f) =>
      f.includes(type) ? f.filter((t) => t !== type) : [type, ...f]
    );

  // Define block categories
  const categories = [
    { id: "all", label: "All" },
    { id: NodeCategory.TRIGGER, label: "Triggers" },
    { id: NodeCategory.ACTION, label: "Actions" },
    { id: NodeCategory.LOGIC, label: "Logic" },
    { id: NodeCategory.FINANCE, label: "Finance" },
  ];

  // Filter out unknown types
  const availableBlocks = blocks.filter((b) => b.type !== BlockType.UNKNOWN);

  // Filter blocks based on search query and active category
  const filteredBlocks = availableBlocks.filter((block) => {
    const matchesSearch =
      block.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      block.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      activeCategory === "all" || block.category === activeCategory;

    return matchesSearch && matchesCategory;
  });

  // Handle drag start event
  const handleDragStart = (event: React.DragEvent, block: BlockMetadata) => {
    setRecents((r) =>
      [block.type, ...r.filter((t) => t !== block.type)].slice(0, 10)
    );
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
    };

    // Set the data directly on the dataTransfer object
    event.dataTransfer.setData("application/reactflow/type", block.type);
    event.dataTransfer.setData(
      "application/reactflow/data",
      JSON.stringify(blockData)
    );
    event.dataTransfer.effectAllowed = "move";

    // Only call onDragStart if it's provided
    if (typeof onDragStart === "function") {
      onDragStart(event, block.type, blockData);
    }
  };

  // Handle block click for direct addition
  const handleBlockClick = (block: BlockMetadata) => {
    setRecents((r) =>
      [block.type, ...r.filter((t) => t !== block.type)].slice(0, 10)
    );
    if (typeof onAddBlock === "function") {
      onAddBlock(block.type);
    }
  };

  return (
    <div className='flex flex-col h-full'>
      {/* Favorites & Recent */}
      <div className='py-2 space-y-2'>
        {favorites.length > 0 && (
          <div>
            <div className='text-xs font-medium mb-1'>Favorites</div>
            <div className='flex gap-2 overflow-x-auto'>
              {favorites.map((ft) => {
                const blk = blocks.find((b) => b.type === ft);
                if (!blk) return null;
                return (
                  <div
                    key={ft}
                    draggable
                    onDragStart={(e) => handleDragStart(e, blk)}
                    onClick={() => handleBlockClick(blk)}
                    className='flex items-center gap-1 p-2 bg-card rounded shadow'>
                    {getBlockIcon(blk.icon)}
                    <span className='text-xs'>{blk.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {recents.length > 0 && (
          <div>
            <div className='text-xs font-medium mb-1'>Recent</div>
            <div className='flex gap-2 overflow-x-auto'>
              {recents.map((rt) => {
                const blk = blocks.find((b) => b.type === rt);
                if (!blk) return null;
                return (
                  <div
                    key={rt}
                    draggable
                    onDragStart={(e) => handleDragStart(e, blk)}
                    onClick={() => handleBlockClick(blk)}
                    className='flex items-center gap-1 p-2 bg-card rounded shadow'>
                    {getBlockIcon(blk.icon)}
                    <span className='text-xs'>{blk.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className='px-4 pt-4 pb-3'>
        <div className='relative'>
          <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
          <Input
            type='search'
            placeholder='Search blocks...'
            className='pl-8 h-9'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <Tabs
        value={activeCategory}
        onValueChange={setActiveCategory}
        className='flex-1 flex flex-col'>
        <div className='px-4 pb-3'>
          <TabsList className='grid grid-cols-5 w-full'>
            {categories.map((category) => (
              <TabsTrigger
                key={category.id}
                value={category.id}
                className='text-xs py-1.5'>
                {category.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <ScrollArea className='flex-1 px-4 pb-4'>
          <TabsContent
            value={activeCategory}
            className='m-0 space-y-2.5'
            forceMount>
            {filteredBlocks.map((block) => (
              <div
                key={block.type}
                draggable
                onDragStart={(e) => handleDragStart(e, block)}
                onClick={() => handleBlockClick(block)}
                className={cn(
                  "group relative flex",
                  "items-center gap-3 rounded-lg border bg-card p-3",
                  "shadow-sm hover:shadow-md transition-all duration-200 cursor-grab",
                  "hover:border-muted-foreground/20 hover:bg-accent/40",
                  block.category === NodeCategory.TRIGGER &&
                    "border-l-[5px] border-l-blue-500",
                  block.category === NodeCategory.ACTION &&
                    "border-l-[5px] border-l-green-500",
                  block.category === NodeCategory.LOGIC &&
                    "border-l-[5px] border-l-purple-500",
                  block.category === NodeCategory.FINANCE &&
                    "border-l-[5px] border-l-amber-500"
                )}>
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-md",
                    "shadow-sm transition-colors duration-200",
                    block.category === NodeCategory.TRIGGER &&
                      "bg-blue-50 text-blue-700 group-hover:bg-blue-100",
                    block.category === NodeCategory.ACTION &&
                      "bg-green-50 text-green-700 group-hover:bg-green-100",
                    block.category === NodeCategory.LOGIC &&
                      "bg-purple-50 text-purple-700 group-hover:bg-purple-100",
                    block.category === NodeCategory.FINANCE &&
                      "bg-amber-50 text-amber-700 group-hover:bg-amber-100"
                  )}>
                  {getBlockIcon(block.icon)}
                </div>
                <div className='min-w-0 flex-1'>
                  <div className='font-medium text-sm leading-tight mb-0.5'>
                    {block.label}
                  </div>
                  <div className='text-xs text-muted-foreground line-clamp-2'>
                    {block.description}
                  </div>
                </div>
                <div className='absolute right-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity'>
                  <Star
                    className={`h-4 w-4 cursor-pointer ${
                      favorites.includes(block.type)
                        ? "text-yellow-400"
                        : "text-muted-foreground"
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(block.type);
                    }}
                  />
                </div>
                <div className='absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-70 transition-opacity'>
                  <GripHorizontal className='h-4 w-4 text-muted-foreground' />
                </div>
              </div>
            ))}

            {filteredBlocks.length === 0 && (
              <div className='text-center py-8 text-muted-foreground'>
                <p>No blocks found matching your search.</p>
              </div>
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}

// Helper function to get block icon using Lucide icons
function getBlockIcon(iconName: string) {
  const iconProps = { className: "h-5 w-5" };

  switch (iconName) {
    case BlockType.PRICE_MONITOR:
      return <BarChart3 {...iconProps} />;
    case BlockType.SCHEDULE:
      return <Calendar {...iconProps} />;
    case BlockType.WEBHOOK:
      return <Webhook {...iconProps} />;
    case BlockType.EMAIL:
      return <Mail {...iconProps} />;
    case BlockType.NOTIFICATION:
      return <Bell {...iconProps} />;
    case BlockType.DATABASE:
      return <Database {...iconProps} />;
    case BlockType.WALLET:
      return <Wallet {...iconProps} />;
    case BlockType.TRANSACTION:
      return <ArrowUpRight {...iconProps} />;
    case BlockType.CONDITION:
      return <Filter {...iconProps} />;
    case BlockType.DELAY:
      return <Clock {...iconProps} />;
    case BlockType.TRANSFORM:
      return <Zap {...iconProps} />;
    case BlockType.GOAT_FINANCE:
      return <DollarSign {...iconProps} />;
    default:
      return <Package {...iconProps} />;
  }
}
