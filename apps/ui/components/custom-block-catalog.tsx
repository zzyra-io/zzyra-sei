"use client";

import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Sparkles,
  Loader2,
  MoreHorizontal,
  Copy,
  Trash2,
  Edit,
  Search as SearchIcon,
} from "lucide-react";
import { CustomBlockDefinition, LogicType } from "@zyra/types";
import { CustomBlockBuilderDialog } from "@/components/custom-block-builder-dialog";
import { BlockType } from "@zyra/types";

interface Props {
  blocks: CustomBlockDefinition[];
  onAddBlock: (b: CustomBlockDefinition) => void;
  onEdit: (b: CustomBlockDefinition) => void;
  onDuplicate: (b: CustomBlockDefinition) => void;
  onDelete: (b: CustomBlockDefinition) => void;
  onDragStart?: (e: React.DragEvent, b: CustomBlockDefinition) => void;
  onGenerateCustomBlock: (prompt: string) => Promise<void>;
}

export function CustomBlockCatalog({
  blocks = [],
  onAddBlock,
  onEdit,
  onDuplicate,
  onDelete,
  onDragStart,
  onGenerateCustomBlock,
}: Props) {
  const { toast } = useToast();
  const [category, setCategory] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editBlock, setEditBlock] = useState<CustomBlockDefinition | undefined>(
    undefined
  );
  const [deleteBlock, setDeleteBlock] = useState<CustomBlockDefinition | null>(
    null
  );
  const [aiOpen, setAiOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const promptRef = useRef<HTMLTextAreaElement>(null);

  const categories = [
    "all",
    ...Array.from(new Set(blocks.map((b) => b.category))),
  ];
  const filtered = blocks.filter(
    (b) =>
      (category === "all" || b.category === category) &&
      (b.name.toLowerCase().includes(search.toLowerCase()) ||
        b.description.toLowerCase().includes(search.toLowerCase()))
  );

  const handleDrag = (e: React.DragEvent, b: CustomBlockDefinition) => {
    const data = JSON.stringify({
      type: "custom", // Ensure node type is always 'custom'
      blockType: b.category,
      customBlockId: b.id,
      customBlockDefinition: b,
    });
    e.dataTransfer.setData("application/reactflow/metadata", data);
    e.dataTransfer.setData("application/reactflow/type", b.category);
    e.dataTransfer.effectAllowed = "move";
    onDragStart?.(e, b);
  };

  const handleSave = (b: CustomBlockDefinition) => {
    if (editBlock) {
      onEdit(b);
    } else {
      onAddBlock(b);
    }
    setBuilderOpen(false);
    setEditBlock(undefined);
  };

  const confirmDelete = () => {
    if (deleteBlock) {
      onDelete(deleteBlock);
      toast({ title: "Deleted", description: `${deleteBlock.name} removed` });
      setDeleteBlock(null);
    }
  };

  const handleAiConfirm = async () => {
    const prompt = promptRef.current?.value;
    if (!prompt) return toast({ title: "Enter prompt" });
    try {
      setGenerating(true);
      await onGenerateCustomBlock(prompt);
      toast({ title: "Created by AI" });
      setAiOpen(false);
      promptRef.current.value = "";
    } catch {
      toast({ title: "AI Failed", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const badgeText = (t: LogicType) =>
    ({
      [LogicType.JAVASCRIPT]: "JS",
      [LogicType.JSON_TRANSFORM]: "JSON",
      [LogicType.TEMPLATE]: "TPL",
      [LogicType.CONDITION]: "IF",
    })[t] || "?";

  return (
    <div className='space-y-2'>
      <div className='flex items-center space-x-2 pb-1 border-b border-muted-foreground/10'>
        <Tabs value={category} onValueChange={setCategory}>
          <TabsList className='bg-muted/30 rounded-md'>
            {categories.map((cat) => (
              <TabsTrigger
                key={cat}
                value={cat}
                className='text-xs py-1 rounded-md data-[state=active]:bg-primary/10 data-[state=active]:text-primary'>
                {cat}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className='flex-1 relative'>
          <SearchIcon className='absolute left-2 top-2 h-4 w-4 text-muted-foreground' />
          <Input
            className='pl-7 h-8 rounded-md border border-muted-foreground/10 text-sm bg-muted/40 focus:ring-1 focus:ring-primary'
            placeholder='Search blocks'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button
          onClick={() => {
            setEditBlock(undefined);
            setBuilderOpen(true);
          }}
          className='h-8 px-3 text-xs'>
          <Plus className='mr-1 w-4 h-4' />
          New
        </Button>
        <CustomBlockBuilderDialog
          open={builderOpen}
          onOpenChange={setBuilderOpen}
          initialBlock={editBlock}
          onSave={handleSave}
        />
        <Dialog open={aiOpen} onOpenChange={setAiOpen}>
          <DialogTrigger asChild>
            <Button variant='secondary' className='h-8 px-3 text-xs'>
              <Sparkles className='mr-1 w-4 h-4' />
              AI
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>AI Generate Block</DialogTitle>
              <DialogDescription>Describe your block</DialogDescription>
            </DialogHeader>
            <Textarea ref={promptRef} rows={4} className='mb-4' />
            <DialogFooter>
              <Button variant='secondary' onClick={() => setAiOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAiConfirm} disabled={generating}>
                {generating ? <Loader2 className='animate-spin mr-2' /> : null}
                Confirm
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <ScrollArea className='h-[calc(100vh-200px)]'>
        <div className='grid grid-cols-2 gap-2 p-1'>
          {filtered.map((b) => (
            <Card
              key={b.id}
              draggable
              onDragStart={(e) => handleDrag(e, b)}
              className='cursor-grab hover:shadow-md transition-shadow border border-muted-foreground/10 p-2'>
              <CardHeader className='flex justify-between items-center p-2 pb-1'>
                <div className='flex items-center space-x-1'>
                  <Badge variant='outline' className='text-xs px-1'>
                    {badgeText(b.logicType)}
                  </Badge>
                  <CardTitle className='text-sm font-medium'>
                    {b.name}
                  </CardTitle>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant='ghost' size='sm' className='h-6 w-6 p-0'>
                      <MoreHorizontal className='w-4 h-4' />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem
                      onClick={() => {
                        setEditBlock(b);
                        setBuilderOpen(true);
                      }}>
                      <Edit className='mr-2' />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        onDuplicate(b);
                        toast({ title: "Duplicated" });
                      }}>
                      <Copy className='mr-2' />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setDeleteBlock(b)}>
                      <Trash2 className='mr-2' />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className='p-2 pt-0'>
                <CardDescription className='text-xs'>
                  {b.description}
                </CardDescription>
              </CardContent>
              <CardFooter className='p-2 pt-0'>
                <Badge variant='secondary' className='text-xs px-1'>
                  {b.category}
                </Badge>
              </CardFooter>
            </Card>
          ))}
          {filtered.length === 0 && (
            <div className='col-span-2 text-center text-muted-foreground text-xs py-4'>
              No blocks found.
            </div>
          )}
        </div>
      </ScrollArea>

      <AlertDialog
        open={!!deleteBlock}
        onOpenChange={(open) => !open && setDeleteBlock(null)}>
        <AlertDialogTrigger asChild />
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
            <AlertDialogDescription>
              Delete block {deleteBlock?.name}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className='bg-destructive text-destructive-foreground'
              onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
