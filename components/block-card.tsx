"use client"

import { BlockLibraryEntry } from '@/types/block-library'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Share, Star, Edit, Download, Play, MoreHorizontal } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'
import { incrementBlockUsage } from '@/lib/block-library-api'

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

  return (
    <Card className="h-full flex flex-col transition-all hover:shadow-md">
      <CardHeader>
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="truncate flex-1">{block.name}</CardTitle>
          {block.isVerified && (
            <Badge variant="default" className="bg-green-600 text-white">
              Verified
            </Badge>
          )}
        </div>
        <CardDescription className="line-clamp-2">{block.description}</CardDescription>
      </CardHeader>
      
      <CardContent className="flex-grow">
        <div className="space-y-4">
          <div>
            <div className="text-sm font-medium mb-1 text-muted-foreground">Block Type</div>
            <Badge variant="outline" className="capitalize">
              {block.blockType.replace('DEFI_', '').replace('_', ' ').toLowerCase()}
            </Badge>
          </div>
          
          {block.tags && block.tags.length > 0 && (
            <div>
              <div className="text-sm font-medium mb-1 text-muted-foreground">Tags</div>
              <div className="flex flex-wrap gap-1">
                {block.tags.slice(0, 3).map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {block.tags.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{block.tags.length - 3}
                  </Badge>
                )}
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
            <div className="flex items-center">
              <Star className="h-3.5 w-3.5 mr-1 text-yellow-500" 
                    fill={block.rating > 0 ? 'currentColor' : 'none'} />
              <span>{block.rating.toFixed(1)}</span>
            </div>
            <div className="flex items-center justify-end">
              <span>Used {block.usageCount} times</span>
            </div>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="border-t pt-4">
        <div className="flex justify-between w-full">
          <Button variant="default" onClick={handleUse}>
            <Play className="mr-2 h-4 w-4" />
            Use Block
          </Button>
          
          <div className="flex space-x-2">
            {isOwner && (
              <Button 
                variant="outline" 
                size="icon" 
                onClick={handleEdit}
                aria-label="Edit Block"
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon"
                  aria-label="More Options"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleShare}>
                  <Share className="mr-2 h-4 w-4" />
                  Share
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
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}
