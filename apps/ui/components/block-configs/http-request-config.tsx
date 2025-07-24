import React, { useEffect, useState, useCallback } from "react";
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
  Info,
  Loader2,
  Play,
  Plus,
  X,
  Globe,
  Shield,
  Settings,
  Activity,
} from "lucide-react";
import { enhancedHttpRequestSchema } from "@zyra/types";

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
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>(
    []
  );
  const [isValid, setIsValid] = useState(true);
  const [activeTab, setActiveTab] = useState("config");
  const [advancedCollapsed, setAdvancedCollapsed] = useState(true);

  // Use the enhanced schema from @zyra/types
  const schema = enhancedHttpRequestSchema;

  // Validation function
  const validateConfig = useCallback(
    (configData: Record<string, unknown>) => {
      if (!schema) {
        return { success: true, error: "" };
      }

      try {
        schema.configSchema.parse(configData);
        return { success: true, error: "" };
      } catch (error: unknown) {
        if (error && typeof error === "object" && "errors" in error) {
          const errors = (error as { errors: ValidationError[] }).errors.map((err: ValidationError) => ({
            path: err.path || [],
            message: err.message,
          }));
          return {
            success: false,
            error: errors.map((e: ValidationError) => e.message).join(", "),
            errors,
          };
        } else {
          return {
            success: false,
            error: error instanceof Error ? error.message : "Validation failed",
          };
        }
      }
    },
    [schema]
  );

  // Get field validation error using Zod schema
  const getFieldError = (fieldName: string): string | undefined => {
    const result = validateConfig(config);
    if (!result.success && result.errors) {
      const fieldError = result.errors.find((err: ValidationError) =>
        err.path.includes(fieldName)
      );
      if (fieldError) {
        // Convert Zod error messages to user-friendly ones
        const message = fieldError.message;
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



  const handleChange = (field: string, value: unknown) => {
    const newConfig = { ...config, [field]: value };
    onChange(newConfig);
  };

  const addHeader = () => {
    if (newHeaderKey.trim() && newHeaderValue.trim()) {
      const newHeaders = { ...headers, [newHeaderKey]: newHeaderValue };
      setHeaders(newHeaders);
      handleChange("headers", newHeaders);
      setNewHeaderKey("");
      setNewHeaderValue("");
    }
  };

  const removeHeader = (key: string) => {
    const newHeaders = { ...headers };
    delete newHeaders[key];
    setHeaders(newHeaders);
    handleChange("headers", newHeaders);
  };

  const addQueryParam = () => {
    if (newQueryKey.trim() && newQueryValue.trim()) {
      const newQueryParams = { ...queryParams, [newQueryKey]: newQueryValue };
      setQueryParams(newQueryParams);
      handleChange("queryParams", newQueryParams);
      setNewQueryKey("");
      setNewQueryValue("");
    }
  };

  const removeQueryParam = (key: string) => {
    const newQueryParams = { ...queryParams };
    delete newQueryParams[key];
    setQueryParams(newQueryParams);
    handleChange("queryParams", newQueryParams);
  };

  const handleBodyChange = (value: string) => {
    try {
      // Try to parse as JSON for better UX
      const parsed = JSON.parse(value);
      handleChange("body", parsed);
    } catch {
      // If not valid JSON, store as string
      handleChange("body", value);
    }
  };

  const getStatusIcon = () => {
    switch (executionStatus) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "warning":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case "running":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-400" />;
    }
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

  return (
    <div className="space-y-6">
      {/* Status Bar */}
      {executionStatus !== "idle" && (
        <Alert className="border-l-4 border-l-blue-500 bg-blue-50">
          <div className="flex items-center space-x-3">
            {getStatusIcon()}
            <AlertDescription className="font-medium">
              {executionStatus === "running" && "Making HTTP request..."}
              {executionStatus === "success" && "Request completed successfully"}
              {executionStatus === "error" &&
                `Request failed: ${executionData?.error || "Unknown error"}`}
              {executionStatus === "warning" && "Request completed with warnings"}
            </AlertDescription>
            {executionData?.duration && (
              <Badge variant="outline" className="ml-auto">
                <Clock className="h-3 w-3 mr-1" />
                {executionData.duration}ms
              </Badge>
            )}
          </div>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-12 bg-muted/50 rounded-lg p-1">
          <TabsTrigger
            value="config"
            className="flex items-center space-x-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md">
            <Settings className="h-4 w-4" />
            <span>Request</span>
          </TabsTrigger>
          <TabsTrigger
            value="headers"
            className="flex items-center space-x-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md">
            <Shield className="h-4 w-4" />
            <span>Headers</span>
          </TabsTrigger>
          <TabsTrigger
            value="params"
            className="flex items-center space-x-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md">
            <Globe className="h-4 w-4" />
            <span>Params</span>
          </TabsTrigger>
          <TabsTrigger
            value="test"
            className="flex items-center space-x-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md">
            <Play className="h-4 w-4" />
            <span>Test</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="mt-6 space-y-6">
          <Card className="border-0 shadow-sm bg-card/50">
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-600/20 flex items-center justify-center">
                  <Globe className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">HTTP Request</h3>
                  <p className="text-sm text-muted-foreground">
                    Configure your HTTP request settings
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {/* URL */}
                <div className="space-y-3">
                  <Label htmlFor="url" className="text-sm font-medium">
                    URL <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="url"
                    placeholder="https://api.example.com/endpoint"
                    value={(config.url as string) || ""}
                    onChange={(e) => handleChange("url", e.target.value)}
                    className="h-11 font-mono text-sm"
                  />
                  {getFieldError("url") && (
                    <div className="flex items-center space-x-2 text-sm text-red-500">
                      <AlertCircle className="h-4 w-4" />
                      <span>{getFieldError("url")}</span>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Use {"{variable}"} for template variables
                  </p>
                </div>

                {/* Method */}
                <div className="space-y-3">
                  <Label htmlFor="method" className="text-sm font-medium">
                    Method
                  </Label>
                  <Select
                    value={(config.method as string) || "GET"}
                    onValueChange={(value) => handleChange("method", value)}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GET">
                        <Badge variant="secondary">GET</Badge>
                      </SelectItem>
                      <SelectItem value="POST">
                        <Badge variant="secondary">POST</Badge>
                      </SelectItem>
                      <SelectItem value="PUT">
                        <Badge variant="secondary">PUT</Badge>
                      </SelectItem>
                      <SelectItem value="PATCH">
                        <Badge variant="secondary">PATCH</Badge>
                      </SelectItem>
                      <SelectItem value="DELETE">
                        <Badge variant="secondary">DELETE</Badge>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Body for POST/PUT/PATCH */}
                {["POST", "PUT", "PATCH"].includes((config.method as string) || "GET") && (
                  <div className="space-y-3">
                    <Label htmlFor="body" className="text-sm font-medium">
                      Request Body
                    </Label>
                    <Textarea
                      id="body"
                      placeholder='{"key": "value"}'
                      value={
                        typeof config.body === "string"
                          ? config.body
                          : JSON.stringify(config.body, null, 2)
                      }
                      onChange={(e) => handleBodyChange(e.target.value)}
                      rows={6}
                      className="resize-none font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter JSON or plain text for the request body
                    </p>
                  </div>
                )}

                {/* Advanced Options */}
                <Collapsible
                  open={advancedCollapsed}
                  onOpenChange={setAdvancedCollapsed}>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" className="w-full justify-between h-11">
                      <span>Advanced Options</span>
                      {advancedCollapsed ? (
                        <ChevronRight className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <Label htmlFor="timeout" className="text-sm font-medium">
                          Timeout (ms)
                        </Label>
                        <Input
                          id="timeout"
                          type="number"
                          placeholder="30000"
                          value={(config.timeout as number) || ""}
                          onChange={(e) => handleChange("timeout", parseInt(e.target.value) || 30000)}
                          className="h-11"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="followRedirects" className="text-sm font-medium">
                          Follow Redirects
                        </Label>
                        <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
                          <Switch
                            id="followRedirects"
                            checked={(config.followRedirects as boolean) !== false}
                            onCheckedChange={(checked) =>
                              handleChange("followRedirects", checked)
                            }
                          />
                          <Label htmlFor="followRedirects" className="text-sm">
                            Enable
                          </Label>
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="headers" className="mt-6 space-y-6">
          <Card className="border-0 shadow-sm bg-card/50">
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/10 to-purple-600/20 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">HTTP Headers</h3>
                  <p className="text-sm text-muted-foreground">
                    Configure request headers
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Add new header */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Header Name</Label>
                    <Input
                      placeholder="Content-Type"
                      value={newHeaderKey}
                      onChange={(e) => setNewHeaderKey(e.target.value)}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Header Value</Label>
                    <Input
                      placeholder="application/json"
                      value={newHeaderValue}
                      onChange={(e) => setNewHeaderValue(e.target.value)}
                      className="h-10"
                    />
                  </div>
                </div>
                <Button
                  onClick={addHeader}
                  disabled={!newHeaderKey.trim() || !newHeaderValue.trim()}
                  className="w-full h-10">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Header
                </Button>

                {/* Existing headers */}
                {Object.keys(headers).length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Current Headers</Label>
                    <div className="space-y-2">
                      {Object.entries(headers).map(([key, value]) => (
                        <div
                          key={key}
                          className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{key}</p>
                            <p className="text-xs text-muted-foreground">{value}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeHeader(key)}
                            className="h-8 w-8 p-0">
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="params" className="mt-6 space-y-6">
          <Card className="border-0 shadow-sm bg-card/50">
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500/10 to-green-600/20 flex items-center justify-center">
                  <Globe className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Query Parameters</h3>
                  <p className="text-sm text-muted-foreground">
                    Configure URL query parameters
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Add new parameter */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Parameter Name</Label>
                    <Input
                      placeholder="api_key"
                      value={newQueryKey}
                      onChange={(e) => setNewQueryKey(e.target.value)}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Parameter Value</Label>
                    <Input
                      placeholder="your_api_key"
                      value={newQueryValue}
                      onChange={(e) => setNewQueryValue(e.target.value)}
                      className="h-10"
                    />
                  </div>
                </div>
                <Button
                  onClick={addQueryParam}
                  disabled={!newQueryKey.trim() || !newQueryValue.trim()}
                  className="w-full h-10">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Parameter
                </Button>

                {/* Existing parameters */}
                {Object.keys(queryParams).length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Current Parameters</Label>
                    <div className="space-y-2">
                      {Object.entries(queryParams).map(([key, value]) => (
                        <div
                          key={key}
                          className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{key}</p>
                            <p className="text-xs text-muted-foreground">{value}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeQueryParam(key)}
                            className="h-8 w-8 p-0">
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test" className="mt-6 space-y-6">
          <Card className="border-0 shadow-sm bg-card/50">
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500/10 to-orange-600/20 flex items-center justify-center">
                  <Play className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Test Request</h3>
                  <p className="text-sm text-muted-foreground">
                    Test your HTTP request configuration
                  </p>
                </div>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Test your HTTP request configuration to ensure it works correctly.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div>
                    <h4 className="font-medium">Configuration Status</h4>
                    <p className="text-sm text-muted-foreground">
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
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Please fix the configuration issues before testing:
                      <ul className="mt-2 list-disc list-inside space-y-1">
                        {validationErrors.map((error, index) => (
                          <li key={index} className="text-sm">
                            {error.message}
                          </li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  onClick={onTest}
                  disabled={!isValid || executionStatus === "running"}
                  className="w-full h-11 bg-primary hover:bg-primary/90">
                  {executionStatus === "running" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Test Request
                    </>
                  )}
                </Button>

                {executionData && (
                  <div className="space-y-3">
                    <h4 className="font-medium">Last Test Result</h4>
                    <div className="p-4 bg-muted/30 rounded-lg space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <span className="font-medium">{executionStatus}</span>
                      </div>
                      {executionData.duration && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Duration:</span>
                          <span className="font-medium">{executionData.duration}ms</span>
                        </div>
                      )}
                      {executionData.error && (
                        <div className="text-red-600 text-sm">
                          <span className="font-medium">Error:</span> {executionData.error}
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
