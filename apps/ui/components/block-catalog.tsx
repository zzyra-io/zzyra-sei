"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  Clock,
  Mail,
  Bell,
  Database,
  Zap,
  Package,
  Calendar,
  Webhook,
  Filter,
  GripHorizontal,
  Star,
  Calculator,
  Scale,
  Globe,
  TrendingUp,
  Shuffle,
  PieChart,
  Repeat,
  Send,
  MessageSquare,
  Link,
  FilePlus,
  HelpCircle,
  FileText,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { BlockType } from "@zyra/types";
import { NodeCategory, getCategoryColor, BlockMetadata } from "@zyra/types";
import api from "@/lib/services/api";

interface BlockCatalogProps {
  onDragStart?: (
    event: React.DragEvent,
    blockType: BlockType,
    blockData: Record<string, unknown>
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
    api
      .get("/blocks/types")
      .then((res: any) => {
        setBlocks(res.data || []);
      })
      .catch((err: any) => {
        console.error("Failed to load block types", err);
        setBlocks([]);
      });
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
      type: block.type,
      blockType: block.type,
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
    event.dataTransfer.setData("application/reactflow/metadata", block.type);
    event.dataTransfer.setData(
      "application/reactflow/metadata",
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
      <div className='py-1 space-y-1'>
        {favorites.length > 0 && (
          <div>
            <div className='text-xs font-semibold mb-0.5 text-muted-foreground tracking-wide'>
              Favorites
            </div>
            <div className='flex gap-1 overflow-x-auto pb-1 border-b border-muted-foreground/10'>
              {favorites.map((ft) => {
                const blk = blocks.find((b) => b.type === ft);
                if (!blk) return null;
                return (
                  <div
                    key={ft}
                    draggable
                    onDragStart={(e) => handleDragStart(e, blk)}
                    onClick={() => handleBlockClick(blk)}
                    className='flex items-center gap-1 px-2 py-1 bg-card rounded-md shadow-sm border border-muted-foreground/10 hover:bg-muted cursor-pointer transition-colors text-xs'>
                    {getBlockIcon(blk.icon)}
                    <span>{blk.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {recents.length > 0 && (
          <div>
            <div className='text-xs font-semibold mb-0.5 text-muted-foreground tracking-wide'>
              Recent
            </div>
            <div className='flex gap-1 overflow-x-auto pb-1 border-b border-muted-foreground/10'>
              {recents.map((rt) => {
                const blk = blocks.find((b) => b.type === rt);
                if (!blk) return null;
                return (
                  <div
                    key={rt}
                    draggable
                    onDragStart={(e) => handleDragStart(e, blk)}
                    onClick={() => handleBlockClick(blk)}
                    className='flex items-center gap-1 px-2 py-1 bg-card rounded-md shadow-sm border border-muted-foreground/10 hover:bg-muted cursor-pointer transition-colors text-xs'>
                    {getBlockIcon(blk.icon)}
                    <span>{blk.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className='px-3 pt-2 pb-2'>
        <div className='relative'>
          <Search className='absolute left-2 top-2 h-4 w-4 text-muted-foreground' />
          <Input
            type='search'
            placeholder='Search blocks...'
            className='pl-7 h-8 rounded-md border border-muted-foreground/10 text-sm bg-muted/40 focus:ring-1 focus:ring-primary'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <Tabs
        value={activeCategory}
        onValueChange={setActiveCategory}
        className='flex-1 flex flex-col'>
        <div className='px-3 pb-2'>
          {/* should be equal to the width of the parent */}
          <TabsList className='grid grid-cols-5 w-full bg-muted/30 rounded-md max-w-full'>
            {categories.map((category) => (
              <TabsTrigger
                key={category.id}
                value={category.id}
                className='text-xs py-1 rounded-md data-[state=active]:bg-primary/10 data-[state=active]:text-primary'>
                {category.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <ScrollArea className='flex-1 px-2 pb-2'>
          <TabsContent
            value={activeCategory}
            className='m-0 space-y-1.5'
            forceMount>
            {filteredBlocks.map((block) => (
              <div
                key={block.type}
                draggable
                onDragStart={(e) => handleDragStart(e, block)}
                onClick={() => handleBlockClick(block)}
                className={cn(
                  "group relative flex items-center gap-2 rounded-md border bg-card px-2 py-2 cursor-pointer hover:shadow-sm hover:border-primary/40 transition-all text-sm",
                  "border-muted-foreground/10"
                )}>
                <div className='flex items-center justify-center w-7 h-7 rounded-md bg-muted/50 mr-1'>
                  {getBlockIcon(block.icon)}
                </div>
                <div className='flex-1 min-w-0'>
                  <div className='font-medium truncate'>{block.label}</div>
                  <div className='text-xs text-muted-foreground truncate'>
                    {block.description}
                  </div>
                </div>
              </div>
            ))}
            {filteredBlocks.length === 0 && (
              <div className='text-xs text-muted-foreground text-center py-4'>
                No blocks found.
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
    case "trending-up":
      return <TrendingUp {...iconProps} />;
    case "calendar":
      return <Calendar {...iconProps} />;
    case "webhook":
      return <Webhook {...iconProps} />;
    case "mail":
      return <Mail {...iconProps} />;
    case "bell":
      return <Bell {...iconProps} />;
    case "filter":
      return <Filter {...iconProps} />;
    case "clock":
      return <Clock {...iconProps} />;
    case "shuffle":
      return <Shuffle {...iconProps} />;
    case "zap":
      return <Zap {...iconProps} />;
    case "globe":
      return <Globe {...iconProps} />;
    case "calculator":
      return <Calculator {...iconProps} />;
    case "scale":
      return <Scale {...iconProps} />;
    case "database":
      return <Database {...iconProps} />;
    case "file-text":
      return <FileText {...iconProps} />;
    case "pie-chart":
      return <PieChart {...iconProps} />;
    case "repeat":
      return <Repeat {...iconProps} />;
    case "send":
      return <Send {...iconProps} />;
    case "message-square":
      return <MessageSquare {...iconProps} />;
    case "link":
      return <Link {...iconProps} />;
    case "file-plus":
      return <FilePlus {...iconProps} />;
    case "help-circle":
      return <HelpCircle {...iconProps} />;
    default:
      return <Package {...iconProps} />;
  }
}
