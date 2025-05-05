"use client"

import { BlockLibraryEntry } from '@/types/block-library'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Share, Star, Edit, Download, Play, MoreHorizontal, Info, ExternalLink, Copy, Bookmark } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useToast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'
import { incrementBlockUsage } from '@/lib/block-library-api'
import { BlockCategoryBadge, BlockTypeBadge } from '@/components/ui/block-category-badge'
import { NodeCategory } from '@/types/workflow'
import { cn } from '@/lib/utils'
import { useState } from 'react'

interface BlockCardProps {
  block: BlockLibraryEntry
  onUse?: () => void
  onEdit?: () => void
  onShare?: () => void
  isOwner: boolean
}

export function BlockCard({ block, onUse, onEdit, onShare, isOwner }: BlockCardProps) {
  const { toast } = useToast()
  const router = useRouter()

  const handleUse = async () => {
    try {
      // Increment the usage count
      await incrementBlockUsage(block.id)
      
      // Call the onUse prop if provided
      if (onUse) {
        onUse()
      } else {
        // Default behavior: redirect to workflow builder with this block
        router.push(`/workflows/builder?block=${block.id}`)
      }
    } catch (error) {
      console.error('Error using block:', error)
      toast({
        title: 'Error',
        description: 'Failed to use this block. Please try again.',
        variant: 'destructive'
      })
    }
  }

  const handleShare = () => {
    if (onShare) {
      onShare()
    } else {
      router.push(`/blocks/share/${block.id}`)
    }
  }

  const handleEdit = () => {
    if (onEdit) {
      onEdit()
    } else {
      router.push(`/blocks/edit/${block.id}`)
    }
  }

  const [isHovered, setIsHovered] = useState(false)
  
  // Determine category - if not specified, infer from blockType
  const category = block.category || 
    (block.blockType.startsWith('DEFI') ? NodeCategory.FINANCE : 
     block.blockType.includes('CONDITION') ? NodeCategory.LOGIC : 
     block.blockType.includes('SCHEDULE') || block.blockType.includes('TRIGGER') ? NodeCategory.TRIGGER :
     NodeCategory.ACTION);
  
  // Format block type for display
  const displayBlockType = block.blockType
    .replace('DEFI_', '')
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
    
  return (
    <TooltipProvider delayDuration={300}>
      <Card 
        className={cn(
          "h-full flex flex-col transition-all duration-150",
          "border-l-4",
          category === NodeCategory.FINANCE ? "border-l-amber-400" : 
          category === NodeCategory.LOGIC ? "border-l-purple-400" :
          category === NodeCategory.TRIGGER ? "border-l-blue-400" :
          "border-l-green-400",
          isHovered ? "shadow-md translate-y-[-2px]" : "shadow-sm"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start gap-2">
            <CardTitle className="truncate flex-1 flex items-center">
              {block.name}
              {block.isVerified && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="default" className="ml-2 bg-green-600 text-white">
                      <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Verified
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-sm">This block has been verified by the Zyra team</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </CardTitle>
          </div>
          <CardDescription className="line-clamp-2">{block.description}</CardDescription>
        </CardHeader>
        
        <CardContent className="flex-grow pt-0">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <div>
                <div className="text-xs font-medium mb-1 text-muted-foreground">Type</div>
                <BlockTypeBadge blockType={displayBlockType} />
              </div>
              
              <div>
                <div className="text-xs font-medium mb-1 text-muted-foreground">Category</div>
                <BlockCategoryBadge category={category} />
              </div>
            </div>
            
            {block.tags && block.tags.length > 0 && (
              <div>
                <div className="text-xs font-medium mb-1 text-muted-foreground">Tags</div>
                <div className="flex flex-wrap gap-1">
                  {block.tags.slice(0, 3).map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {block.tags.length > 3 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="secondary" className="text-xs cursor-help">
                          +{block.tags.length - 3}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-xs flex flex-wrap gap-1 max-w-[200px]">
                          {block.tags.slice(3).map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center cursor-help">
                    <Star className="h-3.5 w-3.5 mr-1 text-yellow-500" 
                          fill={block.rating > 0 ? 'currentColor' : 'none'} />
                    <span>{block.rating.toFixed(1)}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">Rating based on user feedback</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-end cursor-help">
                    <span>Used {block.usageCount} times</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">Number of times this block has been used in workflows</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </CardContent>
      
      <CardFooter className="border-t pt-4">
        <div className="flex justify-between w-full">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="default" 
                onClick={handleUse}
                className="group relative overflow-hidden transition-all"
              >
                <div className="relative z-10 flex items-center">
                  <Play className="mr-2 h-4 w-4 transition-transform group-hover:scale-110" />
                  Use Block
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-primary opacity-0 group-hover:opacity-100 transition-opacity" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">Add this block to your workflow</p>
            </TooltipContent>
          </Tooltip>
          
          <div className="flex space-x-2">
            {isOwner && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={handleEdit}
                    aria-label="Edit Block"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">Edit this block</p>
                </TooltipContent>
              </Tooltip>
            )}
            
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="icon"
                      aria-label="More Options"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">More options</p>
                </TooltipContent>
              </Tooltip>
              
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={handleShare}>
                  <Share className="mr-2 h-4 w-4" />
                  Share
                </DropdownMenuItem>
                
                <DropdownMenuItem onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(block.blockData, null, 2))
                  toast({
                    title: "Block copied to clipboard",
                    description: "Block data copied as JSON",
                  })
                }}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy JSON
                </DropdownMenuItem>
                
                <DropdownMenuItem onClick={() => {
                  // Download the block definition as JSON
                  const dataStr = `data:text/json;charset=utf-8,${encodeURIComponent(
                    JSON.stringify(block.blockData, null, 2)
                  )}`
                  const downloadAnchorNode = document.createElement('a')
                  downloadAnchorNode.setAttribute('href', dataStr)
                  downloadAnchorNode.setAttribute('download', `${block.name.replace(/\s+/g, '_')}.json`)
                  document.body.appendChild(downloadAnchorNode)
                  downloadAnchorNode.click()
                  downloadAnchorNode.remove()
                }}>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem onClick={() => {
                  toast({
                    title: "Block saved to favorites",
                    description: "Added to your favorites list"
                  })
                }}>
                  <Bookmark className="mr-2 h-4 w-4" />
                  Add to Favorites
                </DropdownMenuItem>
                
                <DropdownMenuItem onClick={() => {
                  router.push(`/blocks/shared/view/${block.id}`)
                }}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
                
                <DropdownMenuItem onClick={() => {
                  router.push(`/docs/blocks/${block.blockType.toLowerCase()}`)
                }}>
                  <Info className="mr-2 h-4 w-4" />
                  Documentation
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardFooter>
    </Card>
    </TooltipProvider>
  )
}
