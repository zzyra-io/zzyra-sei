"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

interface ConditionConfigProps {
  config: any
  onChange: (config: any) => void
}

export function ConditionConfig({ config, onChange }: ConditionConfigProps) {
  const handleChange = (key: string, value: any) => {
    onChange({ ...config, [key]: value })
  }

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="type">Condition Type</Label>
        <Select value={config.type || "simple"} onValueChange={(value) => handleChange("type", value)}>
          <SelectTrigger id="type">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="simple">Simple Comparison</SelectItem>
            <SelectItem value="complex">Complex Expression</SelectItem>
            <SelectItem value="json">JSON Path</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {config.type === "simple" && (
        <>
          <div className="space-y-2">
            <Label htmlFor="leftValue">Left Value</Label>
            <Input
              id="leftValue"
              placeholder="Value or variable"
              value={config.leftValue || ""}
              onChange={(e) => handleChange("leftValue", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="operator">Operator</Label>
            <Select value={config.operator || "eq"} onValueChange={(value) => handleChange("operator", value)}>
              <SelectTrigger id="operator">
                <SelectValue placeholder="Select operator" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="eq">Equals (==)</SelectItem>
                <SelectItem value="neq">Not Equals (!=)</SelectItem>
                <SelectItem value="gt">Greater Than (&gt;)</SelectItem>
                <SelectItem value="gte">Greater Than or Equal (&gt;=)</SelectItem>
                <SelectItem value="lt">Less Than (&lt;)</SelectItem>
                <SelectItem value="lte">Less Than or Equal (&lt;=)</SelectItem>
                <SelectItem value="contains">Contains</SelectItem>
                <SelectItem value="startsWith">Starts With</SelectItem>
                <SelectItem value="endsWith">Ends With</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rightValue">Right Value</Label>
            <Input
              id="rightValue"
              placeholder="Value or variable"
              value={config.rightValue || ""}
              onChange={(e) => handleChange("rightValue", e.target.value)}
            />
          </div>
        </>
      )}

      {config.type === "complex" && (
        <div className="space-y-2">
          <Label htmlFor="expression">Expression</Label>
          <Textarea
            id="expression"
            placeholder="(value1 > 10 && value2 < 20) || value3 == 'test'"
            value={config.expression || ""}
            onChange={(e) => handleChange("expression", e.target.value)}
            rows={4}
          />
        </div>
      )}

      {config.type === "json" && (
        <>
          <div className="space-y-2">
            <Label htmlFor="jsonPath">JSON Path</Label>
            <Input
              id="jsonPath"
              placeholder="$.data.value"
              value={config.jsonPath || ""}
              onChange={(e) => handleChange("jsonPath", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="jsonOperator">Operator</Label>
            <Select value={config.jsonOperator || "eq"} onValueChange={(value) => handleChange("jsonOperator", value)}>
              <SelectTrigger id="jsonOperator">
                <SelectValue placeholder="Select operator" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="eq">Equals (==)</SelectItem>
                <SelectItem value="neq">Not Equals (!=)</SelectItem>
                <SelectItem value="gt">Greater Than (&gt;)</SelectItem>
                <SelectItem value="gte">Greater Than or Equal (&gt;=)</SelectItem>
                <SelectItem value="lt">Less Than (&lt;)</SelectItem>
                <SelectItem value="lte">Less Than or Equal (&lt;=)</SelectItem>
                <SelectItem value="exists">Exists</SelectItem>
                <SelectItem value="notExists">Not Exists</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="jsonValue">Value</Label>
            <Input
              id="jsonValue"
              placeholder="Expected value"
              value={config.jsonValue || ""}
              onChange={(e) => handleChange("jsonValue", e.target.value)}
            />
          </div>
        </>
      )}

      <div className="flex items-center space-x-2">
        <Switch
          id="caseSensitive"
          checked={config.caseSensitive || false}
          onCheckedChange={(checked) => handleChange("caseSensitive", checked)}
        />
        <Label htmlFor="caseSensitive">Case sensitive</Label>
      </div>
    </div>
  )
}
