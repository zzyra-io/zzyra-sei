"use client"

import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

interface TransformConfigProps {
  config: any
  onChange: (config: any) => void
}

export function TransformConfig({ config, onChange }: TransformConfigProps) {
  const handleChange = (key: string, value: any) => {
    onChange({ ...config, [key]: value })
  }

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="transformType">Transform Type</Label>
        <Select
          value={config.transformType || "javascript"}
          onValueChange={(value) => handleChange("transformType", value)}
        >
          <SelectTrigger id="transformType">
            <SelectValue placeholder="Select transform type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="javascript">JavaScript</SelectItem>
            <SelectItem value="jsonPath">JSON Path</SelectItem>
            <SelectItem value="template">Template</SelectItem>
            <SelectItem value="mapping">Field Mapping</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {config.transformType === "javascript" && (
        <div className="space-y-2">
          <Label htmlFor="code">JavaScript Code</Label>
          <Textarea
            id="code"
            placeholder="// Example: return { ...data, transformed: true };"
            value={config.code || ""}
            onChange={(e) => handleChange("code", e.target.value)}
            rows={8}
            className="font-mono text-sm"
          />
        </div>
      )}

      {config.transformType === "jsonPath" && (
        <div className="space-y-2">
          <Label htmlFor="jsonPath">JSON Path Expression</Label>
          <Textarea
            id="jsonPath"
            placeholder="$.data.items[*].name"
            value={config.jsonPath || ""}
            onChange={(e) => handleChange("jsonPath", e.target.value)}
            rows={3}
          />
        </div>
      )}

      {config.transformType === "template" && (
        <div className="space-y-2">
          <Label htmlFor="template">Template</Label>
          <Textarea
            id="template"
            placeholder="Hello {{name}}, your balance is {{amount}}."
            value={config.template || ""}
            onChange={(e) => handleChange("template", e.target.value)}
            rows={5}
          />
        </div>
      )}

      {config.transformType === "mapping" && (
        <div className="space-y-2">
          <Label htmlFor="mapping">Field Mapping (JSON)</Label>
          <Textarea
            id="mapping"
            placeholder='{"sourceField": "targetField", "oldName": "newName"}'
            value={config.mapping || ""}
            onChange={(e) => handleChange("mapping", e.target.value)}
            rows={5}
          />
        </div>
      )}

      <div className="flex items-center space-x-2">
        <Switch
          id="preserveOriginal"
          checked={config.preserveOriginal || false}
          onCheckedChange={(checked) => handleChange("preserveOriginal", checked)}
        />
        <Label htmlFor="preserveOriginal">Preserve original data</Label>
      </div>
    </div>
  )
}
