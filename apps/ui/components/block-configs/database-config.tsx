"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

interface DatabaseConfigProps {
  config: any
  onChange: (config: any) => void
}

export function DatabaseConfig({ config, onChange }: DatabaseConfigProps) {
  const handleChange = (key: string, value: any) => {
    onChange({ ...config, [key]: value })
  }

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="operation">Operation</Label>
        <Select value={config.operation || "insert"} onValueChange={(value) => handleChange("operation", value)}>
          <SelectTrigger id="operation">
            <SelectValue placeholder="Select operation" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="insert">Insert</SelectItem>
            <SelectItem value="update">Update</SelectItem>
            <SelectItem value="delete">Delete</SelectItem>
            <SelectItem value="select">Select</SelectItem>
            <SelectItem value="custom">Custom Query</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="table">Table Name</Label>
        <Input
          id="table"
          placeholder="Table name"
          value={config.table || ""}
          onChange={(e) => handleChange("table", e.target.value)}
        />
      </div>

      {config.operation === "custom" ? (
        <div className="space-y-2">
          <Label htmlFor="query">Custom SQL Query</Label>
          <Textarea
            id="query"
            placeholder="SELECT * FROM table WHERE condition"
            value={config.query || ""}
            onChange={(e) => handleChange("query", e.target.value)}
            rows={4}
          />
        </div>
      ) : (
        <>
          {(config.operation === "insert" || config.operation === "update") && (
            <div className="space-y-2">
              <Label htmlFor="data">Data (JSON)</Label>
              <Textarea
                id="data"
                placeholder='{"column1": "value1", "column2": "value2"}'
                value={config.data || ""}
                onChange={(e) => handleChange("data", e.target.value)}
                rows={4}
              />
            </div>
          )}

          {(config.operation === "update" || config.operation === "delete" || config.operation === "select") && (
            <div className="space-y-2">
              <Label htmlFor="where">Where Condition</Label>
              <Input
                id="where"
                placeholder="column = value"
                value={config.where || ""}
                onChange={(e) => handleChange("where", e.target.value)}
              />
            </div>
          )}
        </>
      )}

      <div className="flex items-center space-x-2">
        <Switch
          id="useTransaction"
          checked={config.useTransaction || false}
          onCheckedChange={(checked) => handleChange("useTransaction", checked)}
        />
        <Label htmlFor="useTransaction">Use transaction</Label>
      </div>
    </div>
  )
}
