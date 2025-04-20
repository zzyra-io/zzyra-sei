"use client";

import { useState, useEffect } from "react";
import { X, Palette, Info, Sliders } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Node } from "@/components/flow-canvas";
import { toast } from "@/components/ui/use-toast";

interface BlockConfigPanelProps {
  node: Node;
  onUpdate: (node: Node) => void;
  onClose: () => void;
}

export function BlockConfigPanel({
  node,
  onUpdate,
  onClose,
}: BlockConfigPanelProps) {
  const [config, setConfig] = useState<any>(node.data?.config || {});
  const [label, setLabel] = useState(node.data?.label || "");
  const [description, setDescription] = useState(node.data?.description || "");
  const [isEnabled, setIsEnabled] = useState(node.data?.isEnabled !== false);
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  // Appearance settings
  const [style, setStyle] = useState<any>(
    node.data?.style || {
      backgroundColor: "bg-card",
      borderColor: "border-border",
      textColor: "text-foreground",
      accentColor: "primary",
      width: 220,
    }
  );

  // Input/Output settings
  const [inputCount, setInputCount] = useState(node.data?.inputCount || 1);
  const [outputCount, setOutputCount] = useState(node.data?.outputCount || 1);
  const [hasInputs, setHasInputs] = useState(node.data?.inputs !== false);
  const [hasOutputs, setHasOutputs] = useState(node.data?.outputs !== false);

  // Add state for validation errors
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    setIsMounted(true);
    // Make sure we're always using the latest node data
    setConfig(node.data?.config || {});
    setLabel(node.data?.label || "");
    setDescription(node.data?.description || "");
    setIsEnabled(node.data?.isEnabled !== false);
    setStyle(
      node.data?.style || {
        backgroundColor: "bg-card",
        borderColor: "border-border",
        textColor: "text-foreground",
        accentColor: "primary",
        width: 220,
      }
    );
    setInputCount(node.data?.inputCount || 1);
    setOutputCount(node.data?.outputCount || 1);
    setHasInputs(node.data?.inputs !== false);
    setHasOutputs(node.data?.outputs !== false);

    // Clear validation errors when node changes
    setValidationErrors({});
  }, [node]);

  if (!isMounted) {
    return null;
  }

  // Add validation for configuration fields
  const validateConfig = (config: any, nodeType: string) => {
    const errors: Record<string, string> = {};

    switch (nodeType) {
      case "price-monitor":
        if (!config.asset) {
          errors.asset = "Asset is required";
        }
        if (
          !config.targetPrice ||
          isNaN(Number.parseFloat(config.targetPrice))
        ) {
          errors.targetPrice = "Target price must be a valid number";
        }
        if (!config.condition) {
          errors.condition = "Condition is required";
        }
        break;
      case "email":
        if (!config.to) {
          errors.to = "Recipient email is required";
        } else if (!/\S+@\S+\.\S+/.test(config.to)) {
          errors.to = "Please enter a valid email address";
        }
        if (!config.subject) {
          errors.subject = "Subject is required";
        }
        if (!config.body) {
          errors.body = "Email body is required";
        }
        break;
      case "webhook":
        if (config.url && !config.url.startsWith("http")) {
          errors.url = "URL must start with http:// or https://";
        }
        break;
      // Add more validation rules for other node types
    }

    return errors;
  };

  // Update the handleConfigChange function
  const handleConfigChange = (key: string, value: any) => {
    const newConfig = {
      ...config,
      [key]: value,
    };

    setConfig(newConfig);

    // Clear the specific error when the field is changed
    if (validationErrors[key]) {
      setValidationErrors({
        ...validationErrors,
        [key]: "",
      });
    }
  };

  // Function to handle style changes
  const handleStyleChange = (key: string, value: any) => {
    setStyle((prevStyle: any) => ({
      ...prevStyle,
      [key]: value,
    }));
  };

  // Update the handleSave function
  const handleSave = () => {
    // Get the node type from either node.type or node.data.nodeType or node.data.blockType
    const nodeType =
      node.type || node.data?.nodeType || node.data?.blockType || "unknown";

    // Validate the configuration
    const errors = validateConfig(config, nodeType);

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    const updatedNode = {
      ...node,
      data: {
        ...node.data,
        label,
        description,
        isEnabled,
        config,
        style,
        inputCount,
        outputCount,
        inputs: hasInputs,
        outputs: hasOutputs,
      },
    };

    onUpdate(updatedNode);

    // Show a success toast
    toast({
      title: "Block Updated",
      description: "Your changes have been applied",
      duration: 2000,
    });
  };

  console.log("node", node);

  const renderConfigFields = () => {
    // Get the node type from either node.type or node.data.nodeType or node.data.blockType
    const nodeType =
      node.type || node.data?.nodeType || node.data?.blockType || "unknown";

    switch (nodeType) {
      case "price-monitor":
        return (
          <>
            <div className='space-y-2'>
              <Label htmlFor='asset'>Cryptocurrency</Label>
              <Select
                value={config.asset || "ETH"}
                onValueChange={(value) => handleConfigChange("asset", value)}>
                <SelectTrigger id='asset'>
                  <SelectValue placeholder='Select cryptocurrency' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='BTC'>Bitcoin (BTC)</SelectItem>
                  <SelectItem value='ETH'>Ethereum (ETH)</SelectItem>
                  <SelectItem value='SOL'>Solana (SOL)</SelectItem>
                  <SelectItem value='DOGE'>Dogecoin (DOGE)</SelectItem>
                  <SelectItem value='ADA'>Cardano (ADA)</SelectItem>
                </SelectContent>
              </Select>
              {validationErrors.asset && (
                <p className='text-xs text-destructive mt-1'>
                  {validationErrors.asset}
                </p>
              )}
            </div>
            <div className='space-y-2'>
              <Label htmlFor='targetPrice'>Target Price (USD)</Label>
              <Input
                id='targetPrice'
                type='number'
                value={config.targetPrice || ""}
                onChange={(e) =>
                  handleConfigChange("targetPrice", e.target.value)
                }
                placeholder='2000'
                className={
                  validationErrors.targetPrice ? "border-destructive" : ""
                }
              />
              {validationErrors.targetPrice && (
                <p className='text-xs text-destructive mt-1'>
                  {validationErrors.targetPrice}
                </p>
              )}
            </div>
            <div className='space-y-2'>
              <Label htmlFor='condition'>Condition</Label>
              <Select
                value={config.condition || "above"}
                onValueChange={(value) =>
                  handleConfigChange("condition", value)
                }>
                <SelectTrigger id='condition'>
                  <SelectValue placeholder='Select condition' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='above'>Above</SelectItem>
                  <SelectItem value='below'>Below</SelectItem>
                  <SelectItem value='equals'>Equals</SelectItem>
                </SelectContent>
              </Select>
              {validationErrors.condition && (
                <p className='text-xs text-destructive mt-1'>
                  {validationErrors.condition}
                </p>
              )}
            </div>
          </>
        );
      case "email":
        return (
          <>
            <div className='space-y-2'>
              <Label htmlFor='to'>Recipient Email</Label>
              <Input
                id='to'
                value={config.to || ""}
                onChange={(e) => handleConfigChange("to", e.target.value)}
                placeholder='recipient@example.com'
                className={validationErrors.to ? "border-destructive" : ""}
              />
              {validationErrors.to && (
                <p className='text-xs text-destructive mt-1'>
                  {validationErrors.to}
                </p>
              )}
            </div>
            <div className='space-y-2'>
              <Label htmlFor='subject'>Subject</Label>
              <Input
                id='subject'
                value={config.subject || ""}
                onChange={(e) => handleConfigChange("subject", e.target.value)}
                placeholder='Email subject'
                className={validationErrors.subject ? "border-destructive" : ""}
              />
              {validationErrors.subject && (
                <p className='text-xs text-destructive mt-1'>
                  {validationErrors.subject}
                </p>
              )}
            </div>
            <div className='space-y-2'>
              <Label htmlFor='body'>Body</Label>
              <Textarea
                id='body'
                value={config.body || ""}
                onChange={(e) => handleConfigChange("body", e.target.value)}
                placeholder='Email body'
                rows={4}
                className={validationErrors.body ? "border-destructive" : ""}
              />
              {validationErrors.body && (
                <p className='text-xs text-destructive mt-1'>
                  {validationErrors.body}
                </p>
              )}
              <p className='text-xs text-muted-foreground mt-2'>
                You can use template variables like{" "}
                <code>{"{{currentPrice}}"}</code> to include dynamic data.
              </p>
            </div>
          </>
        );
      case "database":
        return (
          <>
            <div className='space-y-2'>
              <Label htmlFor='table'>Table Name</Label>
              <Input
                id='table'
                value={config.table || ""}
                onChange={(e) => handleConfigChange("table", e.target.value)}
                placeholder='Table name'
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='data'>Data (JSON)</Label>
              <Textarea
                id='data'
                value={config.data || "{}"}
                onChange={(e) => handleConfigChange("data", e.target.value)}
                placeholder='{}'
                rows={4}
              />
            </div>
          </>
        );
      case "webhook":
        return (
          <>
            <div className='space-y-2'>
              <Label htmlFor='url'>Webhook URL</Label>
              <Input
                id='url'
                value={config.url || ""}
                onChange={(e) => handleConfigChange("url", e.target.value)}
                placeholder='https://example.com/webhook'
                className={validationErrors.url ? "border-destructive" : ""}
              />
              {validationErrors.url && (
                <p className='text-xs text-destructive mt-1'>
                  {validationErrors.url}
                </p>
              )}
            </div>
            <div className='space-y-2'>
              <Label htmlFor='method'>HTTP Method</Label>
              <Select
                value={config.method || "POST"}
                onValueChange={(value) => handleConfigChange("method", value)}>
                <SelectTrigger id='method'>
                  <SelectValue placeholder='Select method' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='GET'>GET</SelectItem>
                  <SelectItem value='POST'>POST</SelectItem>
                  <SelectItem value='PUT'>PUT</SelectItem>
                  <SelectItem value='DELETE'>DELETE</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        );
      case "condition":
        return (
          <>
            <div className='space-y-2'>
              <Label htmlFor='condition'>Condition Expression</Label>
              <Textarea
                id='condition'
                value={config.condition || ""}
                onChange={(e) =>
                  handleConfigChange("condition", e.target.value)
                }
                placeholder='value > 100'
                rows={3}
              />
              <p className='text-xs text-muted-foreground mt-2'>
                Use JavaScript expressions like <code>value &gt; 100</code> or{" "}
                <code>data.status === 'success'</code>
              </p>
            </div>
          </>
        );
      case "delay":
        return (
          <>
            <div className='space-y-2'>
              <Label htmlFor='duration'>Duration</Label>
              <Input
                id='duration'
                type='number'
                value={config.duration || "5"}
                onChange={(e) => handleConfigChange("duration", e.target.value)}
                placeholder='5'
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='unit'>Time Unit</Label>
              <Select
                value={config.unit || "minutes"}
                onValueChange={(value) => handleConfigChange("unit", value)}>
                <SelectTrigger id='unit'>
                  <SelectValue placeholder='Select time unit' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='seconds'>Seconds</SelectItem>
                  <SelectItem value='minutes'>Minutes</SelectItem>
                  <SelectItem value='hours'>Hours</SelectItem>
                  <SelectItem value='days'>Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        );
      case "transform":
        return (
          <>
            <div className='space-y-2'>
              <Label htmlFor='transformation'>Transformation Code</Label>
              <Textarea
                id='transformation'
                value={config.transformation || ""}
                onChange={(e) =>
                  handleConfigChange("transformation", e.target.value)
                }
                placeholder='return { ...data, processed: true };'
                rows={6}
                className='font-mono text-xs'
              />
              <p className='text-xs text-muted-foreground mt-2'>
                Write JavaScript code to transform the input data. Use{" "}
                <code>return</code> to output the transformed data.
              </p>
            </div>
          </>
        );
      case "schedule":
        return (
          <>
            <div className='space-y-2'>
              <Label htmlFor='interval'>Interval</Label>
              <Select
                value={config.interval || "hourly"}
                onValueChange={(value) =>
                  handleConfigChange("interval", value)
                }>
                <SelectTrigger id='interval'>
                  <SelectValue placeholder='Select interval' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='minutely'>Every Minute</SelectItem>
                  <SelectItem value='hourly'>Hourly</SelectItem>
                  <SelectItem value='daily'>Daily</SelectItem>
                  <SelectItem value='weekly'>Weekly</SelectItem>
                  <SelectItem value='monthly'>Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-2'>
              <Label htmlFor='time'>Time (for daily or longer intervals)</Label>
              <Input
                id='time'
                type='time'
                value={config.time || "09:00"}
                onChange={(e) => handleConfigChange("time", e.target.value)}
              />
            </div>
          </>
        );
      case "notification":
        return (
          <>
            <div className='space-y-2'>
              <Label htmlFor='title'>Notification Title</Label>
              <Input
                id='title'
                value={config.title || ""}
                onChange={(e) => handleConfigChange("title", e.target.value)}
                placeholder='Notification Title'
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='message'>Message</Label>
              <Textarea
                id='message'
                value={config.message || ""}
                onChange={(e) => handleConfigChange("message", e.target.value)}
                placeholder='Notification message'
                rows={3}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='type'>Notification Type</Label>
              <Select
                value={config.type || "info"}
                onValueChange={(value) => handleConfigChange("type", value)}>
                <SelectTrigger id='type'>
                  <SelectValue placeholder='Select type' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='info'>Info</SelectItem>
                  <SelectItem value='success'>Success</SelectItem>
                  <SelectItem value='warning'>Warning</SelectItem>
                  <SelectItem value='error'>Error</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        );
      default:
        return (
          <div className='py-4 text-center text-sm text-muted-foreground'>
            <p>
              Configuration options for <strong>{nodeType}</strong> node type.
            </p>
            <p className='mt-2'>
              You can customize the general settings in the tabs above.
            </p>
          </div>
        );
    }
  };

  const renderAppearanceSettings = () => {
    return (
      <div className='space-y-4'>
        <div className='space-y-2'>
          <Label htmlFor='backgroundColor'>Background Color</Label>
          <Select
            value={style.backgroundColor}
            onValueChange={(value) =>
              handleStyleChange("backgroundColor", value)
            }>
            <SelectTrigger id='backgroundColor'>
              <SelectValue placeholder='Select background color' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='bg-card'>Default</SelectItem>
              <SelectItem value='bg-primary/10'>Primary (Light)</SelectItem>
              <SelectItem value='bg-secondary/10'>Secondary (Light)</SelectItem>
              <SelectItem value='bg-accent/10'>Accent (Light)</SelectItem>
              <SelectItem value='bg-destructive/10'>
                Destructive (Light)
              </SelectItem>
              <SelectItem value='bg-muted'>Muted</SelectItem>
              <SelectItem value='bg-background'>Background</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className='space-y-2'>
          <Label htmlFor='borderColor'>Border Color</Label>
          <Select
            value={style.borderColor}
            onValueChange={(value) => handleStyleChange("borderColor", value)}>
            <SelectTrigger id='borderColor'>
              <SelectValue placeholder='Select border color' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='border-border'>Default</SelectItem>
              <SelectItem value='border-primary'>Primary</SelectItem>
              <SelectItem value='border-secondary'>Secondary</SelectItem>
              <SelectItem value='border-accent'>Accent</SelectItem>
              <SelectItem value='border-destructive'>Destructive</SelectItem>
              <SelectItem value='border-muted'>Muted</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className='space-y-2'>
          <Label htmlFor='textColor'>Text Color</Label>
          <Select
            value={style.textColor}
            onValueChange={(value) => handleStyleChange("textColor", value)}>
            <SelectTrigger id='textColor'>
              <SelectValue placeholder='Select text color' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='text-foreground'>Default</SelectItem>
              <SelectItem value='text-primary'>Primary</SelectItem>
              <SelectItem value='text-secondary'>Secondary</SelectItem>
              <SelectItem value='text-accent'>Accent</SelectItem>
              <SelectItem value='text-destructive'>Destructive</SelectItem>
              <SelectItem value='text-muted-foreground'>Muted</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className='space-y-2'>
          <Label htmlFor='accentColor'>Accent Color</Label>
          <Select
            value={style.accentColor}
            onValueChange={(value) => handleStyleChange("accentColor", value)}>
            <SelectTrigger id='accentColor'>
              <SelectValue placeholder='Select accent color' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='primary'>Primary</SelectItem>
              <SelectItem value='secondary'>Secondary</SelectItem>
              <SelectItem value='accent'>Accent</SelectItem>
              <SelectItem value='destructive'>Destructive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className='space-y-2'>
          <Label htmlFor='width'>Width ({style.width}px)</Label>
          <Slider
            id='width'
            min={180}
            max={400}
            step={10}
            value={[style.width]}
            onValueChange={(value) => handleStyleChange("width", value[0])}
          />
        </div>
      </div>
    );
  };

  const renderConnectionSettings = () => {
    return (
      <div className='space-y-4'>
        <div className='flex items-center justify-between'>
          <Label htmlFor='hasInputs'>Enable Input Connections</Label>
          <Switch
            id='hasInputs'
            checked={hasInputs}
            onCheckedChange={setHasInputs}
          />
        </div>

        {hasInputs && (
          <div className='space-y-2'>
            <Label htmlFor='inputCount'>
              Number of Input Handles ({inputCount})
            </Label>
            <Slider
              id='inputCount'
              min={1}
              max={5}
              step={1}
              value={[inputCount]}
              onValueChange={(value) => setInputCount(value[0])}
              disabled={!hasInputs}
            />
          </div>
        )}

        <div className='flex items-center justify-between'>
          <Label htmlFor='hasOutputs'>Enable Output Connections</Label>
          <Switch
            id='hasOutputs'
            checked={hasOutputs}
            onCheckedChange={setHasOutputs}
          />
        </div>

        {hasOutputs && (
          <div className='space-y-2'>
            <Label htmlFor='outputCount'>
              Number of Output Handles ({outputCount})
            </Label>
            <Slider
              id='outputCount'
              min={1}
              max={5}
              step={1}
              value={[outputCount]}
              onValueChange={(value) => setOutputCount(value[0])}
              disabled={!hasOutputs}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className='w-80 border-l bg-card p-4 overflow-y-auto h-full'>
      <div className='flex items-center justify-between mb-4'>
        <h3 className='text-lg font-semibold'>Block Configuration</h3>
        <Button variant='ghost' size='icon' onClick={onClose}>
          <X className='h-4 w-4' />
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className='grid grid-cols-3 mb-4'>
          <TabsTrigger value='general' className='flex items-center'>
            <Info className='h-4 w-4 mr-1' />
            <span>General</span>
          </TabsTrigger>
          <TabsTrigger value='appearance' className='flex items-center'>
            <Palette className='h-4 w-4 mr-1' />
            <span>Style</span>
          </TabsTrigger>
          <TabsTrigger value='connections' className='flex items-center'>
            <Sliders className='h-4 w-4 mr-1' />
            <span>Connections</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value='general' className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='label'>Label</Label>
            <Input
              id='label'
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='description'>Description</Label>
            <Textarea
              id='description'
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className='flex items-center justify-between'>
            <Label htmlFor='enabled'>Enabled</Label>
            <Switch
              id='enabled'
              checked={isEnabled}
              onCheckedChange={setIsEnabled}
            />
          </div>

          <Separator />

          <Accordion type='single' collapsible defaultValue='config'>
            <AccordionItem value='config'>
              <AccordionTrigger className='text-sm font-medium'>
                Block-specific Configuration
              </AccordionTrigger>
              <AccordionContent>
                <div className='space-y-4 pt-2'>{renderConfigFields()}</div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </TabsContent>

        <TabsContent value='appearance' className='space-y-4'>
          {renderAppearanceSettings()}
        </TabsContent>

        <TabsContent value='connections' className='space-y-4'>
          {renderConnectionSettings()}
        </TabsContent>
      </Tabs>

      <div className='mt-6'>
        <Button className='w-full' onClick={handleSave}>
          Apply Changes
        </Button>
      </div>
    </div>
  );
}
