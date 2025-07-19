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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
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

// Extend BlockMetadata to include new properties from API
interface BlockMetadataWithSchemas extends BlockMetadata {
  configSchema?: Record<string, unknown>;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  validation?: Record<string, unknown>;
  compatibility?: Record<string, unknown>;
}

export function BlockCatalog({ onDragStart, onAddBlock }: BlockCatalogProps) {
  const FAVORITES_KEY = "block_favorites";
  const RECENT_KEY = "block_recent";
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [favorites, setFavorites] = useState<BlockType[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(FAVORITES_KEY);
      return stored ? JSON.parse(stored) : [];
    }
    return [];
  });
  const [recents, setRecents] = useState<BlockType[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(RECENT_KEY);
      return stored ? JSON.parse(stored) : [];
    }
    return [];
  });
  const [blocks, setBlocks] = useState<BlockMetadataWithSchemas[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    }
  }, [favorites]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(RECENT_KEY, JSON.stringify(recents));
    }
  }, [recents]);

  useEffect(() => {
    const loadBlocks = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const res = await api.get("/blocks/types");
        setBlocks(res.data || []);
      } catch (err: unknown) {
        console.error("Failed to load block types", err);
        setError("Failed to load block types. Please try again.");
        setBlocks([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadBlocks();
  }, []);

  const toggleFavorite = (type: BlockType) =>
    setFavorites((f) =>
      f.includes(type) ? f.filter((t) => t !== type) : [type, ...f]
    );

  // Define block categories with better styling
  const categories = [
    { id: "all", label: "All Blocks", color: "bg-primary/10 text-primary" },
    {
      id: NodeCategory.TRIGGER,
      label: "Triggers",
      color:
        "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    },
    {
      id: NodeCategory.ACTION,
      label: "Actions",
      color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    },
    {
      id: NodeCategory.LOGIC,
      label: "Logic",
      color:
        "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    },
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
  const handleDragStart = (
    event: React.DragEvent,
    block: BlockMetadataWithSchemas
  ) => {
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
      configSchema: block.configSchema?.properties
        ? block.configSchema
        : undefined,
      inputSchema: block.inputSchema?.properties
        ? block.inputSchema
        : undefined,
      outputSchema: block.outputSchema?.properties
        ? block.outputSchema
        : undefined,
      validation: block.validation ?? undefined,
      compatibility: block.compatibility ?? undefined,
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
      "application/reactflow/metadata",
      JSON.stringify(blockData)
    );
    event.dataTransfer.effectAllowed = "move";
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

  // Show loading state
  if (isLoading) {
    return (
      <div className='flex items-center justify-center h-48 bg-muted/5 rounded-lg'>
        <div className='flex flex-col items-center gap-3'>
          <div className='w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin' />
          <p className='text-sm text-muted-foreground'>Loading blocks...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className='flex items-center justify-center h-48 bg-muted/5 rounded-lg'>
        <div className='flex flex-col items-center gap-3 text-center'>
          <div className='w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center'>
            <svg
              className='w-4 h-4 text-red-600 dark:text-red-400'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z'
              />
            </svg>
          </div>
          <div>
            <p className='text-sm font-medium text-red-600 dark:text-red-400'>
              Error Loading Blocks
            </p>
            <p className='text-xs text-muted-foreground mt-1'>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='flex flex-col h-full'>
      {/* Search - Fixed at top */}
      <div className='flex-shrink-0 p-3 bg-background border-b border-border/50'>
        <div className='relative'>
          <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
          <Input
            placeholder='Search blocks...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className='pl-10 h-10 text-sm bg-background border-2 border-muted focus:border-primary/50 transition-colors'
          />
        </div>
      </div>

      {/* Category Tabs - Sticky below search */}
      <div className='flex-shrink-0 sticky top-0 z-20 bg-background border-b border-border/50'>
        <div className='p-3 pb-2'>
          <div className='text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2'>
            Categories
          </div>
          <Tabs value={activeCategory} onValueChange={setActiveCategory}>
            <TabsList className='grid w-full grid-cols-4 h-10 bg-muted/30 border border-border p-1'>
              {categories.map((category) => {
                // Create proper short labels for tabs
                const getShortLabel = (label: string) => {
                  switch (label) {
                    case "All Blocks":
                      return "All";
                    case "Triggers":
                      return "Trigger";
                    case "Actions":
                      return "Action";
                    case "Logic":
                      return "Logic";
                    default:
                      return label;
                  }
                };

                return (
                  <TabsTrigger
                    key={category.id}
                    value={category.id}
                    className='text-xs px-1 py-2 min-w-0 flex items-center justify-center font-medium transition-all duration-200 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm hover:bg-muted/50'>
                    <span className='truncate'>
                      {getShortLabel(category.label)}
                    </span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className='flex-1 overflow-hidden'>
        <ScrollArea className='h-full'>
          <div className='p-3 space-y-4'>
            {/* Favorites & Recent */}
            {(favorites.length > 0 || recents.length > 0) && (
              <div className='space-y-3 pb-3 border-b border-border/30'>
                {favorites.length > 0 && (
                  <div>
                    <div className='text-xs font-semibold mb-2 text-muted-foreground tracking-wide flex items-center gap-1 px-1'>
                      <Star className='h-3 w-3 text-yellow-500' />
                      Favorites
                    </div>
                    <div className='flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-muted'>
                      {favorites.map((ft) => {
                        const blk = blocks.find((b) => b.type === ft);
                        if (!blk) return null;
                        return (
                          <div
                            key={ft}
                            draggable
                            onDragStart={(e) => handleDragStart(e, blk)}
                            onClick={() => handleBlockClick(blk)}
                            className='flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800 hover:shadow-md cursor-pointer transition-all text-xs min-w-fit hover:scale-105'>
                            <div className='w-4 h-4 flex items-center justify-center text-yellow-600 dark:text-yellow-400'>
                              {getBlockIcon(blk.icon)}
                            </div>
                            <span className='whitespace-nowrap font-medium text-yellow-800 dark:text-yellow-200'>
                              {blk.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {recents.length > 0 && (
                  <div>
                    <div className='text-xs font-semibold mb-2 text-muted-foreground tracking-wide flex items-center gap-1 px-1'>
                      <Clock className='h-3 w-3 text-blue-500' />
                      Recent
                    </div>
                    <div className='flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-muted'>
                      {recents.map((rt) => {
                        const blk = blocks.find((b) => b.type === rt);
                        if (!blk) return null;
                        return (
                          <div
                            key={rt}
                            draggable
                            onDragStart={(e) => handleDragStart(e, blk)}
                            onClick={() => handleBlockClick(blk)}
                            className='flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-50 to-sky-50 dark:from-blue-900/20 dark:to-sky-900/20 rounded-lg border border-blue-200 dark:border-blue-800 hover:shadow-md cursor-pointer transition-all text-xs min-w-fit hover:scale-105'>
                            <div className='w-4 h-4 flex items-center justify-center text-blue-600 dark:text-blue-400'>
                              {getBlockIcon(blk.icon)}
                            </div>
                            <span className='whitespace-nowrap font-medium text-blue-800 dark:text-blue-200'>
                              {blk.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* All Blocks Section */}
            <div className='space-y-3'>
              <div className='text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 flex items-center justify-between'>
                <span>All Blocks</span>
                <span className='text-xs bg-muted/50 px-2 py-1 rounded-full'>
                  {filteredBlocks.length}
                </span>
              </div>

              {filteredBlocks.length === 0 ? (
                <div className='flex items-center justify-center h-40 text-center bg-muted/10 rounded-lg border-2 border-dashed border-muted mx-1'>
                  <div className='flex flex-col items-center gap-3'>
                    <div className='w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center'>
                      <Search className='w-6 h-6 text-muted-foreground' />
                    </div>
                    <div>
                      <p className='text-sm font-medium text-muted-foreground'>
                        No blocks found
                      </p>
                      <p className='text-xs text-muted-foreground/70 mt-1'>
                        Try adjusting your search or category filter
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className='grid grid-cols-1 gap-3'>
                  {filteredBlocks.map((block, index) => (
                    <div
                      key={block.type}
                      draggable
                      onDragStart={(e) => handleDragStart(e, block)}
                      onClick={() => handleBlockClick(block)}
                      className='group relative flex items-center gap-3 p-4 bg-card rounded-xl border border-border hover:border-primary/30 hover:bg-accent/50 cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5'
                      style={{ animationDelay: `${index * 50}ms` }}>
                      {/* Category indicator */}
                      <div
                        className={`absolute top-2 right-2 w-2 h-2 rounded-full ${getCategoryColor(block.category).split(" ")[0]}`}
                      />

                      {/* Block Icon */}
                      <div
                        className={`flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br ${getCategoryColor(block.category)} shadow-sm`}>
                        <div className='text-white'>
                          {getBlockIcon(block.icon)}
                        </div>
                      </div>

                      {/* Block Info */}
                      <div className='flex-1 min-w-0'>
                        <div className='flex items-center gap-2 mb-1'>
                          <h3 className='font-semibold text-sm text-foreground truncate'>
                            {block.label}
                          </h3>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(block.type);
                            }}
                            className='opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-background rounded-md'
                            title={
                              favorites.includes(block.type)
                                ? "Remove from favorites"
                                : "Add to favorites"
                            }
                            aria-label={
                              favorites.includes(block.type)
                                ? "Remove from favorites"
                                : "Add to favorites"
                            }>
                            <Star
                              className={`h-4 w-4 transition-colors ${favorites.includes(block.type) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground hover:text-yellow-400"}`}
                            />
                          </button>
                        </div>
                        <p className='text-xs text-muted-foreground line-clamp-2 leading-relaxed'>
                          {block.description}
                        </p>
                      </div>

                      {/* Drag Handle */}
                      <div className='opacity-0 group-hover:opacity-100 transition-opacity p-1'>
                        <GripHorizontal className='h-4 w-4 text-muted-foreground' />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </div>
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
