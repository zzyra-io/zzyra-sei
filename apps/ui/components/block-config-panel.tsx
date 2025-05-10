"use client";

import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { PriceMonitorConfig } from "./block-configs/price-monitor-config";
import { EmailConfig } from "./block-configs/email-config";
import { NotificationConfig } from "./block-configs/notification-config";
import { DatabaseConfig } from "./block-configs/database-config";
import { ConditionConfig } from "./block-configs/condition-config";
import { DelayConfig } from "./block-configs/delay-config";
import { WebhookConfig } from "./block-configs/webhook-config";
import { TransformConfig } from "./block-configs/transform-config";
import { ScheduleConfig } from "./block-configs/schedule-config";
import { WalletConfig } from "./block-configs/wallet-config";
import { TransactionConfig } from "./block-configs/transaction-config";
import { GoatFinanceConfig } from "./block-configs/goat-finance-config";
import {
  BlockType,
  getBlockType,
  getBlockMetadata,
  blockSchemas,
} from "@zyra/types";

import { CustomBlockConfigPanel } from "./custom-block-config-panel";
import { customBlockService } from "@/lib/services/custom-block-service";
import { useToast } from "@/components/ui/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

interface BlockConfigPanelProps {
  node: any;
  onUpdate: (updatedNode: any) => void;
  onClose: () => void;
}

