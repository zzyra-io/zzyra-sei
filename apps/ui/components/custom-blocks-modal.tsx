import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "./ui/dialog";
import { Card, CardContent } from "./ui/card";
import { Terminal, Sparkles, PlusCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "./ui/select";
import { DialogFooter, DialogClose } from "./ui/dialog";
import { Loader2 } from "lucide-react";
import { CustomBlockBuilderDialog } from "./custom-block-builder-dialog";
import { BlockSimulator } from "./block-simulator";
import { toast } from "@/hooks/use-toast";
import {
  CustomBlockInput,
  CustomBlockOutput,
  CustomBlockDefinition,
} from "@zyra/types";
import api from "@/lib/services/api";

const CustomBlocksModal = ({
  onAddCustomBlock,
  onGenerateCustomBlock,
  setBlockCatalogTab,
}: {
  onAddCustomBlock: (
    block: CustomBlockDefinition,
    position: { x: number; y: number },
    method: "manual" | "ai"
  ) => void;
  onGenerateCustomBlock: (prompt: string) => Promise<void>;
  setBlockCatalogTab: (tab: string) => void;
}) => {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creationMethod, setCreationMethod] = useState<string | null>(null);
  const [simulatedBlock, setSimulatedBlock] =
    useState<CustomBlockDefinition | null>(null);
  const [aiBlockForm, setAiBlockForm] = useState({
    blockName: "",
    blockDescription: "",
    blockInputs: "",
    blockOutputs: "",
    blockCategory: "ACTION",
  });
  const [isGeneratingBlock, setIsGeneratingBlock] = useState(false);

  const handleAiFormChange = (field: string, value: string) => {
    setAiBlockForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAiBlockSubmit = async () => {
    setIsGeneratingBlock(true);
    try {
      const block = await onGenerateCustomBlock(aiBlockForm);
      setSimulatedBlock(block);
      setCreationMethod("simulation");
    } catch (error) {
      console.error("Error generating block:", error);
      toast({
        title: "Error Generating Block",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingBlock(false);
    }
  };

  return (
    <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
      <DialogTrigger asChild>
        <Button
          variant='outline'
          size='sm'
          className='flex items-center gap-1'
          onClick={() => setCreateModalOpen(true)}>
          <PlusCircle className='h-3.5 w-3.5' />
          <span className='text-xs'>Create Block</span>
        </Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-[600px]'>
        <DialogHeader>
          <DialogTitle>Create Custom Block</DialogTitle>
          <DialogDescription>
            Design your own custom block with inputs, outputs, and logic.
          </DialogDescription>
        </DialogHeader>

        {creationMethod === null ? (
          <div className='grid grid-cols-2 gap-4 py-4'>
            <Card
              className='cursor-pointer hover:border-primary transition-colors'
              onClick={() => setCreationMethod("ai")}>
              <CardContent className='p-6 flex flex-col items-center justify-center text-center'>
                <Sparkles className='h-8 w-8 text-primary mb-3' />
                <h3 className='font-semibold mb-1'>Use AI</h3>
                <p className='text-sm text-muted-foreground'>
                  Let AI help you create a complete custom block based on your
                  description.
                </p>
              </CardContent>
            </Card>

            <Card
              className='cursor-pointer hover:border-primary transition-colors'
              onClick={() => setCreationMethod("manual")}>
              <CardContent className='p-6 flex flex-col items-center justify-center text-center'>
                <Terminal className='h-8 w-8 text-primary mb-3' />
                <h3 className='font-semibold mb-1'>Create Manually</h3>
                <p className='text-sm text-muted-foreground'>
                  Define your block inputs, outputs, and logic yourself.
                </p>
              </CardContent>
            </Card>
          </div>
        ) : creationMethod === "manual" ? (
          <div className='border rounded-md overflow-hidden'>
            <CustomBlockBuilderDialog
              open={true}
              onOpenChange={() => {
                setCreateModalOpen(false);
                setCreationMethod(null);
              }}
              initialBlock={undefined}
              inline={true}
              onSave={(block) => {
                // Add the new block to custom blocks
                if (onAddCustomBlock) {
                  // Create position slightly offset from center of viewport
                  const viewportWidth =
                    window.innerWidth || document.documentElement.clientWidth;
                  const viewportHeight =
                    window.innerHeight || document.documentElement.clientHeight;
                  const position = {
                    x: Math.round(viewportWidth / 2) + 100,
                    y: Math.round(viewportHeight / 2) + 100,
                  };
                  onAddCustomBlock(block, position, "manual");

                  toast({
                    title: "Block Created",
                    description: `${block.name} has been created and added to your custom blocks.`,
                  });

                  setCreateModalOpen(false);
                  setCreationMethod(null);
                  // Switch to custom tab to see the new block
                  setBlockCatalogTab("custom");
                }
              }}
              onGenerateWithAI={onGenerateCustomBlock}
            />
          </div>
        ) : creationMethod === "simulation" && simulatedBlock ? (
          <div className='py-4'>
            <BlockSimulator
              block={simulatedBlock}
              onClose={() => {
                setCreationMethod("manual");
              }}
              onFinalize={(finalizedBlock) => {
                // Handle the finalized block
                if (onAddCustomBlock) {
                  // Create position slightly offset from center of viewport
                  const viewportWidth =
                    window.innerWidth || document.documentElement.clientWidth;
                  const viewportHeight =
                    window.innerHeight || document.documentElement.clientHeight;
                  const position = {
                    x: Math.round(viewportWidth / 2) + 100,
                    y: Math.round(viewportHeight / 2) + 100,
                  };

                  // Add the custom block to the workflow
                  onAddCustomBlock(finalizedBlock, position, "ai");

                  // Save the block to the library
                  api
                    .post("/blocks/custom", {
                      name: finalizedBlock.name,
                      description: finalizedBlock.description,
                      category: finalizedBlock.category,
                      inputs: finalizedBlock.inputs.map(
                        (input: CustomBlockInput) => ({
                          name: input.name,
                          description: input.description || "",
                          dataType: input.dataType,
                          required: input.required,
                        })
                      ),
                      outputs: finalizedBlock.outputs.map(
                        (output: CustomBlockOutput) => ({
                          name: output.name,
                          description: output.description || "",
                          dataType: output.dataType,
                          required: output.required,
                        })
                      ),
                      configFields: finalizedBlock.configFields || [],
                      code: finalizedBlock.logic,
                    })
                    .then(() => {
                      console.log("Block saved to library");
                      // Reset UI state after successful save
                      setSimulatedBlock(null);
                      setCreationMethod(null);
                      // Switch to custom tab to see the new block
                      setBlockCatalogTab("custom");
                    })
                    .catch((error) => {
                      console.error("Error saving block to library:", error);
                      toast({
                        title: "Error Saving Block",
                        description:
                          "The block was added to your workflow but could not be saved to your library.",
                        variant: "destructive",
                      });
                      // Still reset UI state even on error
                      setSimulatedBlock(null);
                      setCreationMethod(null);
                    });

                  toast({
                    title: "Block Created",
                    description: `${finalizedBlock.name} has been created and added to your custom blocks.`,
                  });

                  setCreateModalOpen(false);
                  setCreationMethod(null);
                  setSimulatedBlock(null);
                  // Switch to custom tab to see the new block
                  setBlockCatalogTab("custom");
                }
              }}
            />
          </div>
        ) : (
          <div className='py-4'>
            <h3 className='text-sm font-medium mb-3'>Describe Your Block</h3>
            <p className='text-xs text-muted-foreground mb-4'>
              Describe the purpose of your custom block, what it should do, and
              any specific inputs or outputs it should have. Our AI will
              generate a complete block for you to review and modify.
            </p>

            {/* AI Block Generation Form */}
            <div className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='block-name'>Block Name</Label>
                <Input
                  id='block-name'
                  placeholder='E.g., Twitter Sentiment Analysis'
                  value={aiBlockForm.blockName}
                  onChange={(e) =>
                    handleAiFormChange("blockName", e.target.value)
                  }
                />
                <p className='text-xs text-muted-foreground'>
                  Give your block a clear, descriptive name
                </p>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='block-description'>Description</Label>
                <Textarea
                  id='block-description'
                  placeholder='Describe what this block should do. Example: This block should analyze the sentiment of tweets mentioning a specific keyword.'
                  rows={4}
                  value={aiBlockForm.blockDescription}
                  onChange={(e) =>
                    handleAiFormChange("blockDescription", e.target.value)
                  }
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='block-inputs'>Inputs (optional)</Label>
                <Textarea
                  id='block-inputs'
                  placeholder='Describe the inputs your block needs. Example: Keyword to search, Number of tweets to analyze'
                  rows={3}
                  value={aiBlockForm.blockInputs}
                  onChange={(e) =>
                    handleAiFormChange("blockInputs", e.target.value)
                  }
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='block-outputs'>Outputs (optional)</Label>
                <Textarea
                  id='block-outputs'
                  placeholder='Describe the outputs your block should produce. Example: Sentiment score, Top positive/negative words'
                  rows={3}
                  value={aiBlockForm.blockOutputs}
                  onChange={(e) =>
                    handleAiFormChange("blockOutputs", e.target.value)
                  }
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='block-category'>Category (optional)</Label>
                <Select
                  value={aiBlockForm.blockCategory}
                  onValueChange={(value) =>
                    handleAiFormChange("blockCategory", value)
                  }>
                  <SelectTrigger id='block-category'>
                    <SelectValue placeholder='Select a category' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='ACTION'>Action</SelectItem>
                    <SelectItem value='TRIGGER'>Trigger</SelectItem>
                    <SelectItem value='CONDITION'>Condition</SelectItem>
                    <SelectItem value='TRANSFORMER'>Transformer</SelectItem>
                    <SelectItem value='FINANCE'>Finance</SelectItem>
                    <SelectItem value='AI'>AI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className='flex justify-end space-x-2 mt-6'>
              <Button
                variant='outline'
                onClick={() => setCreationMethod(null)}
                disabled={isGeneratingBlock}>
                Back
              </Button>
              <Button
                onClick={handleAiBlockSubmit}
                disabled={isGeneratingBlock}>
                {isGeneratingBlock ? (
                  <>
                    <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className='h-4 w-4 mr-2' />
                    Generate Block
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {creationMethod === null && (
          <DialogFooter>
            <DialogClose asChild>
              <Button variant='outline'>Cancel</Button>
            </DialogClose>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CustomBlocksModal;
