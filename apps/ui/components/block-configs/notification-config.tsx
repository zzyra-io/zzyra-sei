"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bell,
  Send,
  AlertCircle,
  CheckCircle,
  Info,
  Loader2,
  Play,
  Settings,
  ChevronDown,
  ChevronRight,
  Code,
  Mail,
  Sparkles,
  Shield,
  Zap,
} from "lucide-react";
import { BlockType, getEnhancedBlockSchema } from "@zyra/types";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { z } from "zod";
import {
  TemplateVariable,
  InlineTemplateVariable,
} from "@/components/ui/template-variable";

// Template variables available from previous blocks
const templateVariables: TemplateVariable[] = [
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
];

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
  const [isValid, setIsValid] = useState(true);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>(
    []
  );
  const [activeTab, setActiveTab] = useState("config");
  const [templateCollapsed, setTemplateCollapsed] = useState(true);

  // Get the enhanced schema for validation
  const enhancedSchema = getEnhancedBlockSchema(BlockType.NOTIFICATION);

  // Simple validation using Zod schema
  const validateConfig = useCallback(
    (configData: Record<string, unknown>) => {
      if (!enhancedSchema) {
        return { success: true, error: "" };
      }

      try {
        enhancedSchema.configSchema.parse(configData);
        return { success: true, error: "" };
      } catch (error: any) {
        if (error.errors) {
          const errors = error.errors.map((err: any) => ({
            path: err.path || [],
            message: err.message,
          }));
          return {
            success: false,
            error: errors.map((e: any) => e.message).join(", "),
            errors,
          };
        } else {
          return {
            success: false,
            error: error.message || "Validation failed",
          };
        }
      }
    },
    [enhancedSchema]
  );

  // Format field names for better display
  const formatFieldName = (fieldName: string): string => {
    const fieldMap: Record<string, string> = {
      notificationType: "Notification Type",
      to: "Email Address",
      cc: "CC Email",
      bcc: "BCC Email",
      subject: "Subject",
      body: "Message Body",
      emailProvider: "Email Provider",
      htmlFormat: "HTML Format",
    };
    return fieldMap[fieldName] || fieldName;
  };

  // Get field validation error using Zod schema - only for relevant fields
  const getFieldError = (fieldName: string): string | undefined => {
    const result = validateConfig(config);
    if (!result.success && result.errors) {
      const fieldError = result.errors.find((err: any) =>
        err.path.includes(fieldName)
      );
      if (fieldError) {
        // Convert Zod error messages to user-friendly ones
        const message = fieldError.message;
        if (message.includes("Invalid email address")) {
          return "Please enter a valid email address";
        }
        if (message.includes("Invalid URL")) {
          return "Please enter a valid URL";
        }
        if (message.includes("at least 1 character")) {
          return "This field is required";
        }
        return message;
      }
    }
    return undefined;
  };

  // Get all validation errors - only for email fields
  const getAllValidationErrors = (): Array<{
    field: string;
    error: string;
  }> => {
    const result = validateConfig(config);
    if (!result.success && result.errors) {
      return result.errors
        .map((err: any) => {
          const field = err.path.join(".");
          let message = err.message;

          // Convert to user-friendly messages
          if (message.includes("Invalid email address")) {
            message = "Please enter a valid email address";
          } else if (message.includes("at least 1 character")) {
            message = "This field is required";
          }

          // Extract the actual field name from nested paths like 'config.to'
          const fieldName = field.includes(".")
            ? field.split(".").pop()
            : field;

          return {
            field: formatFieldName(fieldName),
            error: message,
          };
        })
        .filter((error: any) => {
          // Filter out empty field errors
          if (!error.field || error.field === "") return false;

          // Only show errors for email fields
          const emailFields = ["to", "subject", "body", "cc", "bcc"];
          const fieldName = error.field.toLowerCase();
          return emailFields.includes(fieldName);
        });
    }
    return [];
  };

  // Validate on config changes
  useEffect(() => {
    const result = validateConfig(config);
    setIsValid(result.success);
    if (!result.success) {
      setValidationErrors(result.errors || []);
    } else {
      setValidationErrors([]);
    }
  }, [config, validateConfig]);

  // Initialize with defaults if values are missing
  useEffect(() => {
    const defaults = {
      notificationType: "email", // Always email
      to: config.to || "",
      subject: config.subject || "",
      body: config.body || "",
      emailProvider: config.emailProvider || "smtp",
      htmlFormat: config.htmlFormat !== false,
      cc: config.cc || undefined,
      bcc: config.bcc || undefined,
    };

    // Only update if there are missing values
    if (Object.keys(defaults).some((key) => config[key] === undefined)) {
      onChange({ ...config, ...defaults });
    }
  }, []);

  const handleChange = (field: string, value: unknown) => {
    // For optional fields, treat empty strings as undefined
    let processedValue = value;
    const optionalFields = ["cc", "bcc"];

    if (optionalFields.includes(field) && value === "") {
      processedValue = undefined;
    }

    const newConfig = { ...config, [field]: processedValue };
    console.log(
      `NotificationConfig: handleChange called for ${field} with value:`,
      value
    );
    console.log(`NotificationConfig: Previous config:`, config);
    console.log(`NotificationConfig: New config:`, newConfig);
    onChange(newConfig);
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

  const notificationType = "email"; // Always email

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
        <TabsList className='grid w-full grid-cols-3 h-12 bg-muted/50 rounded-lg p-1'>
          <TabsTrigger
            value='config'
            className='flex items-center space-x-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md'>
            <Settings className='h-4 w-4' />
            <span>Configuration</span>
          </TabsTrigger>
          <TabsTrigger
            value='template'
            className='flex items-center space-x-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md'>
            <Code className='h-4 w-4' />
            <span>Templates</span>
          </TabsTrigger>
          <TabsTrigger
            value='test'
            className='flex items-center space-x-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md'>
            <Play className='h-4 w-4' />
            <span>Test</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value='config' className='mt-6 space-y-6'>
          {/* Email Configuration */}
          <Card className='border-0 shadow-sm bg-card/50'>
            <CardContent className='p-6 space-y-6'>
              <div className='flex items-center space-x-3'>
                <div className='w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-600/20 flex items-center justify-center'>
                  <Mail className='h-5 w-5 text-blue-600' />
                </div>
                <div>
                  <h3 className='font-semibold text-lg'>Email Configuration</h3>
                  <p className='text-sm text-muted-foreground'>
                    Configure your email notification settings
                  </p>
                </div>
              </div>

              <div className='space-y-4'>
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
                    required
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
                    required
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
                    required
                  />
                  {getFieldError("body") && (
                    <div className='flex items-center space-x-2 text-sm text-red-500'>
                      <AlertCircle className='h-4 w-4' />
                      <span>{getFieldError("body")}</span>
                    </div>
                  )}
                  {!config.body && (
                    <div className='flex items-center space-x-2 text-sm text-amber-500'>
                      <AlertCircle className='h-4 w-4' />
                      <span>Email body is required for execution</span>
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

                {/* Show validation errors for CC and BCC */}
                {(getFieldError("cc") || getFieldError("bcc")) && (
                  <div className='space-y-2'>
                    {getFieldError("cc") && (
                      <div className='flex items-center space-x-2 text-sm text-red-500'>
                        <AlertCircle className='h-4 w-4' />
                        <span>CC: {getFieldError("cc")}</span>
                      </div>
                    )}
                    {getFieldError("bcc") && (
                      <div className='flex items-center space-x-2 text-sm text-red-500'>
                        <AlertCircle className='h-4 w-4' />
                        <span>BCC: {getFieldError("bcc")}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className='flex items-center space-x-3 p-4 bg-muted/30 rounded-lg'>
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='template' className='space-y-4'>
          <Card className='border-0 shadow-sm bg-card/50'>
            <CardContent className='p-6 space-y-6'>
              <div className='flex items-center space-x-3'>
                <div className='w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/10 to-purple-600/20 flex items-center justify-center'>
                  <Code className='h-5 w-5 text-purple-600' />
                </div>
                <div>
                  <h3 className='font-semibold text-lg'>Template Variables</h3>
                  <p className='text-sm text-muted-foreground'>
                    Use dynamic variables in your notifications
                  </p>
                </div>
              </div>

              <Alert>
                <Info className='h-4 w-4' />
                <AlertDescription>
                  Use template variables to include dynamic data from previous
                  blocks in your notifications. Variables are processed at
                  runtime with actual data from your workflow.
                </AlertDescription>
              </Alert>

              <div className='space-y-4'>
                <Label className='text-sm font-medium'>
                  Available Variables
                </Label>
                <div className='grid gap-3'>
                  {templateVariables.map((variable) => (
                    <TooltipProvider key={variable.name}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant='outline'
                            size='sm'
                            className='justify-start text-left h-auto p-3'
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
                            <div className='mr-3'>
                              <TemplateVariable variant='secondary' size='sm'>
                                {variable.name}
                              </TemplateVariable>
                            </div>
                            <div className='text-left'>
                              <p className='font-medium text-sm'>
                                {variable.description}
                              </p>
                              <p className='text-xs text-muted-foreground'>
                                Example: {variable.example}
                              </p>
                            </div>
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
                  <Button
                    variant='outline'
                    className='w-full justify-between h-11'>
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
                    <div className='space-y-3'>
                      <Label className='text-sm font-medium'>
                        Email Template Examples
                      </Label>
                      <div className='space-y-3'>
                        <div className='p-4 bg-muted/30 rounded-lg'>
                          <p className='font-medium text-sm mb-2'>Subject:</p>
                          <p className='text-sm'>
                            Alert:{" "}
                            <InlineTemplateVariable>
                              {"{json.title}"}
                            </InlineTemplateVariable>{" "}
                            -{" "}
                            <InlineTemplateVariable>
                              {"{json.status}"}
                            </InlineTemplateVariable>
                          </p>
                        </div>
                        <div className='p-4 bg-muted/30 rounded-lg'>
                          <p className='font-medium text-sm mb-2'>Body:</p>
                          <p className='text-sm'>
                            Hello{" "}
                            <InlineTemplateVariable>
                              {"{json.name}"}
                            </InlineTemplateVariable>
                            ,<br />
                            The price of{" "}
                            <InlineTemplateVariable>
                              {"{json.currency}"}
                            </InlineTemplateVariable>{" "}
                            has reached{" "}
                            <InlineTemplateVariable>
                              {"{json.price}"}
                            </InlineTemplateVariable>
                            .<br />
                            Time:{" "}
                            <InlineTemplateVariable>
                              {"{json.timestamp}"}
                            </InlineTemplateVariable>
                          </p>
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
          <Card className='border-0 shadow-sm bg-card/50'>
            <CardContent className='p-6 space-y-6'>
              <div className='flex items-center space-x-3'>
                <div className='w-10 h-10 rounded-lg bg-gradient-to-br from-green-500/10 to-green-600/20 flex items-center justify-center'>
                  <Play className='h-5 w-5 text-green-600' />
                </div>
                <div>
                  <h3 className='font-semibold text-lg'>Test Notification</h3>
                  <p className='text-sm text-muted-foreground'>
                    Test your configuration with sample data
                  </p>
                </div>
              </div>

              <Alert>
                <Info className='h-4 w-4' />
                <AlertDescription>
                  Test your notification configuration with sample data to
                  ensure it works correctly.
                </AlertDescription>
              </Alert>

              <div className='space-y-4'>
                <div className='flex items-center justify-between p-4 bg-muted/30 rounded-lg'>
                  <div>
                    <h4 className='font-medium'>Configuration Status</h4>
                    <p className='text-sm text-muted-foreground'>
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
                      Please fix the configuration issues before testing:
                      <ul className='mt-2 list-disc list-inside space-y-1'>
                        {getAllValidationErrors().map((error, index) => (
                          <li key={index} className='text-sm'>
                            <span className='font-medium'>{error.field}:</span>{" "}
                            {error.error}
                          </li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  onClick={onTest}
                  disabled={!isValid || executionStatus === "running"}
                  className='w-full h-11 bg-primary hover:bg-primary/90'>
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
                  <div className='space-y-3'>
                    <h4 className='font-medium'>Last Test Result</h4>
                    <div className='p-4 bg-muted/30 rounded-lg space-y-2 text-sm'>
                      <div className='flex justify-between'>
                        <span className='text-muted-foreground'>Status:</span>
                        <span className='font-medium'>{executionStatus}</span>
                      </div>
                      {executionData.startTime && (
                        <div className='flex justify-between'>
                          <span className='text-muted-foreground'>
                            Start Time:
                          </span>
                          <span className='font-medium'>
                            {new Date(executionData.startTime).toLocaleString()}
                          </span>
                        </div>
                      )}
                      {executionData.endTime && (
                        <div className='flex justify-between'>
                          <span className='text-muted-foreground'>
                            End Time:
                          </span>
                          <span className='font-medium'>
                            {new Date(executionData.endTime).toLocaleString()}
                          </span>
                        </div>
                      )}
                      {executionData.duration && (
                        <div className='flex justify-between'>
                          <span className='text-muted-foreground'>
                            Duration:
                          </span>
                          <span className='font-medium'>
                            {executionData.duration}ms
                          </span>
                        </div>
                      )}
                      {executionData.error && (
                        <div className='text-red-600 text-sm'>
                          <span className='font-medium'>Error:</span>{" "}
                          {executionData.error}
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