export function BlockConfigPanel({
  node,
  onUpdate,
  onClose,
}: BlockConfigPanelProps) {
  const [localNode, setLocalNode] = useState<any>(node);
  const [activeTab, setActiveTab] = useState("general");
  const [customBlockDefinition, setCustomBlockDefinition] = useState<any>(null);
  const [isLoadingCustomBlock, setIsLoadingCustomBlock] = useState(false);
  const { toast } = useToast();

  // Get the block type using our helper function
  const blockType = getBlockType(node.data);
  const blockMetadata = getBlockMetadata(blockType);
  const isCustomBlock =
    blockType === BlockType.CUSTOM && node.data?.customBlockId;

  // Dynamic Zod schema for block config
  const schema = (blockSchemas as Record<string, any>)[blockType];
  // react-hook-form setup
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: localNode.data.config || {},
  });
  useEffect(
    () => reset(localNode.data.config || {}),
    [schema, localNode.data.config, reset]
  );

  // Load custom block definition if needed
  useEffect(() => {
    if (isCustomBlock && node.data?.customBlockId) {
      const loadCustomBlock = async () => {
        setIsLoadingCustomBlock(true);
        try {
          // First check if the definition is already in the node data
          if (node.data?.customBlockDefinition) {
            setCustomBlockDefinition(node.data.customBlockDefinition);
            return;
          }

          // Otherwise try to load from the database
          const blockDef = await customBlockService.getCustomBlockById(
            node.data.customBlockId
          );

          // If not found in database, try example blocks
          if (!blockDef) {
            const exampleBlocks = customBlockService.getExampleBlocks();
            const exampleBlockDef = exampleBlocks.find(
              (b) => b.id === node.data.customBlockId
            );

            if (exampleBlockDef) {
              setCustomBlockDefinition(exampleBlockDef);
              return;
            }
          } else {
            setCustomBlockDefinition(blockDef);
            return;
          }

          // If we get here, the block was not found
          toast({
            title: "Block Not Found",
            description: "The custom block definition could not be found",
            variant: "destructive",
          });
        } catch (error) {
          console.error("Error loading custom block:", error);
          toast({
            title: "Error",
            description: "Failed to load custom block definition",
            variant: "destructive",
          });
        } finally {
          setIsLoadingCustomBlock(false);
        }
      };

      loadCustomBlock();
    }
  }, [isCustomBlock, node.data?.customBlockId, toast]);

  // Initialize localNode when switching to a new node
  const prevNodeId = useRef(node.id);
  useEffect(() => {
    if (node.id !== prevNodeId.current) {
      setLocalNode(node);
      prevNodeId.current = node.id;
    }
  }, [node.id]);

  // Handle basic field changes
  const handleChange = (field: string, value: any) => {
    const updatedNode = {
      ...localNode,
      data: { ...localNode.data, [field]: value },
    };
    onUpdate(updatedNode);
    setLocalNode(updatedNode);
  };

  // Handle config changes
  const handleConfigChange = (config: any) => {
    const updatedNode = { ...localNode, data: { ...localNode.data, config } };
    onUpdate(updatedNode);
    setLocalNode(updatedNode);
  };

  // Handle style changes
  const handleStyleChange = (style: any) => {
    const updatedNode = {
      ...localNode,
      data: { ...localNode.data, style: { ...localNode.data.style, ...style } },
    };
    onUpdate(updatedNode);
    setLocalNode(updatedNode);
  };

  // --- PATCH: Robust Custom Block Handling and Diagnosis ---
  if (isCustomBlock) {
    // Logging for diagnosis
    console.log("[BlockConfigPanel] Custom block detected:", {
      node,
      customBlockDefinition,
      isLoadingCustomBlock,
    });
    if (isLoadingCustomBlock) {
      return (
        <div className='w-80 h-full flex flex-col bg-background border-l'>
          <div className='flex items-center justify-between p-4 border-b'>
            <h3 className='font-medium'>Loading Block Configuration...</h3>
            <Button variant='ghost' size='icon' onClick={onClose}>
              <X className='h-4 w-4' />
            </Button>
          </div>
          <div className='flex-1 flex items-center justify-center'>
            <div className='text-center'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto'></div>
              <p className='mt-2 text-sm text-muted-foreground'>
                Loading custom block definition
              </p>
            </div>
          </div>
        </div>
      );
    }
    if (!customBlockDefinition) {
      // User-facing error if block definition is missing
      return (
        <div className='w-80 h-full flex flex-col bg-background border-l'>
          <div className='flex items-center justify-between p-4 border-b'>
            <h3 className='font-medium'>Custom Block Error</h3>
            <Button variant='ghost' size='icon' onClick={onClose}>
              <X className='h-4 w-4' />
            </Button>
          </div>
          <div className='flex-1 flex items-center justify-center'>
            <div className='text-center'>
              <p className='text-destructive mb-2'>
                Custom block definition not found.
              </p>
              <p className='text-xs text-muted-foreground'>
                Please check your custom block setup or try reloading.
              </p>
            </div>
          </div>
        </div>
      );
    }
    // Always render the CustomBlockConfigPanel for custom blocks
    return (
      <CustomBlockConfigPanel
        blockId={node.data.customBlockId}
        config={localNode.data.config || {}}
        onUpdate={(config) => {
          // Patch: Always update both config and customBlockId for robustness
          const updatedNode = {
            ...localNode,
            data: {
              ...localNode.data,
              customBlockId: node.data.customBlockId,
              config,
            },
          };
          console.log(
            "[BlockConfigPanel] Custom block config updated:",
            updatedNode
          );
          onUpdate(updatedNode);
          setLocalNode(updatedNode);
        }}
        onClose={onClose}
      />
    );
  }
  // --- END PATCH ---

  // Render dynamic config form if schema exists and not custom
  const renderConfigComponent = () => {
    if (schema && schema.shape && !isCustomBlock) {
      return (
        <div className='w-80 h-full flex flex-col bg-background border-l'>
          <div className='flex items-center justify-between p-4 border-b'>
            <h3 className='font-medium'>{blockMetadata.label} Configuration</h3>
            <Button variant='ghost' size='icon' onClick={onClose}>
              <X className='h-4 w-4' />
            </Button>
          </div>
          <div className='flex-1 overflow-y-auto p-4'>
            <form onSubmit={handleSubmit((data) => handleConfigChange(data))}>
              {schema.shape &&
                Object.keys(schema.shape).map((key) => (
                  <div key={key} className='mb-4'>
                    <Label htmlFor={key} className='mb-1'>
                      {key}
                    </Label>
                    <Input id={key} {...register(key)} />
                    {errors[key] && (
                      <p className='text-destructive text-sm mt-1'>
                        {errors[key]?.message}
                      </p>
                    )}
                  </div>
                ))}
              <Button type='submit' className='mt-2'>
                Save
              </Button>
            </form>
          </div>
        </div>
      );
    }
    // Fallback to existing static panels
    const config = localNode.data.config || {};
    console.log(`Rendering config for ${blockType}:`, config);

    switch (blockType) {
      case BlockType.PRICE_MONITOR:
        return (
          <PriceMonitorConfig config={config} onChange={handleConfigChange} />
        );
      case BlockType.EMAIL:
        return <EmailConfig config={config} onChange={handleConfigChange} />;
      case BlockType.NOTIFICATION:
        return (
          <NotificationConfig config={config} onChange={handleConfigChange} />
        );
      case "discord" as BlockType:
        return (
          <div className='w-80 h-full flex flex-col bg-background border-l'>
            <div className='flex items-center justify-between p-4 border-b'>
              <h3 className='font-medium'>Discord Configuration</h3>
              <Button variant='ghost' size='icon' onClick={onClose}>
                <X className='h-4 w-4' />
              </Button>
            </div>
            <div className='flex-1 overflow-y-auto p-4'>
              <form onSubmit={handleSubmit((data) => handleConfigChange(data))}>
                <div className='mb-4'>
                  <Label htmlFor='webhookUrl' className='mb-1'>
                    Webhook URL
                  </Label>
                  <Input
                    id='webhookUrl'
                    defaultValue={config.webhookUrl || ""}
                    {...register("webhookUrl", {
                      required: "Webhook URL is required",
                    })}
                  />
                  {errors.webhookUrl?.message && (
                    <p className='text-destructive text-sm mt-1'>
                      {errors.webhookUrl.message.toString()}
                    </p>
                  )}
                </div>
                <div className='mb-4'>
                  <Label htmlFor='message' className='mb-1'>
                    Message
                  </Label>
                  <Textarea
                    id='message'
                    defaultValue={config.message || ""}
                    {...register("message", {
                      required: "Message is required",
                    })}
                  />
                  {errors.message?.message && (
                    <p className='text-destructive text-sm mt-1'>
                      {errors.message.message.toString()}
                    </p>
                  )}
                </div>
                <Button type='submit' className='mt-2'>
                  Save
                </Button>
              </form>
            </div>
          </div>
        );
      case BlockType.DATABASE:
        return <DatabaseConfig config={config} onChange={handleConfigChange} />;
      case BlockType.CONDITION:
        return (
          <ConditionConfig config={config} onChange={handleConfigChange} />
        );
      case BlockType.DELAY:
        return <DelayConfig config={config} onChange={handleConfigChange} />;
      case BlockType.WEBHOOK:
        return <WebhookConfig config={config} onChange={handleConfigChange} />;
      case BlockType.TRANSFORM:
        return (
          <TransformConfig config={config} onChange={handleConfigChange} />
        );
      case BlockType.SCHEDULE:
        return <ScheduleConfig config={config} onChange={handleConfigChange} />;
      case BlockType.WALLET:
        return <WalletConfig config={config} onChange={handleConfigChange} />;
      case BlockType.TRANSACTION:
        return (
          <TransactionConfig config={config} onChange={handleConfigChange} />
        );
      case BlockType.GOAT_FINANCE:
        return (
          <GoatFinanceConfig config={config} onChange={handleConfigChange} />
        );
      default:
        // For unknown types, check if we have any config data to display
        if (Object.keys(config).length > 0) {
          return (
            <div className='p-4 space-y-4'>
              {Object.entries(config).map(([key, value]) => (
                <div key={key} className='space-y-2'>
                  <Label htmlFor={key} className='capitalize'>
                    {key.replace(/([A-Z])/g, " $1").trim()}
                  </Label>
                  <Input
                    id={key}
                    value={value as string}
                    onChange={(e) =>
                      handleConfigChange({ [key]: e.target.value })
                    }
                  />
                </div>
              ))}
            </div>
          );
        }

        return (
          <div className='p-4 text-center text-muted-foreground'>
            <p className='mb-2'>
              No specific configuration options for "{blockMetadata.label}"
              block type.
            </p>
            <p className='text-xs'>
              You can still customize general settings in the General tab.
            </p>
          </div>
        );
    }
  };

  return (
    <div className='w-80 h-full flex flex-col bg-background border-l'>
      <div className='flex items-center justify-between p-4 border-b'>
        <h3 className='font-medium'>{blockMetadata.label} Configuration</h3>
        <Button variant='ghost' size='icon' onClick={onClose}>
          <X className='h-4 w-4' />
        </Button>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className='flex-1 flex flex-col'>
        <TabsList className='grid grid-cols-3 mx-4 mt-2'>
          <TabsTrigger value='general'>General</TabsTrigger>
          <TabsTrigger value='config'>Config</TabsTrigger>
          <TabsTrigger value='style'>Style</TabsTrigger>
        </TabsList>

        <ScrollArea className='flex-1'>
          <TabsContent value='general' className='p-4 m-0'>
            <div className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='label'>Label</Label>
                <Input
                  id='label'
                  value={localNode.data.label || ""}
                  onChange={(e) => handleChange("label", e.target.value)}
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='description'>Description</Label>
                <Textarea
                  id='description'
                  value={localNode.data.description || ""}
                  onChange={(e) => handleChange("description", e.target.value)}
                  rows={3}
                />
              </div>

              <Separator />

              <div className='flex items-center space-x-2'>
                <Switch
                  id='isEnabled'
                  checked={localNode.data.isEnabled !== false}
                  onCheckedChange={(checked) =>
                    handleChange("isEnabled", checked)
                  }
                />
                <Label htmlFor='isEnabled'>Enabled</Label>
              </div>
            </div>
          </TabsContent>

          <TabsContent value='config' className='p-0 m-0'>
            {renderConfigComponent()}
          </TabsContent>

          <TabsContent value='style' className='p-4 m-0'>
            <div className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='accentColor'>Accent Color</Label>
                <div className='grid grid-cols-4 gap-2'>
                  {[
                    "primary",
                    "secondary",
                    "blue",
                    "green",
                    "red",
                    "yellow",
                    "purple",
                    "orange",
                  ].map((color) => (
                    <div
                      key={color}
                      className={`h-8 rounded-md cursor-pointer border-2 ${
                        (localNode.data.style?.accentColor || "primary") ===
                        color
                          ? "border-ring"
                          : "border-transparent"
                      }`}
                      style={{ backgroundColor: `var(--${color})` }}
                      onClick={() => handleStyleChange({ accentColor: color })}
                    />
                  ))}
                </div>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='width'>Width (px)</Label>
                <Input
                  id='width'
                  type='number'
                  value={localNode.data.style?.width || 220}
                  onChange={(e) =>
                    handleStyleChange({
                      width: Number.parseInt(e.target.value),
                    })
                  }
                  min={150}
                  max={400}
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='height'>Height (px)</Label>
                <Input
                  id='height'
                  type='number'
                  value={localNode.data.style?.height || 150}
                  onChange={(e) =>
                    handleStyleChange({
                      height: Number.parseInt(e.target.value),
                    })
                  }
                  min={100}
                  max={400}
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='backgroundColor'>Background Style</Label>
                <div className='grid grid-cols-3 gap-2'>
                  {[
                    { label: "Default", value: "bg-card" },
                    { label: "Muted", value: "bg-muted" },
                    { label: "Accent", value: "bg-accent" },
                  ].map((bg) => (
                    <div
                      key={bg.value}
                      className={`p-2 rounded-md cursor-pointer text-center text-xs ${bg.value} ${
                        (localNode.data.style?.backgroundColor || "bg-card") ===
                        bg.value
                          ? "ring-2 ring-ring"
                          : "border border-border"
                      }`}
                      onClick={() =>
                        handleStyleChange({ backgroundColor: bg.value })
                      }>
                      {bg.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
