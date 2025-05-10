"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

interface WebhookConfigProps {
  config: any
  onChange: (config: any) => void
}

export function WebhookConfig({ config, onChange }: WebhookConfigProps) {
  const handleChange = (key: string, value: any) => {
    onChange({ ...config, [key]: value })
  }

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="url">Webhook URL</Label>
        <Input
          id="url"
          placeholder="https://example.com/webhook"
          value={config.url || ""}
          onChange={(e) => handleChange("url", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="method">HTTP Method</Label>
        <Select value={config.method || "POST"} onValueChange={(value) => handleChange("method", value)}>
          <SelectTrigger id="method">
            <SelectValue placeholder="Select method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="GET">GET</SelectItem>
            <SelectItem value="POST">POST</SelectItem>
            <SelectItem value="PUT">PUT</SelectItem>
            <SelectItem value="PATCH">PATCH</SelectItem>
            <SelectItem value="DELETE">DELETE</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="headers">Headers (JSON)</Label>
        <Textarea
          id="headers"
          placeholder='{"Content-Type": "application/json", "Authorization": "Bearer token"}'
          value={config.headers || ""}
          onChange={(e) => handleChange("headers", e.target.value)}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="body">Body (JSON)</Label>
        <Textarea
          id="body"
          placeholder='{"key": "value"}'
          value={config.body || ""}
          onChange={(e) => handleChange("body", e.target.value)}
          rows={4}
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="includeWorkflowData"
          checked={config.includeWorkflowData || false}
          onCheckedChange={(checked) => handleChange("includeWorkflowData", checked)}
        />
        <Label htmlFor="includeWorkflowData">Include workflow data</Label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="timeout">Timeout (seconds)</Label>
        <Input
          id="timeout"
          type="number"
          value={config.timeout || "30"}
          onChange={(e) => handleChange("timeout", e.target.value)}
          min="1"
          max="300"
        />
      </div>
    </div>
  )
}
