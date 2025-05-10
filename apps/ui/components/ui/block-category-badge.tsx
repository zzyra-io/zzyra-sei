"use client";

import { Badge, BadgeProps } from "@/components/ui/badge";
import { NodeCategory } from "@zyra/types";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";
import {
  Zap,
  Activity,
  BrainCircuit,
  Coins,
  Database,
  Send,
  SlidersHorizontal,
} from "lucide-react";

type CategoryColors = {
  background: string;
  text: string;
  border: string;
  hoverBackground: string;
};

// Color mapping for each category
const categoryColorMap: Record<NodeCategory, CategoryColors> = {
  [NodeCategory.TRIGGER]: {
    background: "bg-blue-100 dark:bg-blue-950",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-800",
    hoverBackground: "hover:bg-blue-200 dark:hover:bg-blue-900",
  },
  [NodeCategory.ACTION]: {
    background: "bg-green-100 dark:bg-green-950",
    text: "text-green-700 dark:text-green-300",
    border: "border-green-200 dark:border-green-800",
    hoverBackground: "hover:bg-green-200 dark:hover:bg-green-900",
  },
  [NodeCategory.LOGIC]: {
    background: "bg-purple-100 dark:bg-purple-950",
    text: "text-purple-700 dark:text-purple-300",
    border: "border-purple-200 dark:border-purple-800",
    hoverBackground: "hover:bg-purple-200 dark:hover:bg-purple-900",
  },
  [NodeCategory.FINANCE]: {
    background: "bg-amber-100 dark:bg-amber-950",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800",
    hoverBackground: "hover:bg-amber-200 dark:hover:bg-amber-900",
  },
};

// Icon mapping for each category
const categoryIconMap: Record<NodeCategory, ReactNode> = {
  [NodeCategory.TRIGGER]: <Zap className='h-3 w-3 mr-1' />,
  [NodeCategory.ACTION]: <Activity className='h-3 w-3 mr-1' />,
  [NodeCategory.LOGIC]: <BrainCircuit className='h-3 w-3 mr-1' />,
  [NodeCategory.FINANCE]: <Coins className='h-3 w-3 mr-1' />,
};

// Additional mapping for common block types
const blockTypeIconMap: Record<string, ReactNode> = {
  email: <Send className='h-3 w-3 mr-1' />,
  database: <Database className='h-3 w-3 mr-1' />,
  custom: <SlidersHorizontal className='h-3 w-3 mr-1' />,
};

interface BlockCategoryBadgeProps extends Omit<BadgeProps, "ref"> {
  category: NodeCategory;
  showIcon?: boolean;
  blockType?: string;
}

export function BlockCategoryBadge({
  category,
  showIcon = true,
  blockType,
  className,
  ...props
}: BlockCategoryBadgeProps) {
  const colors =
    categoryColorMap[category] || categoryColorMap[NodeCategory.ACTION];

  // Determine which icon to use
  let icon = showIcon ? categoryIconMap[category] : null;
  if (showIcon && blockType && blockTypeIconMap[blockType.toLowerCase()]) {
    icon = blockTypeIconMap[blockType.toLowerCase()];
  }

  return (
    <Badge
      variant='outline'
      className={cn(
        colors.background,
        colors.text,
        colors.border,
        colors.hoverBackground,
        "font-medium transition-colors",
        className
      )}
      {...props}>
      {icon}
      {category}
    </Badge>
  );
}

interface BlockTypeBadgeProps extends Omit<BadgeProps, "ref"> {
  blockType: string;
}

export function BlockTypeBadge({
  blockType,
  className,
  ...props
}: BlockTypeBadgeProps) {
  // Get icon based on block type
  let icon = null;
  if (blockTypeIconMap[blockType.toLowerCase()]) {
    icon = blockTypeIconMap[blockType.toLowerCase()];
  }

  return (
    <Badge
      variant='secondary'
      className={cn(
        "font-mono text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300",
        className
      )}
      {...props}>
      {icon}
      {blockType}
    </Badge>
  );
}
