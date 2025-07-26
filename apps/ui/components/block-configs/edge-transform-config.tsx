import React, { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Plus,
  X,
  ArrowRight,
  Target,
  RefreshCw,
} from "lucide-react";
import { edgeTransformSchema } from "@zyra/types";

interface EdgeTransformConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  executionStatus?: "idle" | "running" | "success" | "error" | "warning";
  executionData?: {
    startTime?: string;
    endTime?: string;
    duration?: number;
    error?: string;
    lastTransformation?: Record<string, unknown>;
  };
  onTest?: () => void;
  workflowNodes?: any[];
}

export function EdgeTransformConfig({
  config,
  onChange,
  executionStatus = "idle",
  executionData,
  onTest,
  workflowNodes = [],
}: EdgeTransformConfigProps) {
  const [activeTab, setActiveTab] = useState("config");
  const [fieldMappings, setFieldMappings] = useState<any[]>([]);
  const [sourceBlock, setSourceBlock] = useState<any>(null);
  const [targetBlock, setTargetBlock] = useState<any>(null);
  const [compatibilityAnalysis, setCompatibilityAnalysis] = useState<any>(null);
  const [analyzingCompatibility, setAnalyzingCompatibility] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Use the schema from @zyra/types
  const schema = edgeTransformSchema;

  // Initialize field mappings from config
  useEffect(() => {
    if (config.fieldMappings) {
      setFieldMappings(config.fieldMappings as any[]);
    }
    if (config.sourceBlockId) {
      const source = workflowNodes.find(node => node.id === config.sourceBlockId);
      setSourceBlock(source);
    }
    if (config.targetBlockId) {
      const target = workflowNodes.find(node => node.id === config.targetBlockId);
      setTargetBlock(target);
    }
  }, [config.fieldMappings, config.sourceBlockId, config.targetBlockId, workflowNodes]);

  // Analyze compatibility when blocks change
  const analyzeCompatibility = useCallback(async () => {
    if (!sourceBlock || !targetBlock) {
      setCompatibilityAnalysis(null);
      return;
    }

    setAnalyzingCompatibility(true);
    try {
      // Mock compatibility analysis for now
      // In real implementation, this would call the API
      const mockAnalysis = {
        compatible: Math.random() > 0.3,
        score: Math.random(),
        issues: sourceBlock.id === targetBlock.id ? ['Cannot transform to same block'] : [],
        suggestedMappings: [
          {
            sourceField: 'data',
            targetField: 'input',
            transformationType: 'direct',
            confidence: 0.9
          }
        ]
      };

      setCompatibilityAnalysis(mockAnalysis);

      // Auto-apply suggested mappings if none exist
      if (fieldMappings.length === 0 && mockAnalysis.suggestedMappings?.length > 0) {
        setFieldMappings(mockAnalysis.suggestedMappings);
      }
    } catch (error) {
      console.error('Compatibility analysis failed:', error);
    } finally {
      setAnalyzingCompatibility(false);
    }
  }, [sourceBlock, targetBlock, fieldMappings.length]);

  useEffect(() => {
    analyzeCompatibility();
  }, [analyzeCompatibility]);

  // Add new field mapping
  const addFieldMapping = () => {
    const newMapping = {
      sourceField: "",
      targetField: "",
      transformationType: "direct",
      transformConfig: {},
    };
    const updated = [...fieldMappings, newMapping];
    setFieldMappings(updated);
    updateConfig({ fieldMappings: updated });
  };

  // Remove field mapping
  const removeFieldMapping = (index: number) => {
    const updated = fieldMappings.filter((_, i) => i !== index);
    setFieldMappings(updated);
    updateConfig({ fieldMappings: updated });
  };

  // Update field mapping
  const updateFieldMapping = (index: number, field: string, value: any) => {
    const updated = fieldMappings.map((mapping, i) =>
      i === index ? { ...mapping, [field]: value } : mapping
    );
    setFieldMappings(updated);
    updateConfig({ fieldMappings: updated });
  };

  // Update configuration
  const updateConfig = (updates: Record<string, any>) => {
    onChange({ ...config, ...updates });
  };

  // Get compatibility status color
  const getCompatibilityColor = () => {
    if (!compatibilityAnalysis) return "text-gray-400";
    if (compatibilityAnalysis.compatible) return "text-green-600";
    return "text-red-600";
  };

  // Get compatibility status icon
  const getCompatibilityIcon = () => {
    if (!compatibilityAnalysis) return <Info className="w-4 h-4" />;
    if (compatibilityAnalysis.compatible) return <CheckCircle className="w-4 h-4" />;
    return <AlertCircle className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ArrowRight className="w-5 h-5 text-blue-600" />
              <CardTitle className="text-lg">Edge Transform</CardTitle>
            </div>
            <div className={`flex items-center space-x-2 ${getCompatibilityColor()}`}>
              {getCompatibilityIcon()}
              <span className="text-sm font-medium">
                {!compatibilityAnalysis
                  ? "Not analyzed"
                  : compatibilityAnalysis.compatible
                    ? "Compatible"
                    : "Incompatible"}
              </span>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="mappings">Field Mappings</TabsTrigger>
          <TabsTrigger value="compatibility">Compatibility</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        {/* Configuration Tab */}
        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Block Selection</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Source Block</Label>
                  <Select
                    value={config.sourceBlockId as string || ""}
                    onValueChange={(value) => {
                      const source = workflowNodes.find(node => node.id === value);
                      setSourceBlock(source);
                      updateConfig({ sourceBlockId: value });
                    }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select source block" />
                    </SelectTrigger>
                    <SelectContent>
                      {workflowNodes.map((node) => (
                        <SelectItem key={node.id} value={node.id}>
                          {node.data?.name || `${node.data?.blockType} - ${node.id.slice(0, 8)}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Target Block</Label>
                  <Select
                    value={config.targetBlockId as string || ""}
                    onValueChange={(value) => {
                      const target = workflowNodes.find(node => node.id === value);
                      setTargetBlock(target);
                      updateConfig({ targetBlockId: value });
                    }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select target block" />
                    </SelectTrigger>
                    <SelectContent>
                      {workflowNodes.map((node) => (
                        <SelectItem key={node.id} value={node.id}>
                          {node.data?.name || `${node.data?.blockType} - ${node.id.slice(0, 8)}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {sourceBlock && targetBlock && (
                <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-2">
                        <Target className="w-6 h-6 text-blue-600" />
                      </div>
                      <p className="text-sm font-medium">{sourceBlock.data?.blockType}</p>
                    </div>
                    <ArrowRight className="w-6 h-6 text-gray-400" />
                    <div className="text-center">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-2">
                        <Target className="w-6 h-6 text-green-600" />
                      </div>
                      <p className="text-sm font-medium">{targetBlock.data?.blockType}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Field Mappings Tab */}
        <TabsContent value="mappings" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Field Mappings</CardTitle>
                <Button onClick={addFieldMapping} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Mapping
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {fieldMappings.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <ArrowRight className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No field mappings configured</p>
                  <p className="text-sm">Add mappings to transform data between blocks</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {fieldMappings.map((mapping, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{mapping.transformationType}</Badge>
                          <span className="text-sm font-medium">Mapping {index + 1}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFieldMapping(index)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Source Field</Label>
                          <Input
                            value={mapping.sourceField || ""}
                            onChange={(e) =>
                              updateFieldMapping(index, "sourceField", e.target.value)
                            }
                            placeholder="e.g., data.response"
                          />
                        </div>

                        <div>
                          <Label>Target Field</Label>
                          <Input
                            value={mapping.targetField || ""}
                            onChange={(e) =>
                              updateFieldMapping(index, "targetField", e.target.value)
                            }
                            placeholder="e.g., input"
                          />
                        </div>

                        <div>
                          <Label>Transformation Type</Label>
                          <Select
                            value={mapping.transformationType}
                            onValueChange={(value) =>
                              updateFieldMapping(index, "transformationType", value)
                            }>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="direct">Direct</SelectItem>
                              <SelectItem value="format">Format</SelectItem>
                              <SelectItem value="calculate">Calculate</SelectItem>
                              <SelectItem value="conditional">Conditional</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {mapping.transformationType !== 'direct' && (
                          <div>
                            <Label>Transform Config</Label>
                            <Input
                              value={JSON.stringify(mapping.transformConfig || {})}
                              onChange={(e) => {
                                try {
                                  const config = JSON.parse(e.target.value);
                                  updateFieldMapping(index, "transformConfig", config);
                                } catch {
                                  // Invalid JSON, ignore
                                }
                              }}
                              placeholder='{"operation": "uppercase"}'
                            />
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compatibility Tab */}
        <TabsContent value="compatibility" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Compatibility Analysis</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={analyzeCompatibility}
                  disabled={analyzingCompatibility || !sourceBlock || !targetBlock}>
                  {analyzingCompatibility ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  {analyzingCompatibility ? "Analyzing..." : "Analyze"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!sourceBlock || !targetBlock ? (
                <div className="text-center py-8 text-gray-500">
                  <Info className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Select source and target blocks to analyze compatibility</p>
                </div>
              ) : compatibilityAnalysis ? (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    {getCompatibilityIcon()}
                    <span className={`text-sm font-medium ${getCompatibilityColor()}`}>
                      {compatibilityAnalysis.compatible ? "Compatible" : "Incompatible"}
                    </span>
                    <Badge variant="outline">
                      {Math.round(compatibilityAnalysis.score * 100)}% confidence
                    </Badge>
                  </div>

                  {compatibilityAnalysis.issues?.length > 0 && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <ul className="list-disc list-inside">
                          {compatibilityAnalysis.issues.map((issue: string, index: number) => (
                            <li key={index}>{issue}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  {compatibilityAnalysis.suggestedMappings?.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Suggested Mappings</Label>
                      <div className="space-y-2">
                        {compatibilityAnalysis.suggestedMappings.map((suggestion: any, index: number) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <span className="text-sm">
                              {suggestion.sourceField} → {suggestion.targetField}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {Math.round(suggestion.confidence * 100)}%
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Loader2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Click "Analyze" to check compatibility</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Transformation Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <Info className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Preview functionality coming soon</p>
                <p className="text-sm">
                  Test your transformations with sample data
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Execution Status */}
      {executionStatus !== "idle" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Execution Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {executionStatus === "running" && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              {executionStatus === "success" && (
                <CheckCircle className="w-4 h-4 text-green-600" />
              )}
              {executionStatus === "error" && (
                <AlertCircle className="w-4 h-4 text-red-600" />
              )}
              <span className="capitalize">{executionStatus}</span>
            </div>

            {executionData?.lastTransformation && (
              <div className="mt-4">
                <Label className="text-sm font-medium">Last Transformation</Label>
                <pre className="mt-2 p-3 bg-gray-50 rounded-md text-sm overflow-auto max-h-40">
                  {JSON.stringify(executionData.lastTransformation, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Test Button */}
      {onTest && (
        <div className="flex justify-end">
          <Button onClick={onTest} disabled={executionStatus === "running"}>
            {executionStatus === "running" ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            Test Transform
          </Button>
        </div>
      )}
    </div>
  );
}