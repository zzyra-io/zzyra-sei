"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Globe,
  Settings,
  Play,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Eye,
  EyeOff,
  RefreshCw,
  Download,
  Upload,
  Code,
  Lock,
  Key,
  Clock,
  Zap,
  Shield,
  Activity,
  FileText,
  Plus,
  Trash2,
  Copy,
  ExternalLink,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ApiEndpoint {
  id: string;
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  description?: string;
  headers: Record<string, string>;
  queryParams: Record<string, string>;
  body?: string;
  bodyType: 'json' | 'form' | 'raw' | 'none';
  authentication: {
    type: 'none' | 'bearer' | 'basic' | 'api-key' | 'oauth2';
    token?: string;
    username?: string;
    password?: string;
    apiKey?: string;
    keyLocation: 'header' | 'query';
    keyName?: string;
  };
  timeout: number;
  retryCount: number;
  rateLimiting: {
    enabled: boolean;
    requestsPerMinute: number;
    burstLimit: number;
  };
  responseSchema?: any;
  requestSchema?: any;
  lastResponse?: {
    status: number;
    statusText: string;
    data: any;
    duration: number;
    timestamp: string;
    headers: Record<string, string>;
  };
  status: 'idle' | 'loading' | 'success' | 'error';
}

interface ApiConnectorProps {
  nodeId?: string;
  onEndpointTest?: (endpoint: ApiEndpoint, result: any) => void;
  onSchemaValidation?: (valid: boolean, errors: string[]) => void;
  initialEndpoints?: ApiEndpoint[];
}

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as const;

const AUTH_TYPES = [
  { value: 'none', label: 'None' },
  { value: 'bearer', label: 'Bearer Token' },
  { value: 'basic', label: 'Basic Auth' },
  { value: 'api-key', label: 'API Key' },
  { value: 'oauth2', label: 'OAuth 2.0' },
] as const;

const BODY_TYPES = [
  { value: 'none', label: 'None' },
  { value: 'json', label: 'JSON' },
  { value: 'form', label: 'Form Data' },
  { value: 'raw', label: 'Raw' },
] as const;

const COMMON_HEADERS = [
  'Content-Type',
  'Authorization',
  'User-Agent',
  'Accept',
  'Cache-Control',
  'X-API-Key',
  'X-Requested-With',
];

