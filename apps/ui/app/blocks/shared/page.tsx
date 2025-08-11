"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BlockLibraryEntry } from "@/types/block-library";
import { BlockType } from "@zzyra/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Loader2, Search } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BlockCard } from "@/components/block-card";

function SharedBlocksPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const shareId = searchParams.get("id");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sharedBlocks, setSharedBlocks] = useState<BlockLibraryEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBlockType, setSelectedBlockType] = useState<
    BlockType | undefined
  >(undefined);

  useEffect(() => {
    // If we have a specific block ID, redirect to the block view
    if (shareId) {
      router.push(`/blocks/shared/view?id=${shareId}`);
      return;
    }

    loadSharedBlocks();
  }, [shareId, router]);

  const loadSharedBlocks = async () => {
    try {
      setLoading(true);

      // Get public shared blocks

      if (error) {
        console.error("Error fetching shared blocks:", error);
        setError("Failed to load shared blocks");
        return;
      }

      // Transform data
      const transformedBlocks = ([] as any[]).map((block) => ({
        id: block.id,
        userId: block.user_id,
        name: block.name,
        description: block.description,
        blockType: block.block_type as BlockType,
        category: block.category || "",
        blockData: block.block_data,
        isPublic: block.is_public,
        tags: block.tags || [],
        createdAt: block.created_at,
        updatedAt: block.updated_at,
        rating: block.rating || 0,
        usageCount: block.usage_count || 0,
        version: block.version || "1.0.0",
        isVerified: block.is_verified || false,
      }));

      setSharedBlocks(transformedBlocks);
    } catch (err) {
      console.error("Error loading shared blocks:", err);
      setError("An error occurred while loading shared blocks");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    // Filter blocks based on search query and selected block type
    const filteredBlocks = sharedBlocks.filter((block) => {
      const matchesQuery =
        searchQuery === "" ||
        block.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        block.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        block.tags.some((tag) =>
          tag.toLowerCase().includes(searchQuery.toLowerCase())
        );

      const matchesType =
        !selectedBlockType || block.blockType === selectedBlockType;

      return matchesQuery && matchesType;
    });

    setSharedBlocks(filteredBlocks);
  };

  const handleBlockTypeFilter = (blockType: BlockType | undefined) => {
    setSelectedBlockType(blockType);

    // Reload blocks if we're clearing the filter
    if (!blockType) {
      loadSharedBlocks();
      return;
    }

    // Otherwise filter the existing blocks
    const filteredBlocks = sharedBlocks.filter(
      (block) => block.blockType === blockType
    );
    setSharedBlocks(filteredBlocks);
  };

  if (loading) {
    return (
      <div className='container flex items-center justify-center min-h-[400px]'>
        <Loader2 className='h-10 w-10 animate-spin text-primary' />
      </div>
    );
  }

  if (error) {
    return (
      <div className='container py-6 max-w-6xl'>
        <div className='mb-4'>
          <Link
            href='/blocks/library'
            className='flex items-center text-muted-foreground hover:text-foreground transition-colors'>
            <ArrowLeft className='h-4 w-4 mr-2' />
            Back to Library
          </Link>
        </div>

        <Alert variant='destructive' className='mb-4'>
          <AlertTriangle className='h-4 w-4' />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>

        <Button variant='default' asChild>
          <Link href='/blocks/library'>Browse Your Library</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className='container py-6 max-w-6xl space-y-6'>
      <div className='mb-4'>
        <Link
          href='/blocks/library'
          className='flex items-center text-muted-foreground hover:text-foreground transition-colors'>
          <ArrowLeft className='h-4 w-4 mr-2' />
          Back to Library
        </Link>
      </div>

      <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>
            Community Blocks
          </h1>
          <p className='text-muted-foreground'>
            Browse and use DeFi blocks shared by the community
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
          <CardDescription>Find blocks by name, type, or tags</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            <div className='flex flex-col md:flex-row gap-4'>
              <div className='flex-1'>
                <div className='relative'>
                  <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
                  <Input
                    type='text'
                    placeholder='Search blocks...'
                    className='pl-8'
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSearch();
                      }
                    }}
                  />
                </div>
              </div>

              <div className='w-full md:w-1/4'>
                <select
                  className='w-full h-10 px-3 py-2 border rounded-md'
                  value={selectedBlockType || ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    handleBlockTypeFilter(
                      value ? (value as BlockType) : undefined
                    );
                  }}>
                  <option value=''>All Block Types</option>
                  {Object.values(BlockType)
                    .filter((type) => type.startsWith("DEFI_"))
                    .map((type) => (
                      <option key={type} value={type}>
                        {type.replace("DEFI_", "").replace("_", " ")}
                      </option>
                    ))}
                </select>
              </div>

              <Button onClick={handleSearch}>Search</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className='space-y-4'>
        <div className='flex items-center justify-between'>
          <h2 className='text-xl font-semibold'>Featured Blocks</h2>
          <span className='text-sm text-muted-foreground'>
            {sharedBlocks.length} blocks found
          </span>
        </div>

        {sharedBlocks.length === 0 ? (
          <div className='text-center py-12'>
            <p className='text-muted-foreground mb-4'>
              No blocks found matching your criteria
            </p>
            <Button variant='outline' onClick={loadSharedBlocks}>
              Reset Filters
            </Button>
          </div>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
            {sharedBlocks.map((block) => (
              <BlockCard
                key={block.id}
                block={block}
                isOwner={false}
                onUse={() =>
                  router.push(`/blocks/shared/view?id=share_${block.id}`)
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SharedBlocksPage() {
  return (
    <Suspense
      fallback={
        <div className='flex justify-center py-12'>
          <Loader2 className='h-8 w-8 animate-spin' />
        </div>
      }>
      <SharedBlocksPageContent />
    </Suspense>
  );
}
