"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface ScheduleConfigProps {
  config: any;
  onChange: (config: any) => void;
}

export function ScheduleConfig({ config, onChange }: ScheduleConfigProps) {
  const handleChange = (key: string, value: any) => {
    onChange({ ...config, [key]: value });
  };

  return (
    <div className='p-4 space-y-4'>
      <div className='space-y-2'>
        <Label htmlFor='interval'>Interval</Label>
        <Select
          value={config.interval || "hourly"}
          onValueChange={(value) => handleChange("interval", value)}>
          <SelectTrigger id='interval'>
            <SelectValue placeholder='Select interval' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='minutely'>Every Minute</SelectItem>
            <SelectItem value='hourly'>Hourly</SelectItem>
            <SelectItem value='daily'>Daily</SelectItem>
            <SelectItem value='weekly'>Weekly</SelectItem>
            <SelectItem value='monthly'>Monthly</SelectItem>
            <SelectItem value='custom'>Custom (CRON)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {config.interval === "custom" && (
        <div className='space-y-2'>
          <Label htmlFor='cronExpression'>CRON Expression</Label>
          <Input
            id='cronExpression'
            placeholder='* * * * *'
            value={config.cronExpression || ""}
            onChange={(e) => handleChange("cronExpression", e.target.value)}
          />
          <p className='text-xs text-muted-foreground mt-1'>
            Format: minute hour day month weekday
          </p>
        </div>
      )}

      {config.interval === "daily" && (
        <div className='space-y-2'>
          <Label htmlFor='time'>Time</Label>
          <Input
            id='time'
            type='time'
            value={config.time || "09:00"}
            onChange={(e) => handleChange("time", e.target.value)}
          />
        </div>
      )}

      {config.interval === "weekly" && (
        <>
          <div className='space-y-2'>
            <Label htmlFor='dayOfWeek'>Day of Week</Label>
            <Select
              value={config.dayOfWeek || "1"}
              onValueChange={(value) => handleChange("dayOfWeek", value)}>
              <SelectTrigger id='dayOfWeek'>
                <SelectValue placeholder='Select day' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='0'>Sunday</SelectItem>
                <SelectItem value='1'>Monday</SelectItem>
                <SelectItem value='2'>Tuesday</SelectItem>
                <SelectItem value='3'>Wednesday</SelectItem>
                <SelectItem value='4'>Thursday</SelectItem>
                <SelectItem value='5'>Friday</SelectItem>
                <SelectItem value='6'>Saturday</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='weeklyTime'>Time</Label>
            <Input
              id='weeklyTime'
              type='time'
              value={config.weeklyTime || "09:00"}
              onChange={(e) => handleChange("weeklyTime", e.target.value)}
            />
          </div>
        </>
      )}

      {config.interval === "monthly" && (
        <>
          <div className='space-y-2'>
            <Label htmlFor='dayOfMonth'>Day of Month</Label>
            <Input
              id='dayOfMonth'
              type='number'
              min='1'
              max='31'
              value={config.dayOfMonth || "1"}
              onChange={(e) => handleChange("dayOfMonth", e.target.value)}
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='monthlyTime'>Time</Label>
            <Input
              id='monthlyTime'
              type='time'
              value={config.monthlyTime || "09:00"}
              onChange={(e) => handleChange("monthlyTime", e.target.value)}
            />
          </div>
        </>
      )}

      <div className='flex items-center space-x-2'>
        <Switch
          id='active'
          checked={config.active !== false}
          onCheckedChange={(checked) => handleChange("active", checked)}
        />
        <Label htmlFor='active'>Active</Label>
      </div>

      <div className='space-y-2'>
        <Label htmlFor='timezone'>Timezone</Label>
        <Select
          value={config.timezone || "UTC"}
          onValueChange={(value) => handleChange("timezone", value)}>
          <SelectTrigger id='timezone'>
            <SelectValue placeholder='Select timezone' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='UTC'>UTC</SelectItem>
            <SelectItem value='America/New_York'>Eastern Time (ET)</SelectItem>
            <SelectItem value='America/Chicago'>Central Time (CT)</SelectItem>
            <SelectItem value='America/Denver'>Mountain Time (MT)</SelectItem>
            <SelectItem value='America/Los_Angeles'>
              Pacific Time (PT)
            </SelectItem>
            <SelectItem value='Europe/London'>London (GMT)</SelectItem>
            <SelectItem value='Europe/Paris'>Paris (CET)</SelectItem>
            <SelectItem value='Asia/Tokyo'>Tokyo (JST)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// Remove circular dependency - don't self-register
// import blockConfigRegistry from "@/lib/block-config-registry";
// blockConfigRegistry.register("SCHEDULE", ScheduleConfig);
