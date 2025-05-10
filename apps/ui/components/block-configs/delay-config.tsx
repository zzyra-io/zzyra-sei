"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"

interface DelayConfigProps {
  config: any
  onChange: (config: any) => void
}

export function DelayConfig({ config, onChange }: DelayConfigProps) {
  const handleChange = (key: string, value: any) => {
    onChange({ ...config, [key]: value })
  }

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="duration">Duration</Label>
        <div className="flex items-center space-x-2">
          <Input
            id="duration"
            type="number"
            value={config.duration || "5"}
            onChange={(e) => handleChange("duration", e.target.value)}
            min="1"
            className="w-24"
          />
          <Select value={config.unit || "minutes"} onValueChange={(value) => handleChange("unit", value)}>
            <SelectTrigger id="unit" className="flex-1">
              <SelectValue placeholder="Unit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="seconds">Seconds</SelectItem>
              <SelectItem value="minutes">Minutes</SelectItem>
              <SelectItem value="hours">Hours</SelectItem>
              <SelectItem value="days">Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="delayType">Delay Type</Label>
        <Select value={config.delayType || "fixed"} onValueChange={(value) => handleChange("delayType", value)}>
          <SelectTrigger id="delayType">
            <SelectValue placeholder="Select delay type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fixed">Fixed</SelectItem>
            <SelectItem value="random">Random</SelectItem>
            <SelectItem value="exponential">Exponential Backoff</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {config.delayType === "random" && (
        <div className="space-y-2">
          <Label htmlFor="maxDuration">Maximum Duration</Label>
          <div className="flex items-center space-x-2">
            <Input
              id="maxDuration"
              type="number"
              value={config.maxDuration || "10"}
              onChange={(e) => handleChange("maxDuration", e.target.value)}
              min={Number.parseInt(config.duration || "5") + 1}
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">{config.unit || "minutes"}</span>
          </div>
        </div>
      )}

      {config.delayType === "exponential" && (
        <>
          <div className="space-y-2">
            <Label htmlFor="factor">Backoff Factor</Label>
            <Slider
              id="factor"
              value={[Number.parseFloat(config.factor || "2")]}
              min={1.1}
              max={5}
              step={0.1}
              onValueChange={(value) => handleChange("factor", value[0].toString())}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1.1x</span>
              <span>{config.factor || "2"}x</span>
              <span>5x</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxRetries">Maximum Retries</Label>
            <Input
              id="maxRetries"
              type="number"
              value={config.maxRetries || "3"}
              onChange={(e) => handleChange("maxRetries", e.target.value)}
              min="1"
              max="10"
            />
          </div>
        </>
      )}
    </div>
  )
}
