"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getUserBlockLibrary, saveBlock, searchBlocks } from '@/lib/block-library-api'
import { BlockLibraryEntry, SearchBlocksParams } from '@/types/block-library'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BlockType } from '@/types/workflow'
import { Badge } from '@/components/ui/badge'
import { Loader2, Search, Filter, Star, Share, Plus } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

// Block Card Component for displaying blocks in the library
const BlockCard = ({ block, onUse, onEdit, onShare, isOwner }: { 
  block: BlockLibraryEntry; 
  onUse: () => void;
  onEdit: () => void;
  onShare: () => void;
  isOwner: boolean;
}) => {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="truncate">{block.name}</span>
          {block.isVerified && (
            <Badge variant="default" className="bg-green-600">Verified</Badge>
          )}
        </CardTitle>
        <CardDescription className="line-clamp-2">{block.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="space-y-4">
          <div>
            <div className="text-sm font-medium mb-1">Type</div>
            <Badge variant="outline">{block.blockType}</Badge>
          </div>
          
          {block.tags.length > 0 && (
            <div>
              <div className="text-sm font-medium mb-1">Tags</div>
              <div className="flex flex-wrap gap-1">
                {block.tags.slice(0, 3).map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs">
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
          
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center">
              <Star className="h-4 w-4 mr-1 fill-yellow-400 text-yellow-400" />
              <span>{block.rating.toFixed(1)}</span>
            </div>
            <div>Used {block.usageCount} times</div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="border-t pt-4">
        <div className="flex justify-between w-full">
          <Button variant="default" onClick={onUse}>
            Use Block
          </Button>
          <div className="flex space-x-2">
            {isOwner && (
              <Button variant="outline" size="icon" onClick={onEdit} title="Edit Block">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
              </Button>
            )}
            <Button variant="outline" size="icon" onClick={onShare} title="Share Block">
              <Share className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}

export default function BlockLibraryPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('your-blocks')
  const [loading, setLoading] = useState(true)
  const [userBlocks, setUserBlocks] = useState<BlockLibraryEntry[]>([])
  const [sharedBlocks, setSharedBlocks] = useState<BlockLibraryEntry[]>([])
  const [verifiedBlocks, setVerifiedBlocks] = useState<BlockLibraryEntry[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBlockType, setSelectedBlockType] = useState<BlockType | undefined>(undefined)
  const [includePublic, setIncludePublic] = useState(true)
  const [includeVerified, setIncludeVerified] = useState(true)
  const [sortBy, setSortBy] = useState<'rating' | 'usageCount' | 'createdAt'>('createdAt')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [availableTags, setAvailableTags] = useState<string[]>([])

  useEffect(() => {
    loadBlockLibrary()
  }, [])

  const loadBlockLibrary = async () => {
    try {
      setLoading(true)
      const library = await getUserBlockLibrary()
      setUserBlocks(library.userBlocks)
      setSharedBlocks(library.sharedBlocks)
      setVerifiedBlocks(library.verifiedBlocks)
      
      // Extract unique tags from all blocks
      const allTags = [...library.userBlocks, ...library.sharedBlocks, ...library.verifiedBlocks]
        .flatMap(block => block.tags)
        .filter((tag, index, self) => self.indexOf(tag) === index)
      setAvailableTags(allTags)
    } catch (error) {
      console.error('Failed to load block library:', error)
      toast({
        title: 'Error loading block library',
        description: 'Failed to load your blocks. Please try again later.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async () => {
    try {
      setLoading(true)
      
      const params: SearchBlocksParams = {
        query: searchQuery,
        blockType: selectedBlockType,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        includePublic,
        includeVerified,
        sortBy,
        sortDirection
      }
      
      const results = await searchBlocks(params)
      
      // Get the current user ID from supabase auth
      const supabase = createClient()
      const { data: userData } = await supabase.auth.getUser()
      const currentUserId = userData?.user?.id || 'unknown'
      
      // Categorize results
      const userResults = results.filter(block => block.userId === currentUserId)
      const verifiedResults = results.filter(block => block.isVerified)
      const sharedResults = results.filter(block => 
        block.userId !== currentUserId && !block.isVerified && block.isPublic
      )
      
      setUserBlocks(userResults)
      setVerifiedBlocks(verifiedResults)
      setSharedBlocks(sharedResults)
      
      toast({
        title: 'Search completed',
        description: `Found ${results.length} blocks matching your criteria.`
      })
    } catch (error) {
      console.error('Search failed:', error)
      toast({
        title: 'Search failed',
        description: 'Failed to search blocks. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleToggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  const handleCreateBlock = () => {
    router.push('/blocks/create')
  }

  const renderBlockGrid = (blocks: BlockLibraryEntry[]) => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )
    }
    
    if (blocks.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <p className="text-muted-foreground mb-4">No blocks found</p>
          {activeTab === 'your-blocks' && (
            <Button onClick={handleCreateBlock}>
              <Plus className="mr-2 h-4 w-4" /> Create a new block
            </Button>
          )}
        </div>
      )
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {blocks.map(block => (
          <BlockCard 
            key={block.id}
            block={block}
            onUse={() => router.push(`/blocks/${block.id}`)}
            onEdit={() => router.push(`/blocks/edit/${block.id}`)}
            onShare={() => router.push(`/blocks/share/${block.id}`)}
            isOwner={block.userId === 'current-user-id'} // Will be replaced with actual user ID check
          />
        ))}
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Block Library</h1>
          <p className="text-muted-foreground">Browse, search, and manage your custom DeFi blocks</p>
        </div>
        <Button onClick={handleCreateBlock}>
          <Plus className="mr-2 h-4 w-4" /> Create New Block
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
          <CardDescription>Find blocks by name, type, or tags</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search blocks..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="w-full md:w-1/4">
                <Select 
                  value={selectedBlockType} 
                  onValueChange={(val) => setSelectedBlockType(val as BlockType)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Block Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Types</SelectItem>
                    <SelectItem value={BlockType.DEFI_PRICE_MONITOR}>Price Monitor</SelectItem>
                    <SelectItem value={BlockType.DEFI_SWAP}>Swap</SelectItem>
                    <SelectItem value={BlockType.DEFI_YIELD_STRATEGY}>Yield Strategy</SelectItem>
                    <SelectItem value={BlockType.DEFI_PORTFOLIO}>Portfolio</SelectItem>
                    <SelectItem value={BlockType.DEFI_PROTOCOL}>Protocol Monitor</SelectItem>
                    <SelectItem value={BlockType.DEFI_GAS}>Gas Optimizer</SelectItem>
                    <SelectItem value={BlockType.DEFI_LIQUIDITY}>Liquidity</SelectItem>
                    <SelectItem value={BlockType.DEFI_POSITION}>Position Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="w-full md:w-1/4">
                <Select
                  value={sortBy}
                  onValueChange={(val) => setSortBy(val as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="createdAt">Date Created</SelectItem>
                    <SelectItem value="rating">Rating</SelectItem>
                    <SelectItem value="usageCount">Usage Count</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button onClick={handleSearch}>
                <Filter className="mr-2 h-4 w-4" /> Apply Filters
              </Button>
            </div>
            
            <div>
              <h3 className="text-sm font-medium mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {availableTags.slice(0, 10).map(tag => (
                  <Badge 
                    key={tag}
                    variant={selectedTags.includes(tag) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => handleToggleTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
                {availableTags.length > 10 && (
                  <Badge variant="outline">+{availableTags.length - 10} more</Badge>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="includePublic" 
                  checked={includePublic}
                  onCheckedChange={() => setIncludePublic(!includePublic)}
                />
                <Label htmlFor="includePublic">Include shared blocks</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="includeVerified" 
                  checked={includeVerified}
                  onCheckedChange={() => setIncludeVerified(!includeVerified)}
                />
                <Label htmlFor="includeVerified">Include verified blocks</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Select
                  value={sortDirection}
                  onValueChange={(val) => setSortDirection(val as 'asc' | 'desc')}
                >
                  <SelectTrigger className="w-28">
                    <SelectValue placeholder="Order" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Descending</SelectItem>
                    <SelectItem value="asc">Ascending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Tabs defaultValue="your-blocks" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="your-blocks">
            Your Blocks ({userBlocks.length})
          </TabsTrigger>
          <TabsTrigger value="shared-blocks">
            Shared Blocks ({sharedBlocks.length})
          </TabsTrigger>
          <TabsTrigger value="verified-blocks">
            Verified Blocks ({verifiedBlocks.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="your-blocks" className="space-y-4 mt-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Your Blocks</h2>
            <Button variant="outline" onClick={handleCreateBlock}>
              <Plus className="mr-2 h-4 w-4" /> Create New
            </Button>
          </div>
          {renderBlockGrid(userBlocks)}
        </TabsContent>
        
        <TabsContent value="shared-blocks" className="space-y-4 mt-6">
          <h2 className="text-xl font-semibold">Shared Blocks</h2>
          {renderBlockGrid(sharedBlocks)}
        </TabsContent>
        
        <TabsContent value="verified-blocks" className="space-y-4 mt-6">
          <h2 className="text-xl font-semibold">Verified Blocks</h2>
          {renderBlockGrid(verifiedBlocks)}
        </TabsContent>
      </Tabs>
    </div>
  )
}