export function EnhancedApiConnector({
  nodeId,
  onEndpointTest,
  onSchemaValidation,
  initialEndpoints = [],
}: ApiConnectorProps) {
  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>(
    initialEndpoints.length > 0 ? initialEndpoints : [{
      id: 'endpoint-1',
      name: 'API Endpoint',
      method: 'GET',
      url: '',
      headers: { 'Content-Type': 'application/json' },
      queryParams: {},
      bodyType: 'none',
      authentication: {
        type: 'none',
        keyLocation: 'header',
      },
      timeout: 30000,
      retryCount: 3,
      rateLimiting: {
        enabled: false,
        requestsPerMinute: 60,
        burstLimit: 10,
      },
      status: 'idle',
    }]
  );

  const [selectedEndpointId, setSelectedEndpointId] = useState(endpoints[0]?.id);
  const [activeTab, setActiveTab] = useState('config');
  const [showAuthDetails, setShowAuthDetails] = useState(false);
  const [schemaValidationResults, setSchemaValidationResults] = useState<{
    request?: { valid: boolean; errors: string[] };
    response?: { valid: boolean; errors: string[] };
  }>({});

  const selectedEndpoint = endpoints.find(e => e.id === selectedEndpointId) || endpoints[0];

  const addEndpoint = () => {
    const newEndpoint: ApiEndpoint = {
      id: `endpoint-${Date.now()}`,
      name: `Endpoint ${endpoints.length + 1}`,
      method: 'GET',
      url: '',
      headers: { 'Content-Type': 'application/json' },
      queryParams: {},
      bodyType: 'none',
      authentication: {
        type: 'none',
        keyLocation: 'header',
      },
      timeout: 30000,
      retryCount: 3,
      rateLimiting: {
        enabled: false,
        requestsPerMinute: 60,
        burstLimit: 10,
      },
      status: 'idle',
    };
    setEndpoints(prev => [...prev, newEndpoint]);
    setSelectedEndpointId(newEndpoint.id);
  };

  const updateEndpoint = (id: string, updates: Partial<ApiEndpoint>) => {
    setEndpoints(prev => prev.map(endpoint => 
      endpoint.id === id ? { ...endpoint, ...updates } : endpoint
    ));
  };

  const removeEndpoint = (id: string) => {
    if (endpoints.length === 1) return; // Keep at least one endpoint
    setEndpoints(prev => prev.filter(e => e.id !== id));
    if (selectedEndpointId === id) {
      setSelectedEndpointId(endpoints.find(e => e.id !== id)?.id || '');
    }
  };

  const duplicateEndpoint = (id: string) => {
    const endpoint = endpoints.find(e => e.id === id);
    if (!endpoint) return;

    const newEndpoint = {
      ...endpoint,
      id: `endpoint-${Date.now()}`,
      name: `${endpoint.name} (Copy)`,
      lastResponse: undefined,
      status: 'idle' as const,
    };
    setEndpoints(prev => [...prev, newEndpoint]);
  };

  const addHeader = (endpointId: string) => {
    const endpoint = endpoints.find(e => e.id === endpointId);
    if (!endpoint) return;

    const newHeaderKey = `Header-${Object.keys(endpoint.headers).length + 1}`;
    updateEndpoint(endpointId, {
      headers: { ...endpoint.headers, [newHeaderKey]: '' }
    });
  };

  const updateHeader = (endpointId: string, oldKey: string, newKey: string, value: string) => {
    const endpoint = endpoints.find(e => e.id === endpointId);
    if (!endpoint) return;

    const newHeaders = { ...endpoint.headers };
    if (oldKey !== newKey) {
      delete newHeaders[oldKey];
    }
    newHeaders[newKey] = value;

    updateEndpoint(endpointId, { headers: newHeaders });
  };

  const removeHeader = (endpointId: string, key: string) => {
    const endpoint = endpoints.find(e => e.id === endpointId);
    if (!endpoint) return;

    const newHeaders = { ...endpoint.headers };
    delete newHeaders[key];
    updateEndpoint(endpointId, { headers: newHeaders });
  };

  const addQueryParam = (endpointId: string) => {
    const endpoint = endpoints.find(e => e.id === endpointId);
    if (!endpoint) return;

    const newParamKey = `param${Object.keys(endpoint.queryParams).length + 1}`;
    updateEndpoint(endpointId, {
      queryParams: { ...endpoint.queryParams, [newParamKey]: '' }
    });
  };

  const updateQueryParam = (endpointId: string, oldKey: string, newKey: string, value: string) => {
    const endpoint = endpoints.find(e => e.id === endpointId);
    if (!endpoint) return;

    const newParams = { ...endpoint.queryParams };
    if (oldKey !== newKey) {
      delete newParams[oldKey];
    }
    newParams[newKey] = value;

    updateEndpoint(endpointId, { queryParams: newParams });
  };

  const removeQueryParam = (endpointId: string, key: string) => {
    const endpoint = endpoints.find(e => e.id === endpointId);
    if (!endpoint) return;

    const newParams = { ...endpoint.queryParams };
    delete newParams[key];
    updateEndpoint(endpointId, { queryParams: newParams });
  };

  const testEndpoint = async (endpoint: ApiEndpoint) => {
    updateEndpoint(endpoint.id, { status: 'loading' });

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 500));

      const success = Math.random() > 0.2; // 80% success rate for demo
      
      if (success) {
        const mockResponse = {
          status: 200,
          statusText: 'OK',
          data: generateMockData(endpoint),
          duration: Math.floor(Math.random() * 1000) + 100,
          timestamp: new Date().toISOString(),
          headers: {
            'content-type': 'application/json',
            'x-ratelimit-remaining': '59',
            'x-response-time': `${Math.floor(Math.random() * 100)}ms`,
          },
        };

        updateEndpoint(endpoint.id, {
          status: 'success',
          lastResponse: mockResponse,
        });

        onEndpointTest?.(endpoint, mockResponse);

        // Validate response schema if available
        if (endpoint.responseSchema) {
          validateSchema(mockResponse.data, endpoint.responseSchema, 'response');
        }
      } else {
        const mockError = {
          status: Math.random() > 0.5 ? 404 : 500,
          statusText: Math.random() > 0.5 ? 'Not Found' : 'Internal Server Error',
          data: { error: 'Request failed', message: 'Simulated error for demo' },
          duration: Math.floor(Math.random() * 500) + 50,
          timestamp: new Date().toISOString(),
          headers: {},
        };

        updateEndpoint(endpoint.id, {
          status: 'error',
          lastResponse: mockError,
        });
      }
    } catch (error) {
      updateEndpoint(endpoint.id, {
        status: 'error',
        lastResponse: {
          status: 0,
          statusText: 'Network Error',
          data: { error: 'Network error' },
          duration: 0,
          timestamp: new Date().toISOString(),
          headers: {},
        },
      });
    }
  };

  const generateMockData = (endpoint: ApiEndpoint) => {
    const baseData = {
      id: Math.floor(Math.random() * 10000),
      timestamp: new Date().toISOString(),
      success: true,
    };

    switch (endpoint.method) {
      case 'GET':
        return {
          ...baseData,
          data: Array.from({ length: Math.floor(Math.random() * 10) + 1 }, (_, i) => ({
            id: i + 1,
            name: `Item ${i + 1}`,
            value: Math.random() * 100,
            active: Math.random() > 0.5,
          })),
          total: Math.floor(Math.random() * 100) + 1,
          page: 1,
        };
      case 'POST':
        return {
          ...baseData,
          message: 'Resource created successfully',
          created_id: Math.floor(Math.random() * 10000),
        };
      case 'PUT':
        return {
          ...baseData,
          message: 'Resource updated successfully',
          updated_fields: ['name', 'value'],
        };
      case 'DELETE':
        return {
          ...baseData,
          message: 'Resource deleted successfully',
          deleted_count: 1,
        };
      default:
        return baseData;
    }
  };

  const validateSchema = async (data: any, schema: any, type: 'request' | 'response') => {
    // Mock schema validation
    const validationResults = {
      valid: Math.random() > 0.3, // 70% valid for demo
      errors: [] as string[],
    };

    if (!validationResults.valid) {
      validationResults.errors = [
        'Field "required_field" is missing',
        'Field "number_field" must be a number',
        'Field "email" must be a valid email address',
      ].slice(0, Math.floor(Math.random() * 3) + 1);
    }

    setSchemaValidationResults(prev => ({
      ...prev,
      [type]: validationResults,
    }));

    onSchemaValidation?.(validationResults.valid, validationResults.errors);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'loading':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-600" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Globe className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'loading': return 'border-blue-500 bg-blue-50';
      case 'success': return 'border-green-500 bg-green-50';
      case 'error': return 'border-red-500 bg-red-50';
      default: return 'border-gray-300 bg-white';
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const buildFullUrl = (endpoint: ApiEndpoint) => {
    let url = endpoint.url;
    const params = new URLSearchParams();
    
    Object.entries(endpoint.queryParams).forEach(([key, value]) => {
      if (key && value) {
        params.append(key, value);
      }
    });

    const queryString = params.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }

    return url;
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Globe className="w-5 h-5" />
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <span>Enhanced API Connector</span>
                  <Badge variant="outline">
                    {endpoints.length} endpoint{endpoints.length !== 1 ? 's' : ''}
                  </Badge>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Connect to REST APIs with schema validation and advanced features
                </p>
              </div>
            </div>
            <Button onClick={addEndpoint}>
              <Plus className="w-4 h-4 mr-2" />
              Add Endpoint
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Endpoint List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Endpoints</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-2">
                {endpoints.map((endpoint) => (
                  <motion.div
                    key={endpoint.id}
                    whileHover={{ scale: 1.02 }}
                    className={`p-3 border rounded-lg cursor-pointer transition-all ${
                      selectedEndpointId === endpoint.id ? 'ring-2 ring-blue-500' : ''
                    } ${getStatusColor(endpoint.status)}`}
                    onClick={() => setSelectedEndpointId(endpoint.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(endpoint.status)}
                        <Badge variant="outline" className="text-xs">
                          {endpoint.method}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            duplicateEndpoint(endpoint.id);
                          }}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                        {endpoints.length > 1 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeEndpoint(endpoint.id);
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <h3 className="font-medium text-sm truncate">{endpoint.name}</h3>
                    <p className="text-xs text-muted-foreground truncate">{endpoint.url || 'No URL'}</p>
                    {endpoint.lastResponse && (
                      <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                        <span>Status: {endpoint.lastResponse.status}</span>
                        <span>{formatDuration(endpoint.lastResponse.duration)}</span>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Main Configuration */}
        <div className="lg:col-span-3">
          {selectedEndpoint && (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="config" className="flex items-center space-x-2">
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">Config</span>
                </TabsTrigger>
                <TabsTrigger value="auth" className="flex items-center space-x-2">
                  <Shield className="w-4 h-4" />
                  <span className="hidden sm:inline">Auth</span>
                </TabsTrigger>
                <TabsTrigger value="body" className="flex items-center space-x-2">
                  <Code className="w-4 h-4" />
                  <span className="hidden sm:inline">Body</span>
                </TabsTrigger>
                <TabsTrigger value="schema" className="flex items-center space-x-2">
                  <FileText className="w-4 h-4" />
                  <span className="hidden sm:inline">Schema</span>
                </TabsTrigger>
                <TabsTrigger value="test" className="flex items-center space-x-2">
                  <Play className="w-4 h-4" />
                  <span className="hidden sm:inline">Test</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="config" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Basic Configuration</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="endpoint-name">Name</Label>
                      <Input
                        id="endpoint-name"
                        value={selectedEndpoint.name}
                        onChange={(e) => updateEndpoint(selectedEndpoint.id, { name: e.target.value })}
                        placeholder="Endpoint name"
                      />
                    </div>

                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Input
                        id="description"
                        value={selectedEndpoint.description || ''}
                        onChange={(e) => updateEndpoint(selectedEndpoint.id, { description: e.target.value })}
                        placeholder="Optional description"
                      />
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      <div className="col-span-1">
                        <Label htmlFor="method">Method</Label>
                        <Select
                          value={selectedEndpoint.method}
                          onValueChange={(method: any) => updateEndpoint(selectedEndpoint.id, { method })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {HTTP_METHODS.map((method) => (
                              <SelectItem key={method} value={method}>
                                <Badge variant="outline" className="text-xs">
                                  {method}
                                </Badge>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-3">
                        <Label htmlFor="url">URL</Label>
                        <Input
                          id="url"
                          value={selectedEndpoint.url}
                          onChange={(e) => updateEndpoint(selectedEndpoint.id, { url: e.target.value })}
                          placeholder="https://api.example.com/endpoint"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="timeout">Timeout (ms)</Label>
                        <Input
                          id="timeout"
                          type="number"
                          value={selectedEndpoint.timeout}
                          onChange={(e) => updateEndpoint(selectedEndpoint.id, { timeout: parseInt(e.target.value) || 30000 })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="retry-count">Retry Count</Label>
                        <Input
                          id="retry-count"
                          type="number"
                          value={selectedEndpoint.retryCount}
                          onChange={(e) => updateEndpoint(selectedEndpoint.id, { retryCount: parseInt(e.target.value) || 0 })}
                          min="0"
                          max="10"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Headers</CardTitle>
                      <Button size="sm" variant="outline" onClick={() => addHeader(selectedEndpoint.id)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Header
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(selectedEndpoint.headers).map(([key, value]) => (
                        <div key={key} className="flex items-center space-x-2">
                          <Input
                            value={key}
                            onChange={(e) => updateHeader(selectedEndpoint.id, key, e.target.value, value)}
                            placeholder="Header name"
                            className="flex-1"
                          />
                          <Input
                            value={value}
                            onChange={(e) => updateHeader(selectedEndpoint.id, key, key, e.target.value)}
                            placeholder="Header value"
                            className="flex-1"
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeHeader(selectedEndpoint.id, key)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      {Object.keys(selectedEndpoint.headers).length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No headers configured
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Query Parameters</CardTitle>
                      <Button size="sm" variant="outline" onClick={() => addQueryParam(selectedEndpoint.id)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Parameter
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(selectedEndpoint.queryParams).map(([key, value]) => (
                        <div key={key} className="flex items-center space-x-2">
                          <Input
                            value={key}
                            onChange={(e) => updateQueryParam(selectedEndpoint.id, key, e.target.value, value)}
                            placeholder="Parameter name"
                            className="flex-1"
                          />
                          <Input
                            value={value}
                            onChange={(e) => updateQueryParam(selectedEndpoint.id, key, key, e.target.value)}
                            placeholder="Parameter value"
                            className="flex-1"
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeQueryParam(selectedEndpoint.id, key)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      {Object.keys(selectedEndpoint.queryParams).length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No query parameters configured
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="auth" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Authentication</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="auth-type">Authentication Type</Label>
                      <Select
                        value={selectedEndpoint.authentication.type}
                        onValueChange={(type: any) => updateEndpoint(selectedEndpoint.id, {
                          authentication: { ...selectedEndpoint.authentication, type }
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {AUTH_TYPES.map((auth) => (
                            <SelectItem key={auth.value} value={auth.value}>
                              {auth.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedEndpoint.authentication.type === 'bearer' && (
                      <div>
                        <Label htmlFor="bearer-token">Bearer Token</Label>
                        <div className="relative">
                          <Input
                            id="bearer-token"
                            type={showAuthDetails ? 'text' : 'password'}
                            value={selectedEndpoint.authentication.token || ''}
                            onChange={(e) => updateEndpoint(selectedEndpoint.id, {
                              authentication: { ...selectedEndpoint.authentication, token: e.target.value }
                            })}
                            placeholder="Enter bearer token"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-2 top-1/2 -translate-y-1/2"
                            onClick={() => setShowAuthDetails(!showAuthDetails)}
                          >
                            {showAuthDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                    )}

                    {selectedEndpoint.authentication.type === 'basic' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="basic-username">Username</Label>
                          <Input
                            id="basic-username"
                            value={selectedEndpoint.authentication.username || ''}
                            onChange={(e) => updateEndpoint(selectedEndpoint.id, {
                              authentication: { ...selectedEndpoint.authentication, username: e.target.value }
                            })}
                            placeholder="Username"
                          />
                        </div>
                        <div>
                          <Label htmlFor="basic-password">Password</Label>
                          <div className="relative">
                            <Input
                              id="basic-password"
                              type={showAuthDetails ? 'text' : 'password'}
                              value={selectedEndpoint.authentication.password || ''}
                              onChange={(e) => updateEndpoint(selectedEndpoint.id, {
                                authentication: { ...selectedEndpoint.authentication, password: e.target.value }
                              })}
                              placeholder="Password"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-2 top-1/2 -translate-y-1/2"
                              onClick={() => setShowAuthDetails(!showAuthDetails)}
                            >
                              {showAuthDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedEndpoint.authentication.type === 'api-key' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="api-key-location">Key Location</Label>
                            <Select
                              value={selectedEndpoint.authentication.keyLocation}
                              onValueChange={(keyLocation: 'header' | 'query') => updateEndpoint(selectedEndpoint.id, {
                                authentication: { ...selectedEndpoint.authentication, keyLocation }
                              })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="header">Header</SelectItem>
                                <SelectItem value="query">Query Parameter</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="api-key-name">Key Name</Label>
                            <Input
                              id="api-key-name"
                              value={selectedEndpoint.authentication.keyName || ''}
                              onChange={(e) => updateEndpoint(selectedEndpoint.id, {
                                authentication: { ...selectedEndpoint.authentication, keyName: e.target.value }
                              })}
                              placeholder={selectedEndpoint.authentication.keyLocation === 'header' ? 'X-API-Key' : 'api_key'}
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="api-key">API Key</Label>
                          <div className="relative">
                            <Input
                              id="api-key"
                              type={showAuthDetails ? 'text' : 'password'}
                              value={selectedEndpoint.authentication.apiKey || ''}
                              onChange={(e) => updateEndpoint(selectedEndpoint.id, {
                                authentication: { ...selectedEndpoint.authentication, apiKey: e.target.value }
                              })}
                              placeholder="Enter API key"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-2 top-1/2 -translate-y-1/2"
                              onClick={() => setShowAuthDetails(!showAuthDetails)}
                            >
                              {showAuthDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedEndpoint.authentication.type !== 'none' && (
                      <Alert>
                        <Shield className="h-4 w-4" />
                        <AlertDescription>
                          Authentication credentials are encrypted and stored securely. They will be included in all requests to this endpoint.
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Rate Limiting</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="rate-limiting"
                        checked={selectedEndpoint.rateLimiting.enabled}
                        onCheckedChange={(enabled) => updateEndpoint(selectedEndpoint.id, {
                          rateLimiting: { ...selectedEndpoint.rateLimiting, enabled }
                        })}
                      />
                      <Label htmlFor="rate-limiting">Enable Rate Limiting</Label>
                    </div>

                    {selectedEndpoint.rateLimiting.enabled && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="requests-per-minute">Requests per Minute</Label>
                          <Input
                            id="requests-per-minute"
                            type="number"
                            value={selectedEndpoint.rateLimiting.requestsPerMinute}
                            onChange={(e) => updateEndpoint(selectedEndpoint.id, {
                              rateLimiting: {
                                ...selectedEndpoint.rateLimiting,
                                requestsPerMinute: parseInt(e.target.value) || 60
                              }
                            })}
                            min="1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="burst-limit">Burst Limit</Label>
                          <Input
                            id="burst-limit"
                            type="number"
                            value={selectedEndpoint.rateLimiting.burstLimit}
                            onChange={(e) => updateEndpoint(selectedEndpoint.id, {
                              rateLimiting: {
                                ...selectedEndpoint.rateLimiting,
                                burstLimit: parseInt(e.target.value) || 10
                              }
                            })}
                            min="1"
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="body" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Request Body</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="body-type">Body Type</Label>
                      <Select
                        value={selectedEndpoint.bodyType}
                        onValueChange={(bodyType: any) => updateEndpoint(selectedEndpoint.id, { bodyType })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {BODY_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedEndpoint.bodyType !== 'none' && (
                      <div>
                        <Label htmlFor="request-body">Request Body</Label>
                        <Textarea
                          id="request-body"
                          value={selectedEndpoint.body || ''}
                          onChange={(e) => updateEndpoint(selectedEndpoint.id, { body: e.target.value })}
                          placeholder={
                            selectedEndpoint.bodyType === 'json' 
                              ? '{\n  "key": "value",\n  "number": 123\n}'
                              : selectedEndpoint.bodyType === 'form'
                              ? 'key1=value1&key2=value2'
                              : 'Raw request body content'
                          }
                          className="font-mono text-sm min-h-32"
                        />
                      </div>
                    )}

                    {selectedEndpoint.bodyType === 'json' && selectedEndpoint.body && (
                      <Alert>
                        <Code className="h-4 w-4" />
                        <AlertDescription>
                          JSON body will be automatically validated before sending the request.
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="schema" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Request Schema</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        value={selectedEndpoint.requestSchema ? JSON.stringify(selectedEndpoint.requestSchema, null, 2) : ''}
                        onChange={(e) => {
                          try {
                            const schema = e.target.value ? JSON.parse(e.target.value) : null;
                            updateEndpoint(selectedEndpoint.id, { requestSchema: schema });
                          } catch (error) {
                            // Invalid JSON, keep the text but don't update schema
                          }
                        }}
                        placeholder={`{
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "required": true
    },
    "age": {
      "type": "number"
    }
  }
}`}
                        className="font-mono text-sm min-h-48"
                      />
                      
                      {schemaValidationResults.request && (
                        <div className="mt-4">
                          <Alert variant={schemaValidationResults.request.valid ? 'default' : 'destructive'}>
                            {schemaValidationResults.request.valid ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <XCircle className="h-4 w-4" />
                            )}
                            <AlertDescription>
                              {schemaValidationResults.request.valid ? (
                                'Request schema is valid'
                              ) : (
                                <div>
                                  <p className="font-medium mb-2">Schema validation errors:</p>
                                  <ul className="list-disc list-inside text-sm">
                                    {schemaValidationResults.request.errors.map((error, i) => (
                                      <li key={i}>{error}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </AlertDescription>
                          </Alert>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Response Schema</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        value={selectedEndpoint.responseSchema ? JSON.stringify(selectedEndpoint.responseSchema, null, 2) : ''}
                        onChange={(e) => {
                          try {
                            const schema = e.target.value ? JSON.parse(e.target.value) : null;
                            updateEndpoint(selectedEndpoint.id, { responseSchema: schema });
                          } catch (error) {
                            // Invalid JSON, keep the text but don't update schema
                          }
                        }}
                        placeholder={`{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean"
    },
    "data": {
      "type": "array",
      "items": {
        "type": "object"
      }
    }
  }
}`}
                        className="font-mono text-sm min-h-48"
                      />
                      
                      {schemaValidationResults.response && (
                        <div className="mt-4">
                          <Alert variant={schemaValidationResults.response.valid ? 'default' : 'destructive'}>
                            {schemaValidationResults.response.valid ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <XCircle className="h-4 w-4" />
                            )}
                            <AlertDescription>
                              {schemaValidationResults.response.valid ? (
                                'Response schema validation passed'
                              ) : (
                                <div>
                                  <p className="font-medium mb-2">Response validation errors:</p>
                                  <ul className="list-disc list-inside text-sm">
                                    {schemaValidationResults.response.errors.map((error, i) => (
                                      <li key={i}>{error}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </AlertDescription>
                          </Alert>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="test" className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Test Request</CardTitle>
                      <div className="flex items-center space-x-2">
                        <Badge variant={
                          selectedEndpoint.status === 'success' ? 'default' :
                          selectedEndpoint.status === 'error' ? 'destructive' :
                          selectedEndpoint.status === 'loading' ? 'secondary' : 'outline'
                        }>
                          {selectedEndpoint.status}
                        </Badge>
                        <Button
                          onClick={() => testEndpoint(selectedEndpoint)}
                          disabled={selectedEndpoint.status === 'loading' || !selectedEndpoint.url}
                        >
                          {selectedEndpoint.status === 'loading' ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Play className="w-4 h-4 mr-2" />
                          )}
                          Test Request
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Label>Request URL</Label>
                        <div className="p-3 bg-muted rounded-md font-mono text-sm break-all">
                          <span className="font-bold text-blue-600">{selectedEndpoint.method}</span>{' '}
                          {buildFullUrl(selectedEndpoint) || 'No URL configured'}
                        </div>
                      </div>

                      {Object.keys(selectedEndpoint.headers).length > 0 && (
                        <div>
                          <Label>Headers</Label>
                          <div className="p-3 bg-muted rounded-md">
                            {Object.entries(selectedEndpoint.headers).map(([key, value]) => (
                              <div key={key} className="font-mono text-sm">
                                <span className="font-bold">{key}:</span> {value}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedEndpoint.body && selectedEndpoint.bodyType !== 'none' && (
                        <div>
                          <Label>Request Body</Label>
                          <div className="p-3 bg-muted rounded-md font-mono text-sm whitespace-pre-wrap">
                            {selectedEndpoint.body}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {selectedEndpoint.lastResponse && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center space-x-2">
                        <span>Response</span>
                        <Badge variant={
                          selectedEndpoint.lastResponse.status >= 200 && selectedEndpoint.lastResponse.status < 300
                            ? 'default'
                            : 'destructive'
                        }>
                          {selectedEndpoint.lastResponse.status} {selectedEndpoint.lastResponse.statusText}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {formatDuration(selectedEndpoint.lastResponse.duration)}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {Object.keys(selectedEndpoint.lastResponse.headers).length > 0 && (
                          <div>
                            <Label>Response Headers</Label>
                            <div className="p-3 bg-muted rounded-md">
                              {Object.entries(selectedEndpoint.lastResponse.headers).map(([key, value]) => (
                                <div key={key} className="font-mono text-sm">
                                  <span className="font-bold">{key}:</span> {value}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div>
                          <Label>Response Body</Label>
                          <div className="p-3 bg-muted rounded-md font-mono text-sm whitespace-pre-wrap overflow-x-auto">
                            {JSON.stringify(selectedEndpoint.lastResponse.data, null, 2)}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}