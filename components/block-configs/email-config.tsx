"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface EmailConfigProps {
  config: any
  onChange: (config: any) => void
}

export function EmailConfig({ config, onChange }: EmailConfigProps) {
  const handleChange = (key: string, value: any) => {
    onChange({ ...config, [key]: value })
  }

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="to">To</Label>
        <Input
          id="to"
          type="email"
          placeholder="recipient@example.com"
          value={config.to || ""}
          onChange={(e) => handleChange("to", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cc">CC</Label>
        <Input
          id="cc"
          type="email"
          placeholder="cc@example.com"
          value={config.cc || ""}
          onChange={(e) => handleChange("cc", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="subject">Subject</Label>
        <Input
          id="subject"
          placeholder="Email subject"
          value={config.subject || ""}
          onChange={(e) => handleChange("subject", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="body">Body</Label>
        <Textarea
          id="body"
          placeholder="Email content..."
          value={config.body || ""}
          onChange={(e) => handleChange("body", e.target.value)}
          rows={5}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="template">Template</Label>
        <Select value={config.template || "default"} onValueChange={(value) => handleChange("template", value)}>
          <SelectTrigger id="template">
            <SelectValue placeholder="Select template" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Default</SelectItem>
            <SelectItem value="alert">Alert</SelectItem>
            <SelectItem value="notification">Notification</SelectItem>
            <SelectItem value="report">Report</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="includeWorkflowData"
          checked={config.includeWorkflowData || false}
          onCheckedChange={(checked) => handleChange("includeWorkflowData", checked)}
        />
        <Label htmlFor="includeWorkflowData">Include workflow data</Label>
      </div>
    </div>
  )
}
