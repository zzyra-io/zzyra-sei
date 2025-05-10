"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

interface NotificationConfigProps {
  config: any
  onChange: (config: any) => void
}

export function NotificationConfig({ config, onChange }: NotificationConfigProps) {
  const handleChange = (key: string, value: any) => {
    onChange({ ...config, [key]: value })
  }

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="type">Notification Type</Label>
        <Select value={config.type || "in-app"} onValueChange={(value) => handleChange("type", value)}>
          <SelectTrigger id="type">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="in-app">In-App</SelectItem>
            <SelectItem value="push">Push Notification</SelectItem>
            <SelectItem value="slack">Slack</SelectItem>
            <SelectItem value="discord">Discord</SelectItem>
            <SelectItem value="telegram">Telegram</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          placeholder="Notification title"
          value={config.title || ""}
          onChange={(e) => handleChange("title", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">Message</Label>
        <Textarea
          id="message"
          placeholder="Notification message..."
          value={config.message || ""}
          onChange={(e) => handleChange("message", e.target.value)}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="priority">Priority</Label>
        <Select value={config.priority || "normal"} onValueChange={(value) => handleChange("priority", value)}>
          <SelectTrigger id="priority">
            <SelectValue placeholder="Select priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {config.type === "slack" && (
        <div className="space-y-2">
          <Label htmlFor="webhookUrl">Webhook URL</Label>
          <Input
            id="webhookUrl"
            placeholder="https://hooks.slack.com/..."
            value={config.webhookUrl || ""}
            onChange={(e) => handleChange("webhookUrl", e.target.value)}
          />
        </div>
      )}

      {(config.type === "discord" || config.type === "telegram") && (
        <div className="space-y-2">
          <Label htmlFor="channelId">Channel ID</Label>
          <Input
            id="channelId"
            placeholder="Channel ID"
            value={config.channelId || ""}
            onChange={(e) => handleChange("channelId", e.target.value)}
          />
        </div>
      )}

      <div className="flex items-center space-x-2">
        <Switch
          id="includeTimestamp"
          checked={config.includeTimestamp !== false}
          onCheckedChange={(checked) => handleChange("includeTimestamp", checked)}
        />
        <Label htmlFor="includeTimestamp">Include timestamp</Label>
      </div>
    </div>
  )
}
