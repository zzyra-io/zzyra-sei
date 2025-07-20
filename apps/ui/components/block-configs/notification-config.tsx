"use client";

import React, { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircle,
  CheckCircle,
  Info,
  Loader2,
  Play,
  Bell,
  Eye,
  EyeOff,
  Settings,
} from "lucide-react";
import { enhancedNotificationSchema } from "@zyra/types";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { X, Plus, ChevronDown, ChevronRight, Send, Code } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// Remove circular dependency - don't self-register
// import blockConfigRegistry from "@/lib/block-config-registry";

interface NotificationConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  executionStatus?: "idle" | "running" | "success" | "error" | "warning";
  executionData?: {
    startTime?: string;
    endTime?: string;
    duration?: number;
    error?: string;
    lastResponse?: unknown;
  };
  onTest?: () => void;
}

interface ValidationError {
  path: string[];
  message: string;
}

interface TemplateVariable {
  name: string;
  description: string;
  example: string;
}

export function NotificationConfig({
  config,
  onChange,
  executionStatus = "idle",
  executionData,
  onTest,
}: NotificationConfigProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>(
    []
  );
  const [isValid, setIsValid] = useState(true);
  const [activeTab, setActiveTab] = useState("config");
  const [advancedCollapsed, setAdvancedCollapsed] = useState(true);
  const [templateCollapsed, setTemplateCollapsed] = useState(false);
  const [webhookHeaders, setWebhookHeaders] = useState<Record<string, string>>(
    (config.webhookHeaders as Record<string, string>) || {}
  );
  const [newHeaderKey, setNewHeaderKey] = useState("");
  const [newHeaderValue, setNewHeaderValue] = useState("");

  // Use the enhanced schema from @zyra/types
  const notificationSchema = enhancedNotificationSchema;

  // Template variables available from previous blocks
  const templateVariables: TemplateVariable[] = useMemo(
    () => [
      {
        name: "{{json.email}}",
        description: "Email from previous block",
        example: "user@example.com",
      },
      {
        name: "{{json.name}}",
        description: "Name from previous block",
        example: "John Doe",
      },
      {
        name: "{{json.message}}",
        description: "Message from previous block",
        example: "Hello World",
      },
      {
        name: "{{json.subject}}",
        description: "Subject from previous block",
        example: "Important Update",
      },
      {
        name: "{{json.price}}",
        description: "Price from previous block",
        example: "2000.50",
      },
      {
        name: "{{json.status}}",
        description: "Status from previous block",
        example: "success",
      },
      {
        name: "{{json.timestamp}}",
        description: "Timestamp from previous block",
        example: "2024-01-01T00:00:00Z",
      },
    ],
    []
  );

  // Schema-driven validation
  const validateConfig = useMemo(() => {
    return (configData: unknown) => {
      try {
        notificationSchema.parse(configData);
        setValidationErrors([]);
        setIsValid(true);
        return true;
      } catch (error) {
        if (error instanceof z.ZodError) {
          const errors: ValidationError[] = error.errors.map((err) => ({
            path: err.path.map(String),
            message: err.message,
          }));
          setValidationErrors(errors);
          setIsValid(false);
        }
        return false;
      }
    };
  }, [notificationSchema]);

  // Validate on config changes
  useEffect(() => {
    validateConfig(config);
  }, [config, validateConfig]);

  // Get field validation error
  const getFieldError = (fieldName: string): string | undefined => {
    const error = validationErrors.find((err) => err.path.includes(fieldName));
    return error?.message;
  };

  const handleChange = (field: string, value: unknown) => {
    onChange({ ...config, [field]: value });
  };

  const addWebhookHeader = () => {
    if (newHeaderKey && newHeaderValue) {
      const updatedHeaders = {
        ...webhookHeaders,
        [newHeaderKey]: newHeaderValue,
      };
      setWebhookHeaders(updatedHeaders);
      handleChange("webhookHeaders", updatedHeaders);
      setNewHeaderKey("");
      setNewHeaderValue("");
    }
  };

  const removeWebhookHeader = (key: string) => {
    const updatedHeaders = { ...webhookHeaders };
    delete updatedHeaders[key];
    setWebhookHeaders(updatedHeaders);
    handleChange("webhookHeaders", updatedHeaders);
  };

  const getStatusIcon = () => {
    switch (executionStatus) {
      case "success":
        return <CheckCircle className='h-4 w-4 text-green-500' />;
      case "error":
        return <AlertCircle className='h-4 w-4 text-red-500' />;
      case "warning":
        return <AlertCircle className='h-4 w-4 text-yellow-500' />;
      case "running":
        return <Loader2 className='h-4 w-4 animate-spin text-blue-500' />;
      default:
        return <Bell className='h-4 w-4 text-gray-400' />;
    }
  };

  const getStatusColor = () => {
    switch (executionStatus) {
      case "success":
        return "bg-green-50 border-green-200 text-green-800";
      case "error":
        return "bg-red-50 border-red-200 text-red-800";
      case "warning":
        return "bg-yellow-50 border-yellow-200 text-yellow-800";
      case "running":
        return "bg-blue-50 border-blue-200 text-blue-800";
      default:
        return "bg-gray-50 border-gray-200 text-gray-800";
    }
  };

  const getNotificationTypeIcon = (type: string) => {
    switch (type) {
      case "email":
        return <Bell className='h-4 w-4' />;
      case "webhook":
        return <Send className='h-4 w-4' />;
      case "discord":
        return <Bell className='h-4 w-4' />;
      case "slack":
        return <Bell className='h-4 w-4' />;
      case "telegram":
        return <Bell className='h-4 w-4' />;
      default:
        return <Bell className='h-4 w-4' />;
    }
  };

  const notificationType = (config.notificationType as string) || "email";

  return (
    <div className='space-y-6'>
      {/* Status Bar */}
      {executionStatus !== "idle" && (
        <Alert className={cn(getStatusColor(), "border-l-4")}>
          <div className='flex items-center space-x-3'>
            {getStatusIcon()}
            <AlertDescription className='font-medium'>
              {executionStatus === "running" && "Sending notification..."}
              {executionStatus === "success" &&
                "Notification sent successfully"}
              {executionStatus === "error" &&
                `Failed to send notification: ${executionData?.error || "Unknown error"}`}
              {executionStatus === "warning" &&
                "Notification sent with warnings"}
            </AlertDescription>
          </div>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className='w-full'>
        <TabsList className='grid w-full grid-cols-3 h-12 bg-muted/50'>
          <TabsTrigger
            value='config'
            className='flex items-center space-x-2 data-[state=active]:bg-background'>
            <Settings className='h-4 w-4' />
            <span>Configuration</span>
          </TabsTrigger>
          <TabsTrigger
            value='template'
            className='flex items-center space-x-2 data-[state=active]:bg-background'>
            <Code className='h-4 w-4' />
            <span>Templates</span>
          </TabsTrigger>
          <TabsTrigger
            value='test'
            className='flex items-center space-x-2 data-[state=active]:bg-background'>
            <Play className='h-4 w-4' />
            <span>Test</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value='config' className='mt-6 space-y-6'>
          {/* Notification Type Selection */}
          <Card className='border-l-4 border-l-primary/20'>
            <CardHeader className='pb-4'>
              <CardTitle className='flex items-center space-x-3 text-lg'>
                {getNotificationTypeIcon(notificationType)}
                <span>Notification Type</span>
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-6'>
              <div className='space-y-3'>
                <Label
                  htmlFor='notificationType'
                  className='text-sm font-medium'>
                  Type
                </Label>
                <Select
                  value={notificationType}
                  onValueChange={(value) =>
                    handleChange("notificationType", value)
                  }>
                  <SelectTrigger id='notificationType' className='h-11'>
                    <SelectValue placeholder='Select notification type' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='email'>
                      <div className='flex items-center space-x-2'>
                        <Bell className='h-4 w-4' />
                        <span>Email</span>
                      </div>
                    </SelectItem>
                    <SelectItem value='webhook'>
                      <div className='flex items-center space-x-2'>
                        <Send className='h-4 w-4' />
                        <span>Webhook</span>
                      </div>
                    </SelectItem>
                    <SelectItem value='discord'>
                      <div className='flex items-center space-x-2'>
                        <Bell className='h-4 w-4' />
                        <span>Discord</span>
                      </div>
                    </SelectItem>
                    <SelectItem value='slack'>
                      <div className='flex items-center space-x-2'>
                        <Bell className='h-4 w-4' />
                        <span>Slack</span>
                      </div>
                    </SelectItem>
                    <SelectItem value='telegram'>
                      <div className='flex items-center space-x-2'>
                        <Bell className='h-4 w-4' />
                        <span>Telegram</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {getFieldError("notificationType") && (
                  <div className='flex items-center space-x-2 text-sm text-red-500'>
                    <AlertCircle className='h-4 w-4' />
                    <span>{getFieldError("notificationType")}</span>
                  </div>
                )}
              </div>

              {/* Email Configuration */}
              {notificationType === "email" && (
                <div className='space-y-6 pt-4 border-t border-border/50'>
                  <div className='space-y-3'>
                    <Label
                      htmlFor='emailProvider'
                      className='text-sm font-medium'>
                      Email Provider
                    </Label>
                    <Select
                      value={(config.emailProvider as string) || "smtp"}
                      onValueChange={(value) =>
                        handleChange("emailProvider", value)
                      }>
                      <SelectTrigger id='emailProvider' className='h-11'>
                        <SelectValue placeholder='Select provider' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='smtp'>SMTP</SelectItem>
                        <SelectItem value='sendgrid'>SendGrid</SelectItem>
                        <SelectItem value='ses'>AWS SES</SelectItem>
                        <SelectItem value='gmail'>Gmail</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className='space-y-3'>
                    <Label htmlFor='to' className='text-sm font-medium'>
                      To <span className='text-red-500'>*</span>
                    </Label>
                    <Input
                      id='to'
                      placeholder='recipient@example.com'
                      value={(config.to as string) || ""}
                      onChange={(e) => handleChange("to", e.target.value)}
                      className='h-11'
                    />
                    {getFieldError("to") && (
                      <div className='flex items-center space-x-2 text-sm text-red-500'>
                        <AlertCircle className='h-4 w-4' />
                        <span>{getFieldError("to")}</span>
                      </div>
                    )}
                  </div>

                  <div className='space-y-3'>
                    <Label htmlFor='subject' className='text-sm font-medium'>
                      Subject <span className='text-red-500'>*</span>
                    </Label>
                    <Input
                      id='subject'
                      placeholder='Notification subject'
                      value={(config.subject as string) || ""}
                      onChange={(e) => handleChange("subject", e.target.value)}
                      className='h-11'
                    />
                    {getFieldError("subject") && (
                      <div className='flex items-center space-x-2 text-sm text-red-500'>
                        <AlertCircle className='h-4 w-4' />
                        <span>{getFieldError("subject")}</span>
                      </div>
                    )}
                  </div>

                  <div className='space-y-3'>
                    <Label htmlFor='body' className='text-sm font-medium'>
                      Body <span className='text-red-500'>*</span>
                    </Label>
                    <Textarea
                      id='body'
                      placeholder='Notification message...'
                      value={(config.body as string) || ""}
                      onChange={(e) => handleChange("body", e.target.value)}
                      rows={6}
                      className='resize-none'
                    />
                    {getFieldError("body") && (
                      <div className='flex items-center space-x-2 text-sm text-red-500'>
                        <AlertCircle className='h-4 w-4' />
                        <span>{getFieldError("body")}</span>
                      </div>
                    )}
                  </div>

                  <div className='grid grid-cols-2 gap-4'>
                    <div className='space-y-3'>
                      <Label htmlFor='cc' className='text-sm font-medium'>
                        CC (optional)
                      </Label>
                      <Input
                        id='cc'
                        placeholder='cc@example.com'
                        value={(config.cc as string) || ""}
                        onChange={(e) => handleChange("cc", e.target.value)}
                        className='h-11'
                      />
                    </div>
                    <div className='space-y-3'>
                      <Label htmlFor='bcc' className='text-sm font-medium'>
                        BCC (optional)
                      </Label>
                      <Input
                        id='bcc'
                        placeholder='bcc@example.com'
                        value={(config.bcc as string) || ""}
                        onChange={(e) => handleChange("bcc", e.target.value)}
                        className='h-11'
                      />
                    </div>
                  </div>

                  <div className='flex items-center space-x-3 p-3 bg-muted/30 rounded-lg'>
                    <Switch
                      id='htmlFormat'
                      checked={(config.htmlFormat as boolean) !== false}
                      onCheckedChange={(checked) =>
                        handleChange("htmlFormat", checked)
                      }
                    />
                    <Label htmlFor='htmlFormat' className='text-sm font-medium'>
                      Send as HTML
                    </Label>
                  </div>
                </div>
              )}

              {/* Webhook Configuration */}
              {notificationType === "webhook" && (
                <div className='space-y-6 pt-4 border-t border-border/50'>
                  <div className='space-y-3'>
                    <Label htmlFor='webhookUrl' className='text-sm font-medium'>
                      Webhook URL
                    </Label>
                    <Input
                      id='webhookUrl'
                      placeholder='https://api.example.com/webhook'
                      value={(config.webhookUrl as string) || ""}
                      onChange={(e) =>
                        handleChange("webhookUrl", e.target.value)
                      }
                      className='h-11'
                    />
                    {getFieldError("webhookUrl") && (
                      <div className='flex items-center space-x-2 text-sm text-red-500'>
                        <AlertCircle className='h-4 w-4' />
                        <span>{getFieldError("webhookUrl")}</span>
                      </div>
                    )}
                  </div>

                  <div className='space-y-3'>
                    <Label
                      htmlFor='webhookMethod'
                      className='text-sm font-medium'>
                      HTTP Method
                    </Label>
                    <Select
                      value={(config.webhookMethod as string) || "POST"}
                      onValueChange={(value) =>
                        handleChange("webhookMethod", value)
                      }>
                      <SelectTrigger id='webhookMethod' className='h-11'>
                        <SelectValue placeholder='Select method' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='POST'>POST</SelectItem>
                        <SelectItem value='PUT'>PUT</SelectItem>
                        <SelectItem value='PATCH'>PATCH</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Collapsible
                    open={!advancedCollapsed}
                    onOpenChange={setAdvancedCollapsed}>
                    <CollapsibleTrigger asChild>
                      <Button
                        variant='outline'
                        className='w-full justify-between'>
                        <span>Advanced Settings</span>
                        {advancedCollapsed ? (
                          <ChevronRight className='h-4 w-4' />
                        ) : (
                          <ChevronDown className='h-4 w-4' />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className='space-y-4 pt-4'>
                      <div className='space-y-2'>
                        <Label>Custom Headers</Label>
                        <div className='space-y-2'>
                          {Object.entries(webhookHeaders).map(
                            ([key, value]) => (
                              <div
                                key={key}
                                className='flex items-center space-x-2'>
                                <Input
                                  value={key}
                                  disabled
                                  className='flex-1'
                                />
                                <Input
                                  value={value}
                                  disabled
                                  className='flex-1'
                                />
                                <Button
                                  variant='outline'
                                  size='sm'
                                  onClick={() => removeWebhookHeader(key)}>
                                  <X className='h-4 w-4' />
                                </Button>
                              </div>
                            )
                          )}
                          <div className='flex items-center space-x-2'>
                            <Input
                              placeholder='Header name'
                              value={newHeaderKey}
                              onChange={(e) => setNewHeaderKey(e.target.value)}
                              className='flex-1'
                            />
                            <Input
                              placeholder='Header value'
                              value={newHeaderValue}
                              onChange={(e) =>
                                setNewHeaderValue(e.target.value)
                              }
                              className='flex-1'
                            />
                            <Button
                              variant='outline'
                              size='sm'
                              onClick={addWebhookHeader}
                              disabled={!newHeaderKey || !newHeaderValue}>
                              <Plus className='h-4 w-4' />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              )}

              {/* Discord Configuration */}
              {notificationType === "discord" && (
                <div className='space-y-6 pt-4 border-t border-border/50'>
                  <div className='space-y-3'>
                    <Label
                      htmlFor='discordWebhookUrl'
                      className='text-sm font-medium'>
                      Discord Webhook URL
                    </Label>
                    <Input
                      id='discordWebhookUrl'
                      placeholder='https://discord.com/api/webhooks/...'
                      value={(config.discordWebhookUrl as string) || ""}
                      onChange={(e) =>
                        handleChange("discordWebhookUrl", e.target.value)
                      }
                      className='h-11'
                    />
                    {getFieldError("discordWebhookUrl") && (
                      <div className='flex items-center space-x-2 text-sm text-red-500'>
                        <AlertCircle className='h-4 w-4' />
                        <span>{getFieldError("discordWebhookUrl")}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Slack Configuration */}
              {notificationType === "slack" && (
                <div className='space-y-6 pt-4 border-t border-border/50'>
                  <div className='space-y-3'>
                    <Label
                      htmlFor='slackWebhookUrl'
                      className='text-sm font-medium'>
                      Slack Webhook URL
                    </Label>
                    <Input
                      id='slackWebhookUrl'
                      placeholder='https://hooks.slack.com/...'
                      value={(config.slackWebhookUrl as string) || ""}
                      onChange={(e) =>
                        handleChange("slackWebhookUrl", e.target.value)
                      }
                      className='h-11'
                    />
                    {getFieldError("slackWebhookUrl") && (
                      <div className='flex items-center space-x-2 text-sm text-red-500'>
                        <AlertCircle className='h-4 w-4' />
                        <span>{getFieldError("slackWebhookUrl")}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Telegram Configuration */}
              {notificationType === "telegram" && (
                <div className='space-y-6 pt-4 border-t border-border/50'>
                  <div className='space-y-3'>
                    <Label
                      htmlFor='telegramBotToken'
                      className='text-sm font-medium'>
                      Bot Token
                    </Label>
                    <div className='relative'>
                      <Input
                        id='telegramBotToken'
                        type={showPassword ? "text" : "password"}
                        placeholder='1234567890:ABCdefGHIjklMNOpqrsTUVwxyz'
                        value={(config.telegramBotToken as string) || ""}
                        onChange={(e) =>
                          handleChange("telegramBotToken", e.target.value)
                        }
                        className='h-11'
                      />
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        className='absolute right-0 top-0 h-full px-3'
                        onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? (
                          <EyeOff className='h-4 w-4' />
                        ) : (
                          <Eye className='h-4 w-4' />
                        )}
                      </Button>
                    </div>
                    {getFieldError("telegramBotToken") && (
                      <div className='flex items-center space-x-2 text-sm text-red-500'>
                        <AlertCircle className='h-4 w-4' />
                        <span>{getFieldError("telegramBotToken")}</span>
                      </div>
                    )}
                  </div>

                  <div className='space-y-3'>
                    <Label
                      htmlFor='telegramChatId'
                      className='text-sm font-medium'>
                      Chat ID
                    </Label>
                    <Input
                      id='telegramChatId'
                      placeholder='123456789'
                      value={(config.telegramChatId as string) || ""}
                      onChange={(e) =>
                        handleChange("telegramChatId", e.target.value)
                      }
                      className='h-11'
                    />
                    {getFieldError("telegramChatId") && (
                      <div className='flex items-center space-x-2 text-sm text-red-500'>
                        <AlertCircle className='h-4 w-4' />
                        <span>{getFieldError("telegramChatId")}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='template' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center space-x-2'>
                <Code className='h-4 w-4' />
                <span>Template Variables</span>
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <Alert>
                <Info className='h-4 w-4' />
                <AlertDescription>
                  Use template variables to include dynamic data from previous
                  blocks in your notifications. Variables are processed at
                  runtime with actual data from your workflow.
                </AlertDescription>
              </Alert>

              <div className='space-y-2'>
                <Label>Available Variables</Label>
                <div className='grid gap-2'>
                  {templateVariables.map((variable) => (
                    <TooltipProvider key={variable.name}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant='outline'
                            size='sm'
                            className='justify-start text-left'
                            onClick={() => {
                              // Insert variable into appropriate field based on notification type
                              if (notificationType === "email") {
                                const currentBody =
                                  (config.body as string) || "";
                                handleChange(
                                  "body",
                                  currentBody + variable.name
                                );
                              }
                            }}>
                            <Badge variant='secondary' className='mr-2'>
                              {variable.name}
                            </Badge>
                            {variable.description}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            <strong>Example:</strong> {variable.example}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>
              </div>

              <Collapsible
                open={templateCollapsed}
                onOpenChange={setTemplateCollapsed}>
                <CollapsibleTrigger asChild>
                  <Button variant='outline' className='w-full justify-between'>
                    <span>Template Examples</span>
                    {templateCollapsed ? (
                      <ChevronRight className='h-4 w-4' />
                    ) : (
                      <ChevronDown className='h-4 w-4' />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className='space-y-4 pt-4'>
                  <div className='space-y-4'>
                    <div className='space-y-2'>
                      <Label>Email Template Examples</Label>
                      <div className='space-y-2 text-sm'>
                        <div className='p-2 bg-gray-50 rounded'>
                          <strong>Subject:</strong> Alert: {"{json.title}"} -{" "}
                          {"{json.status}"}
                        </div>
                        <div className='p-2 bg-gray-50 rounded'>
                          <strong>Body:</strong> Hello {"{json.name}"},<br />
                          The price of {"{json.currency}"} has reached{" "}
                          {"{json.price}"}.<br />
                          Time: {"{json.timestamp}"}
                        </div>
                      </div>
                    </div>

                    <div className='space-y-2'>
                      <Label>Webhook Template Examples</Label>
                      <div className='space-y-2 text-sm'>
                        <div className='p-2 bg-gray-50 rounded'>
                          <strong>URL:</strong> https://api.example.com/webhook/
                          {"{json.userId}"}
                        </div>
                        <div className='p-2 bg-gray-50 rounded'>
                          <strong>Body:</strong> {"{"}"message": "
                          {"{json.message}"}", "status": "{"{json.status}"}"
                          {"}"}
                        </div>
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='test' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center space-x-2'>
                <Play className='h-4 w-4' />
                <span>Test Notification</span>
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <Alert>
                <Info className='h-4 w-4' />
                <AlertDescription>
                  Test your notification configuration with sample data to
                  ensure it works correctly.
                </AlertDescription>
              </Alert>

              <div className='space-y-4'>
                <div className='flex items-center justify-between'>
                  <div>
                    <h4 className='font-medium'>Configuration Status</h4>
                    <p className='text-sm text-gray-500'>
                      {isValid
                        ? "Configuration is valid"
                        : "Configuration has errors"}
                    </p>
                  </div>
                  <Badge variant={isValid ? "default" : "destructive"}>
                    {isValid ? "Valid" : "Invalid"}
                  </Badge>
                </div>

                {!isValid && (
                  <Alert variant='destructive'>
                    <AlertCircle className='h-4 w-4' />
                    <AlertDescription>
                      Please fix the configuration errors before testing:
                      <ul className='mt-2 list-disc list-inside'>
                        {validationErrors.map((error, index) => (
                          <li key={index}>{error.message}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  onClick={onTest}
                  disabled={!isValid || executionStatus === "running"}
                  className='w-full'>
                  {executionStatus === "running" ? (
                    <>
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                      Sending Test...
                    </>
                  ) : (
                    <>
                      <Send className='mr-2 h-4 w-4' />
                      Send Test Notification
                    </>
                  )}
                </Button>

                {executionData && (
                  <div className='space-y-2'>
                    <h4 className='font-medium'>Last Test Result</h4>
                    <div className='p-3 bg-gray-50 rounded text-sm'>
                      <div>
                        <strong>Status:</strong> {executionStatus}
                      </div>
                      {executionData.startTime && (
                        <div>
                          <strong>Start Time:</strong>{" "}
                          {new Date(executionData.startTime).toLocaleString()}
                        </div>
                      )}
                      {executionData.endTime && (
                        <div>
                          <strong>End Time:</strong>{" "}
                          {new Date(executionData.endTime).toLocaleString()}
                        </div>
                      )}
                      {executionData.duration && (
                        <div>
                          <strong>Duration:</strong> {executionData.duration}ms
                        </div>
                      )}
                      {executionData.error && (
                        <div className='text-red-600'>
                          <strong>Error:</strong> {executionData.error}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
