"use client"

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { BlockLibraryEntry } from '@/types/block-library'
import { incrementBlockUsage, rateBlock } from '@/lib/block-library-api'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Loader2, ArrowLeft, Copy, Check, Download, ThumbsUp, Send, AlertTriangle } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import Link from 'next/link'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function SharedBlockViewPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const shareId = searchParams.get('id') || ''
  const blockId = shareId.replace('share_', '')
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [block, setBlock] = useState<BlockLibraryEntry | null>(null)
  const [rating, setRating] = useState(0)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isRatingSubmitting, setIsRatingSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)
  
  useEffect(() => {
    loadBlock()
  }, [blockId])

  const loadBlock = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Verify shareId format
      if (!shareId.startsWith('share_')) {
        setError('Invalid share ID format')
        return
      }
      
      const supabase = createClient()
      
      // Get the block details
      const { data, error } = await supabase
        .from('block_library')
        .select('*')
        .eq('id', blockId)
        .eq('is_public', true)
        .single()
        
      if (error || !data) {
        console.error('Error fetching block:', error)
        setError('Block not found or is not publicly available')
        return
      }
      
      // Transform to camelCase
      const transformedBlock: BlockLibraryEntry = {
        id: data.id,
        userId: data.user_id,
        name: data.name,
        description: data.description,
        blockType: data.block_type,
        category: data.category || '',
        blockData: data.block_data,
        isPublic: data.is_public,
        tags: data.tags || [],
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        rating: data.rating || 0,
        usageCount: data.usage_count || 0,
        version: data.version || '1.0.0',
        isVerified: data.is_verified || false
      }
      
      setBlock(transformedBlock)
      
    } catch (err) {
      console.error('Error loading block:', err)
      setError('An error occurred while loading the block')
    } finally {
      setLoading(false)
    }
  }

  const handleUseBlock = async () => {
    if (!block) return
    
    try {
      // Increment usage count
      await incrementBlockUsage(block.id)
      
      // Redirect to workflow builder with this block
      router.push(`/workflows/builder?block=${block.id}`)
      
    } catch (error) {
      console.error('Error using block:', error)
      toast({
        title: 'Error',
        description: 'Failed to use this block. Please try again.',
        variant: 'destructive'
      })
    }
  }

  const handleDownload = () => {
    if (!block) return
    
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
    
    toast({
      title: 'Block downloaded',
      description: 'The block definition has been downloaded as a JSON file.'
    })
  }

  const handleRatingSubmit = async () => {
    if (!block || rating === 0) return
    
    try {
      setIsRatingSubmitting(true)
      
      await rateBlock(block.id, rating)
      
      toast({
        title: 'Thank you!',
        description: 'Your rating has been submitted.'
      })
      
      setIsDialogOpen(false)
      
      // Update the block's rating in the UI
      setBlock({
        ...block,
        rating: (block.rating * block.usageCount + rating) / (block.usageCount + 1)
      })
      
    } catch (error) {
      console.error('Error rating block:', error)
      toast({
        title: 'Rating failed',
        description: 'Failed to submit rating. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsRatingSubmitting(false)
    }
  }

  const copyShareUrl = () => {
    const url = window.location.href
    navigator.clipboard.writeText(url)
    
    setCopied(true)
    
    toast({
      title: 'Copied to clipboard',
      description: 'The share link has been copied to your clipboard.'
    })
    
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="container flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="container py-6 max-w-3xl">
        <div className="mb-4">
          <Link href="/blocks/shared" className="flex items-center text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Community Blocks
          </Link>
        </div>
        
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        
        <Button variant="default" asChild>
          <Link href="/blocks/shared">Browse Community Blocks</Link>
        </Button>
      </div>
    )
  }

  if (!block) {
    return (
      <div className="container py-6 max-w-3xl">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Not Found</AlertTitle>
          <AlertDescription>The requested block could not be found.</AlertDescription>
        </Alert>
      </div>
    )
  }

  const getBlockTypeLabel = (type: string) => {
    return type.replace('DEFI_', '').replace('_', ' ').toLowerCase()
  }

  return (
    <div className="container py-6 max-w-3xl space-y-6">
      <div className="mb-4">
        <Link href="/blocks/shared" className="flex items-center text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Community Blocks
        </Link>
      </div>
      
      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight">{block.name}</h1>
            {block.isVerified && (
              <Badge variant="default" className="bg-green-600">Verified</Badge>
            )}
          </div>
          <p className="text-muted-foreground">{block.description}</p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-6">
          <div className="md:w-2/3 space-y-4">
            <Tabs defaultValue="details">
              <TabsList>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="configuration">Configuration</TabsTrigger>
                <TabsTrigger value="code">Code</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="space-y-4 p-4">
                <div>
                  <h3 className="text-lg font-medium mb-2">About this block</h3>
                  <p className="text-sm text-muted-foreground">{block.description}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-1">Block Type</h4>
                  <Badge variant="outline" className="capitalize">
                    {getBlockTypeLabel(block.blockType)}
                  </Badge>
                </div>
                
                {block.tags && block.tags.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Tags</h4>
                    <div className="flex flex-wrap gap-1">
                      {block.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium mb-1">Rating</h4>
                    <div className="flex items-center">
                      <div className="flex items-center">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <svg 
                            key={star} 
                            xmlns="http://www.w3.org/2000/svg" 
                            viewBox="0 0 24 24" 
                            fill={star <= Math.round(block.rating) ? "currentColor" : "none"}
                            stroke="currentColor" 
                            className="w-4 h-4 text-yellow-500"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                        ))}
                      </div>
                      <span className="ml-2">{block.rating.toFixed(1)}</span>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-1">Used</h4>
                    <span>{block.usageCount} times</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium mb-1">Version</h4>
                    <span>{block.version}</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-1">Created</h4>
                    <span>{new Date(block.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="configuration" className="p-4">
                <h3 className="text-lg font-medium mb-2">Block Configuration</h3>
                <div className="bg-muted rounded-md p-3 overflow-auto max-h-[400px]">
                  <pre className="text-xs">
                    {JSON.stringify(block.blockData.configuration, null, 2)}
                  </pre>
                </div>
              </TabsContent>
              
              <TabsContent value="code" className="p-4">
                <h3 className="text-lg font-medium mb-2">Execution Code</h3>
                <div className="bg-muted rounded-md p-3 overflow-auto max-h-[400px]">
                  <pre className="text-xs">
                    {block.blockData.executionCode || 'No code available'}
                  </pre>
                </div>
              </TabsContent>
            </Tabs>
          </div>
          
          <div className="md:w-1/3 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Use This Block</CardTitle>
                <CardDescription>
                  Add this block to your workflow or download it
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button className="w-full" onClick={handleUseBlock}>
                  Use in Workflow
                </Button>
                
                <Button variant="outline" className="w-full" onClick={handleDownload}>
                  <Download className="mr-2 h-4 w-4" />
                  Download JSON
                </Button>
              </CardContent>
              <CardFooter className="flex flex-col space-y-4">
                <Button variant="outline" className="w-full" onClick={copyShareUrl}>
                  {copied ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy Share Link
                    </>
                  )}
                </Button>
                
                <Button variant="secondary" className="w-full" onClick={() => setIsDialogOpen(true)}>
                  <ThumbsUp className="mr-2 h-4 w-4" />
                  Rate This Block
                </Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Similar Blocks</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Find more blocks like this in the library
                </p>
                <div className="mt-2 space-y-2">
                  <Button variant="link" className="h-auto p-0" asChild>
                    <Link href={`/blocks/shared?type=${block.blockType}`}>
                      View similar {getBlockTypeLabel(block.blockType)} blocks
                    </Link>
                  </Button>
                  
                  {block.tags && block.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {block.tags.slice(0, 3).map((tag, index) => (
                        <Button key={index} variant="outline" size="sm" asChild>
                          <Link href={`/blocks/shared?tag=${encodeURIComponent(tag)}`}>
                            {tag}
                          </Link>
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Rating Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rate this block</DialogTitle>
            <DialogDescription>
              How would you rate the quality of this block?
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex justify-center py-4">
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className="group"
                  onClick={() => setRating(star)}
                  aria-label={`Rate ${star} out of 5 stars`}
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 24 24" 
                    fill={star <= rating ? "currentColor" : "none"}
                    stroke="currentColor" 
                    className="w-8 h-8 text-yellow-500 transition-all hover:scale-110"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleRatingSubmit} 
              disabled={rating === 0 || isRatingSubmitting}
            >
              {isRatingSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Submit Rating
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
