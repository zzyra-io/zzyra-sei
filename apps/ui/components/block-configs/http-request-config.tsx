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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Eye,
  EyeOff,
  Info,
  Loader2,
  Play,
  Plus,
  X,
  Zap,
} from "lucide-react";
import { enhancedHttpRequestSchema } from "@zyra/types";

// Remove the circular dependency - don't self-register
// import blockConfigRegistry from "@/lib/block-config-registry";

interface HttpRequestConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  executionStatus?: "idle" | "running" | "success" | "error" | "warning";
  executionData?: {
    startTime?: string;
    endTime?: string;
    duration?: number;
    error?: string;
    lastResponse?: Record<string, unknown>;
  };
  onTest?: () => void;
}

interface ValidationError {
  path: string[];
  message: string;
}

interface SchemaField {
  key: string;
  type: string;
  description?: string;
  required: boolean;
  defaultValue?: unknown;
  enum?: string[];
}

export function HttpRequestConfig({
  config,
  onChange,
  executionStatus = "idle",
  executionData,
  onTest,
}: HttpRequestConfigProps) {
  const [headers, setHeaders] = useState<Record<string, string>>(
    (config.headers as Record<string, string>) || {}
  );
  const [queryParams, setQueryParams] = useState<Record<string, string>>(
    (config.queryParams as Record<string, string>) || {}
  );
  const [newHeaderKey, setNewHeaderKey] = useState("");
  const [newHeaderValue, setNewHeaderValue] = useState("");
  const [newQueryKey, setNewQueryKey] = useState("");
  const [newQueryValue, setNewQueryValue] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>(
    []
  );
  const [isValid, setIsValid] = useState(true);
  const [activeTab, setActiveTab] = useState("config");
  const [authCollapsed, setAuthCollapsed] = useState(true);
  const [advancedCollapsed, setAdvancedCollapsed] = useState(true);
  const [headersCollapsed, setHeadersCollapsed] = useState(false);
  const [queryParamsCollapsed, setQueryParamsCollapsed] = useState(false);

  // Use the enhanced schema from @zyra/types
  const schema = enhancedHttpRequestSchema;

  // Schema-driven validation
  const validateConfig = useMemo(() => {
    return (configData: unknown) => {
      try {
        schema.configSchema.parse(configData);
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
  }, [schema]);

  // Validate on config changes
  useEffect(() => {
    validateConfig(config);
  }, [config, validateConfig]);

  // Get field validation error
  const getFieldError = (fieldName: string): string | undefined => {
    const error = validationErrors.find((err) => err.path.includes(fieldName));
    return error?.message;
  };

  // Get input/output schema descriptions
  const inputSchemaFields = useMemo(() => {
    const schema = enhancedHttpRequestSchema.inputSchema;
    const shape =
      (schema as unknown as { _def?: { shape?: Record<string, unknown> } })._def
        ?.shape || {};
    return Object.keys(shape).map(
      (key): SchemaField => ({
        key,
        type: getSchemaFieldType(shape[key]),
        description: getSchemaFieldDescription(key),
        required: !(
          (shape[key] as unknown as { _def?: { isOptional?: boolean } })?._def
            ?.isOptional ?? false
        ),
      })
    );
  }, [enhancedHttpRequestSchema]);

  const outputSchemaFields = useMemo(() => {
    const schema = enhancedHttpRequestSchema.outputSchema;
    const shape =
      (schema as unknown as { _def?: { shape?: Record<string, unknown> } })._def
        ?.shape || {};
    return Object.keys(shape).map(
      (key): SchemaField => ({
        key,
        type: getSchemaFieldType(shape[key]),
        description: getSchemaFieldDescription(key, true),
        required: !(
          (shape[key] as unknown as { _def?: { isOptional?: boolean } })?._def
            ?.isOptional ?? false
        ),
      })
    );
  }, [enhancedHttpRequestSchema]);

  function getSchemaFieldType(field: unknown): string {
    const typeName =
      (field as unknown as { _def?: { typeName?: string } })?._def?.typeName ||
      "unknown";
    switch (typeName) {
      case "ZodString":
        return "string";
      case "ZodNumber":
        return "number";
      case "ZodBoolean":
        return "boolean";
      case "ZodArray":
        return "array";
      case "ZodObject":
        return "object";
      case "ZodEnum":
        return "enum";
      default:
        return "any";
    }
  }

  function getSchemaFieldDescription(key: string, isOutput = false): string {
    const descriptions: Record<string, string> = {
      // Input descriptions (updated for generic schema)
      data: "Generic data from previous blocks",
      context: "Workflow execution context",
      variables: "Workflow variables and template data",
      // Output descriptions
      statusCode: "HTTP response status code",
      statusText: "HTTP response status text",
      body: "Response body data",
      headers: "Response headers as key-value pairs",
      url: "The URL that was requested",
      method: "The HTTP method used",
      timestamp: "ISO timestamp of the request",
      success: "Whether the request was successful",
      error: "Error message if request failed",
    };
    return (
      descriptions[key as keyof typeof descriptions] ||
      `${isOutput ? "Output" : "Input"} field: ${key}`
    );
  }

  const handleChange = (field: string, value: unknown) => {
    onChange({ ...config, [field]: value });
  };

  const addHeader = () => {
    if (newHeaderKey && newHeaderValue) {
      const updatedHeaders = { ...headers, [newHeaderKey]: newHeaderValue };
      setHeaders(updatedHeaders);
      handleChange("headers", updatedHeaders);
      setNewHeaderKey("");
      setNewHeaderValue("");
    }
  };

  const removeHeader = (key: string) => {
    const updatedHeaders = { ...headers };
    delete updatedHeaders[key];
    setHeaders(updatedHeaders);
    handleChange("headers", updatedHeaders);
  };

  const addQueryParam = () => {
    if (newQueryKey && newQueryValue) {
      const updatedQueryParams = {
        ...queryParams,
        [newQueryKey]: newQueryValue,
      };
      setQueryParams(updatedQueryParams);
      handleChange("queryParams", updatedQueryParams);
      setNewQueryKey("");
      setNewQueryValue("");
    }
  };

  const removeQueryParam = (key: string) => {
    const updatedQueryParams = { ...queryParams };
    delete updatedQueryParams[key];
    setQueryParams(updatedQueryParams);
    handleChange("queryParams", updatedQueryParams);
  };

  const handleBodyChange = (value: string) => {
    try {
      // Try to parse as JSON if it's not empty
      if (value.trim()) {
        const parsed = JSON.parse(value);
        handleChange("body", parsed);
      } else {
        handleChange("body", undefined);
      }
    } catch {
      // If it's not valid JSON, store as string
      handleChange("body", value);
    }
  };

  const getStatusIcon = () => {
    switch (executionStatus) {
      case "running":
        return <Loader2 className='h-3 w-3 animate-spin text-blue-500' />;
      case "success":
        return <CheckCircle className='h-3 w-3 text-green-500' />;
      case "error":
        return <AlertCircle className='h-3 w-3 text-red-500' />;
      case "warning":
        return <AlertCircle className='h-3 w-3 text-yellow-500' />;
      default:
        return isValid ? (
          <CheckCircle className='h-3 w-3 text-green-500' />
        ) : (
          <AlertCircle className='h-3 w-3 text-red-500' />
        );
    }
  };

  const getStatusColor = () => {
    switch (executionStatus) {
      case "running":
        return "bg-blue-500";
      case "success":
        return "bg-green-500";
      case "error":
        return "bg-red-500";
      case "warning":
        return "bg-yellow-500";
      default:
        return "bg-blue-500";
    }
  };

  return (
    <div className='w-96 h-full flex flex-col bg-background border-l'>
      <div className='flex items-center justify-between p-4 border-b bg-muted/50'>
        <div className='flex items-center gap-2'>
          <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}></div>
          <h3 className='font-semibold text-sm'>HTTP Request</h3>
          {getStatusIcon()}
          {executionData?.duration && (
            <Badge variant='outline' className='text-xs'>
              <Clock className='h-2 w-2 mr-1' />
              {executionData.duration}ms
            </Badge>
          )}
        </div>
        <div className='flex items-center gap-2'>
          {onTest && (
            <Button
              variant='outline'
              size='sm'
              onClick={onTest}
              disabled={executionStatus === "running" || !isValid}
              className='h-7 px-2 text-xs'>
              {executionStatus === "running" ? (
                <Loader2 className='h-3 w-3 animate-spin' />
              ) : (
                <Play className='h-3 w-3' />
              )}
            </Button>
          )}
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className='flex-1 flex flex-col'>
        <TabsList className='mx-4 mt-2 grid w-auto grid-cols-4 h-8'>
          <TabsTrigger value='config' className='text-xs'>
            Parameters
          </TabsTrigger>
          <TabsTrigger value='inputs' className='text-xs'>
            Inputs
          </TabsTrigger>
          <TabsTrigger value='outputs' className='text-xs'>
            Outputs
          </TabsTrigger>
          <TabsTrigger value='execution' className='text-xs'>
            Execution
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value='config'
          className='flex-1 overflow-y-auto p-0 space-y-0 mt-2'>
          <div className='p-4 space-y-4 border-b bg-background'>
            {/* URL */}
            <div className='space-y-2'>
              <Label
                htmlFor='url'
                className='text-xs font-medium text-muted-foreground uppercase tracking-wider'>
                URL *
              </Label>
              <Input
                id='url'
                placeholder='https://api.example.com/endpoint'
                value={(config.url as string) || ""}
                onChange={(e) => handleChange("url", e.target.value)}
                className='font-mono text-sm'
              />
              {getFieldError("url") && (
                <p className='text-xs text-red-500'>{getFieldError("url")}</p>
              )}
              <p className='text-xs text-muted-foreground'>
                Use {`{{variable}}`} for template variables
              </p>
            </div>

            {/* Method */}
            <div className='space-y-2'>
              <Label
                htmlFor='method'
                className='text-xs font-medium text-muted-foreground uppercase tracking-wider'>
                Method
              </Label>
              <Select
                value={(config.method as string) || "GET"}
                onValueChange={(value) => handleChange("method", value)}>
                <SelectTrigger className='h-9'>
                  <SelectValue placeholder='Select method' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='GET'>
                    <Badge variant='secondary'>GET</Badge>
                  </SelectItem>
                  <SelectItem value='POST'>
                    <Badge variant='default'>POST</Badge>
                  </SelectItem>
                  <SelectItem value='PUT'>
                    <Badge variant='default'>PUT</Badge>
                  </SelectItem>
                  <SelectItem value='DELETE'>
                    <Badge variant='destructive'>DELETE</Badge>
                  </SelectItem>
                  <SelectItem value='PATCH'>
                    <Badge variant='default'>PATCH</Badge>
                  </SelectItem>
                  <SelectItem value='HEAD'>
                    <Badge variant='outline'>HEAD</Badge>
                  </SelectItem>
                  <SelectItem value='OPTIONS'>
                    <Badge variant='outline'>OPTIONS</Badge>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Headers */}
          <Collapsible
            open={!headersCollapsed}
            onOpenChange={(open) => setHeadersCollapsed(!open)}>
            <CollapsibleTrigger asChild>
              <div className='flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer border-b'>
                <div className='flex items-center gap-2'>
                  <span className='text-sm font-medium'>Headers</span>
                  {Object.keys(headers).length > 0 && (
                    <Badge variant='secondary' className='text-xs'>
                      {Object.keys(headers).length}
                    </Badge>
                  )}
                </div>
                {headersCollapsed ? (
                  <ChevronRight className='h-4 w-4' />
                ) : (
                  <ChevronDown className='h-4 w-4' />
                )}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className='p-4 space-y-3 bg-muted/20'>
                {Object.entries(headers).map(([key, value]) => (
                  <div
                    key={key}
                    className='flex items-center gap-2 p-2 bg-background rounded border'>
                    <div className='flex-1 font-mono text-xs'>
                      <span className='text-muted-foreground'>{key}:</span>{" "}
                      <span>{value as string}</span>
                    </div>
                    <Button
                      variant='ghost'
                      size='sm'
                      className='h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground'
                      onClick={() => removeHeader(key)}>
                      <X className='h-3 w-3' />
                    </Button>
                  </div>
                ))}

                <div className='grid grid-cols-2 gap-2'>
                  <Input
                    placeholder='Header name'
                    value={newHeaderKey}
                    onChange={(e) => setNewHeaderKey(e.target.value)}
                    className='h-8 text-xs'
                  />
                  <Input
                    placeholder='Header value'
                    value={newHeaderValue}
                    onChange={(e) => setNewHeaderValue(e.target.value)}
                    className='h-8 text-xs'
                  />
                </div>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={addHeader}
                  disabled={!newHeaderKey || !newHeaderValue}
                  className='w-full h-8 text-xs'>
                  <Plus className='h-3 w-3 mr-1' />
                  Add Header
                </Button>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Query Parameters */}
          <Collapsible
            open={!queryParamsCollapsed}
            onOpenChange={(open) => setQueryParamsCollapsed(!open)}>
            <CollapsibleTrigger asChild>
              <div className='flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer border-b'>
                <div className='flex items-center gap-2'>
                  <span className='text-sm font-medium'>Query Parameters</span>
                  {Object.keys(queryParams).length > 0 && (
                    <Badge variant='secondary' className='text-xs'>
                      {Object.keys(queryParams).length}
                    </Badge>
                  )}
                </div>
                {queryParamsCollapsed ? (
                  <ChevronRight className='h-4 w-4' />
                ) : (
                  <ChevronDown className='h-4 w-4' />
                )}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className='p-4 space-y-3 bg-muted/20'>
                {Object.entries(queryParams).map(([key, value]) => (
                  <div
                    key={key}
                    className='flex items-center gap-2 p-2 bg-background rounded border'>
                    <div className='flex-1 font-mono text-xs'>
                      <span className='text-muted-foreground'>{key}=</span>
                      <span>{value as string}</span>
                    </div>
                    <Button
                      variant='ghost'
                      size='sm'
                      className='h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground'
                      onClick={() => removeQueryParam(key)}>
                      <X className='h-3 w-3' />
                    </Button>
                  </div>
                ))}

                <div className='grid grid-cols-2 gap-2'>
                  <Input
                    placeholder='Parameter name'
                    value={newQueryKey}
                    onChange={(e) => setNewQueryKey(e.target.value)}
                    className='h-8 text-xs'
                  />
                  <Input
                    placeholder='Parameter value'
                    value={newQueryValue}
                    onChange={(e) => setNewQueryValue(e.target.value)}
                    className='h-8 text-xs'
                  />
                </div>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={addQueryParam}
                  disabled={!newQueryKey || !newQueryValue}
                  className='w-full h-8 text-xs'>
                  <Plus className='h-3 w-3 mr-1' />
                  Add Parameter
                </Button>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Body (for POST/PUT/PATCH) */}
          {config.method &&
            !["GET", "DELETE", "HEAD", "OPTIONS"].includes(
              config.method as string
            ) && (
              <div className='p-4 space-y-3 border-b bg-background'>
                <Label
                  htmlFor='body'
                  className='text-xs font-medium text-muted-foreground uppercase tracking-wider'>
                  Request Body
                </Label>
                <Textarea
                  id='body'
                  placeholder='{"key": "value"} or use {{variables}}'
                  value={
                    typeof config.body === "object" && config.body !== null
                      ? JSON.stringify(config.body, null, 2)
                      : (config.body as string) || ""
                  }
                  onChange={(e) => handleBodyChange(e.target.value)}
                  rows={8}
                  className='font-mono text-xs resize-none'
                />
                <p className='text-xs text-muted-foreground'>
                  JSON object or template variables like {`{{previous.data}}`}
                </p>
              </div>
            )}

          {/* Authentication */}
          <Collapsible
            open={!authCollapsed}
            onOpenChange={(open) => setAuthCollapsed(!open)}>
            <CollapsibleTrigger asChild>
              <div className='flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer border-b'>
                <div className='flex items-center gap-2'>
                  <span className='text-sm font-medium'>Authentication</span>
                  {config.authentication &&
                    config.authentication !== "none" && (
                      <Badge variant='outline' className='text-xs'>
                        {String(config.authentication)}
                      </Badge>
                    )}
                </div>
                {authCollapsed ? (
                  <ChevronRight className='h-4 w-4' />
                ) : (
                  <ChevronDown className='h-4 w-4' />
                )}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className='p-4 space-y-3 bg-muted/20'>
                <div className='space-y-2'>
                  <Label
                    htmlFor='authentication'
                    className='text-xs font-medium text-muted-foreground uppercase tracking-wider'>
                    Authentication Type
                  </Label>
                  <Select
                    value={(config.authentication as string) || "none"}
                    onValueChange={(value) =>
                      handleChange("authentication", value)
                    }>
                    <SelectTrigger className='h-8'>
                      <SelectValue placeholder='Select authentication' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='none'>None</SelectItem>
                      <SelectItem value='basic'>Basic Auth</SelectItem>
                      <SelectItem value='bearer'>Bearer Token</SelectItem>
                      <SelectItem value='apiKey'>API Key</SelectItem>
                      <SelectItem value='oauth2'>OAuth2 (Future)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {config.authentication === "basic" && (
                  <>
                    <div className='space-y-1'>
                      <Label htmlFor='username' className='text-xs'>
                        Username
                      </Label>
                      <Input
                        id='username'
                        placeholder='Enter username'
                        value={(config.username as string) || ""}
                        onChange={(e) =>
                          handleChange("username", e.target.value)
                        }
                        className='h-8 text-xs'
                      />
                    </div>
                    <div className='space-y-1'>
                      <Label htmlFor='password' className='text-xs'>
                        Password
                      </Label>
                      <div className='relative'>
                        <Input
                          id='password'
                          type={showPassword ? "text" : "password"}
                          placeholder='Enter password'
                          value={(config.password as string) || ""}
                          onChange={(e) =>
                            handleChange("password", e.target.value)
                          }
                          className='h-8 text-xs pr-8'
                        />
                        <Button
                          type='button'
                          variant='ghost'
                          size='sm'
                          className='absolute right-0 top-0 h-8 w-8 p-0'
                          onClick={() => setShowPassword(!showPassword)}>
                          {showPassword ? (
                            <EyeOff className='h-3 w-3' />
                          ) : (
                            <Eye className='h-3 w-3' />
                          )}
                        </Button>
                      </div>
                    </div>
                  </>
                )}

                {(config.authentication === "bearer" ||
                  config.authentication === "apiKey") && (
                  <div className='space-y-1'>
                    <Label htmlFor='token' className='text-xs'>
                      {config.authentication === "bearer"
                        ? "Bearer Token"
                        : "API Key"}
                    </Label>
                    <div className='relative'>
                      <Input
                        id='token'
                        type={showPassword ? "text" : "password"}
                        placeholder={`Enter ${config.authentication === "bearer" ? "bearer token" : "API key"}`}
                        value={(config.token as string) || ""}
                        onChange={(e) => handleChange("token", e.target.value)}
                        className='h-8 text-xs pr-8'
                      />
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        className='absolute right-0 top-0 h-8 w-8 p-0'
                        onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? (
                          <EyeOff className='h-3 w-3' />
                        ) : (
                          <Eye className='h-3 w-3' />
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Response Format */}
          <div className='p-4 space-y-3 border-b bg-background'>
            <Label
              htmlFor='responseFormat'
              className='text-xs font-medium text-muted-foreground uppercase tracking-wider'>
              Response Format
            </Label>
            <Select
              value={(config.responseFormat as string) || "json"}
              onValueChange={(value) => handleChange("responseFormat", value)}>
              <SelectTrigger className='h-9'>
                <SelectValue placeholder='Select response format' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='json'>JSON</SelectItem>
                <SelectItem value='text'>Text</SelectItem>
                <SelectItem value='xml'>XML</SelectItem>
                <SelectItem value='html'>HTML</SelectItem>
                <SelectItem value='binary'>Binary</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Advanced Settings */}
          <Collapsible
            open={!advancedCollapsed}
            onOpenChange={(open) => setAdvancedCollapsed(!open)}>
            <CollapsibleTrigger asChild>
              <div className='flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer border-b'>
                <div className='flex items-center gap-2'>
                  <span className='text-sm font-medium'>Advanced Settings</span>
                </div>
                {advancedCollapsed ? (
                  <ChevronRight className='h-4 w-4' />
                ) : (
                  <ChevronDown className='h-4 w-4' />
                )}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className='p-4 space-y-4 bg-muted/20'>
                <div className='space-y-2'>
                  <Label
                    htmlFor='timeout'
                    className='text-xs font-medium text-muted-foreground uppercase tracking-wider'>
                    Timeout (ms)
                  </Label>
                  <Input
                    id='timeout'
                    type='number'
                    min='1000'
                    max='300000'
                    value={(config.timeout as number) || 30000}
                    onChange={(e) =>
                      handleChange("timeout", parseInt(e.target.value) || 30000)
                    }
                    className='h-8 text-xs'
                  />
                </div>

                <div className='flex items-center justify-between p-3 bg-background rounded border'>
                  <div className='space-y-0.5'>
                    <Label className='text-xs font-medium'>
                      Follow Redirects
                    </Label>
                    <p className='text-xs text-muted-foreground'>
                      Automatically follow HTTP redirects
                    </p>
                  </div>
                  <Switch
                    checked={(config.followRedirects as boolean) ?? true}
                    onCheckedChange={(checked) =>
                      handleChange("followRedirects", checked)
                    }
                  />
                </div>

                <div className='flex items-center justify-between p-3 bg-background rounded border'>
                  <div className='space-y-0.5'>
                    <Label className='text-xs font-medium'>
                      Retry on Failure
                    </Label>
                    <p className='text-xs text-muted-foreground'>
                      Retry failed requests automatically
                    </p>
                  </div>
                  <Switch
                    checked={(config.retryOnFailure as boolean) ?? true}
                    onCheckedChange={(checked) =>
                      handleChange("retryOnFailure", checked)
                    }
                  />
                </div>

                {(config.retryOnFailure as boolean) && (
                  <div className='space-y-2'>
                    <Label
                      htmlFor='maxRetries'
                      className='text-xs font-medium text-muted-foreground uppercase tracking-wider'>
                      Max Retries
                    </Label>
                    <Input
                      id='maxRetries'
                      type='number'
                      min='1'
                      max='10'
                      value={(config.maxRetries as number) || 3}
                      onChange={(e) =>
                        handleChange(
                          "maxRetries",
                          parseInt(e.target.value) || 3
                        )
                      }
                      className='h-8 text-xs'
                    />
                  </div>
                )}

                <div className='flex items-center justify-between p-3 bg-background rounded border'>
                  <div className='space-y-0.5'>
                    <Label className='text-xs font-medium'>
                      Ignore SSL Issues
                    </Label>
                    <p className='text-xs text-muted-foreground'>
                      Ignore SSL certificate errors
                    </p>
                  </div>
                  <Switch
                    checked={(config.ignoreSSL as boolean) ?? false}
                    onCheckedChange={(checked) =>
                      handleChange("ignoreSSL", checked)
                    }
                  />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </TabsContent>

        <TabsContent
          value='inputs'
          className='flex-1 overflow-y-auto p-4 space-y-4 mt-2'>
          <div className='space-y-3'>
            <div className='flex items-center gap-2'>
              <Info className='h-4 w-4 text-blue-500' />
              <span className='text-sm font-medium'>Input Schema</span>
            </div>
            <p className='text-xs text-muted-foreground'>
              These fields can be provided by previous blocks in the workflow
            </p>

            {inputSchemaFields.map((field) => (
              <Card key={field.key}>
                <CardContent className='pt-4'>
                  <div className='flex items-start justify-between'>
                    <div className='space-y-1'>
                      <div className='flex items-center gap-2'>
                        <Badge
                          variant={field.required ? "default" : "secondary"}>
                          {field.key}
                        </Badge>
                        <Badge variant='outline'>{field.type}</Badge>
                        {field.required && (
                          <Badge variant='destructive' className='text-xs'>
                            Required
                          </Badge>
                        )}
                      </div>
                      <p className='text-xs text-muted-foreground'>
                        {field.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent
          value='outputs'
          className='flex-1 overflow-y-auto p-4 space-y-4 mt-2'>
          <div className='space-y-3'>
            <div className='flex items-center gap-2'>
              <Info className='h-4 w-4 text-green-500' />
              <span className='text-sm font-medium'>Output Schema</span>
            </div>
            <p className='text-xs text-muted-foreground'>
              These fields will be available to subsequent blocks
            </p>

            {outputSchemaFields.map((field) => (
              <Card key={field.key}>
                <CardContent className='pt-4'>
                  <div className='flex items-start justify-between'>
                    <div className='space-y-1'>
                      <div className='flex items-center gap-2'>
                        <Badge variant='default'>{field.key}</Badge>
                        <Badge variant='outline'>{field.type}</Badge>
                        {field.required && (
                          <Badge variant='secondary' className='text-xs'>
                            Always Present
                          </Badge>
                        )}
                      </div>
                      <p className='text-xs text-muted-foreground'>
                        {field.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent
          value='execution'
          className='flex-1 overflow-y-auto p-4 space-y-4 mt-2'>
          <div className='space-y-4'>
            <div className='flex items-center gap-2'>
              <Zap className='h-4 w-4 text-blue-500' />
              <span className='text-sm font-medium'>Execution Status</span>
            </div>

            {/* Current Status */}
            <Card>
              <CardContent className='pt-4'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    {getStatusIcon()}
                    <span className='text-sm font-medium capitalize'>
                      {executionStatus}
                    </span>
                  </div>
                  {executionData?.duration && (
                    <Badge variant='outline' className='text-xs'>
                      {executionData.duration}ms
                    </Badge>
                  )}
                </div>

                {executionData?.startTime && (
                  <div className='mt-2 text-xs text-muted-foreground'>
                    Started:{" "}
                    {new Date(executionData.startTime).toLocaleString()}
                  </div>
                )}

                {executionData?.endTime && (
                  <div className='text-xs text-muted-foreground'>
                    Finished: {new Date(executionData.endTime).toLocaleString()}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Error Details */}
            {executionStatus === "error" && executionData?.error && (
              <Card>
                <CardContent className='pt-4'>
                  <div className='flex items-center gap-2 mb-2'>
                    <AlertCircle className='h-4 w-4 text-red-500' />
                    <span className='text-sm font-medium'>Error Details</span>
                  </div>
                  <div className='bg-red-50 p-3 rounded border border-red-200'>
                    <code className='text-xs text-red-800'>
                      {executionData.error}
                    </code>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Last Response */}
            {executionData?.lastResponse && (
              <Card>
                <CardContent className='pt-4'>
                  <div className='flex items-center gap-2 mb-2'>
                    <Info className='h-4 w-4 text-green-500' />
                    <span className='text-sm font-medium'>Last Response</span>
                  </div>
                  <div className='bg-green-50 p-3 rounded border border-green-200'>
                    <pre className='text-xs font-mono text-green-800 overflow-x-auto'>
                      {JSON.stringify(executionData.lastResponse, null, 2)}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Test Button */}
            {onTest && (
              <div className='flex justify-center pt-4 border-t'>
                <Button
                  onClick={onTest}
                  disabled={executionStatus === "running" || !isValid}
                  className='w-full'>
                  {executionStatus === "running" ? (
                    <>
                      <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                      Testing...
                    </>
                  ) : (
                    <>
                      <Play className='h-4 w-4 mr-2' />
                      Test Request
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className='p-4 border-t'>
          <Alert>
            <AlertCircle className='h-4 w-4' />
            <AlertDescription>
              <div className='space-y-1'>
                <p className='font-medium'>Configuration Issues:</p>
                <ul className='text-xs space-y-1'>
                  {validationErrors.map((error, index) => (
                    <li key={index} className='text-red-600'>
                      {error.path.join(".")}: {error.message}
                    </li>
                  ))}
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
}
