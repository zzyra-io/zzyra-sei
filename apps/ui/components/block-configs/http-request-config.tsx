import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";

interface HttpRequestConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export function HttpRequestConfig({
  config,
  onChange,
}: HttpRequestConfigProps) {
  const [headers, setHeaders] = useState(config.headers || {});
  const [newHeaderKey, setNewHeaderKey] = useState("");
  const [newHeaderValue, setNewHeaderValue] = useState("");

  const handleChange = (field: string, value: unknown) => {
    onChange({ ...config, [field]: value });
  };

  const addHeader = () => {
    if (newHeaderKey && newHeaderValue) {
      const updatedHeaders = { ...headers, [newHeaderKey]: newHeaderValue };
      setHeaders(updatedHeaders);
      handleChange("headers", updatedHeaders);
      setNewHeaderKey("");
      setNewHeaderValue("");
    }
  };

  const removeHeader = (key: string) => {
    const updatedHeaders = { ...headers };
    delete updatedHeaders[key];
    setHeaders(updatedHeaders);
    handleChange("headers", updatedHeaders);
  };

  const handleBodyChange = (value: string) => {
    try {
      // Try to parse as JSON if it's not empty
      if (value.trim()) {
        const parsed = JSON.parse(value);
        handleChange("body", parsed);
      } else {
        handleChange("body", undefined);
      }
    } catch {
      // If it's not valid JSON, store as string
      handleChange("body", value);
    }
  };

  return (
    <div className='w-80 h-full flex flex-col bg-background border-l'>
      <div className='flex items-center justify-between p-4 border-b'>
        <h3 className='font-medium'>HTTP Request Configuration</h3>
      </div>

      <div className='flex-1 overflow-y-auto p-4 space-y-4'>
        {/* URL */}
        <div className='space-y-2'>
          <Label htmlFor='url'>URL *</Label>
          <Input
            id='url'
            placeholder='https://api.example.com/endpoint'
            value={config.url || ""}
            onChange={(e) => handleChange("url", e.target.value)}
          />
          <p className='text-xs text-muted-foreground'>
            Use {`{{variable}}`} for template variables
          </p>
        </div>

        {/* Method */}
        <div className='space-y-2'>
          <Label htmlFor='method'>Method</Label>
          <Select
            value={config.method || "GET"}
            onValueChange={(value) => handleChange("method", value)}>
            <SelectTrigger>
              <SelectValue placeholder='Select method' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='GET'>GET</SelectItem>
              <SelectItem value='POST'>POST</SelectItem>
              <SelectItem value='PUT'>PUT</SelectItem>
              <SelectItem value='DELETE'>DELETE</SelectItem>
              <SelectItem value='PATCH'>PATCH</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Headers */}
        <Card>
          <CardHeader className='pb-3'>
            <CardTitle className='text-sm'>Headers</CardTitle>
          </CardHeader>
          <CardContent className='space-y-3'>
            {Object.entries(headers).map(([key, value]) => (
              <div key={key} className='flex items-center gap-2'>
                <Badge variant='secondary' className='flex items-center gap-1'>
                  <span className='font-mono text-xs'>
                    {key}: {value as string}
                  </span>
                  <Button
                    variant='ghost'
                    size='sm'
                    className='h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground'
                    onClick={() => removeHeader(key)}>
                    <X className='h-3 w-3' />
                  </Button>
                </Badge>
              </div>
            ))}

            <div className='grid grid-cols-2 gap-2'>
              <Input
                placeholder='Header name'
                value={newHeaderKey}
                onChange={(e) => setNewHeaderKey(e.target.value)}
              />
              <Input
                placeholder='Header value'
                value={newHeaderValue}
                onChange={(e) => setNewHeaderValue(e.target.value)}
              />
            </div>
            <Button
              variant='outline'
              size='sm'
              onClick={addHeader}
              disabled={!newHeaderKey || !newHeaderValue}
              className='w-full'>
              <Plus className='h-4 w-4 mr-1' />
              Add Header
            </Button>
          </CardContent>
        </Card>

        {/* Body (for POST/PUT/PATCH) */}
        {config.method && !["GET", "DELETE"].includes(config.method) && (
          <div className='space-y-2'>
            <Label htmlFor='body'>Request Body</Label>
            <Textarea
              id='body'
              placeholder='{"key": "value"} or use {{variables}}'
              value={
                typeof config.body === "object"
                  ? JSON.stringify(config.body, null, 2)
                  : config.body || ""
              }
              onChange={(e) => handleBodyChange(e.target.value)}
              rows={6}
              className='font-mono text-sm'
            />
            <p className='text-xs text-muted-foreground'>
              JSON object or template variables
            </p>
          </div>
        )}

        {/* Data Path */}
        <div className='space-y-2'>
          <Label htmlFor='dataPath'>Data Path (optional)</Label>
          <Input
            id='dataPath'
            placeholder='response.data.price'
            value={config.dataPath || ""}
            onChange={(e) => handleChange("dataPath", e.target.value)}
          />
          <p className='text-xs text-muted-foreground'>
            Extract specific data using dot notation
          </p>
        </div>

        {/* Advanced Settings */}
        <Card>
          <CardHeader className='pb-3'>
            <CardTitle className='text-sm'>Advanced Settings</CardTitle>
          </CardHeader>
          <CardContent className='space-y-3'>
            <div className='grid grid-cols-2 gap-2'>
              <div className='space-y-1'>
                <Label htmlFor='retries' className='text-xs'>
                  Retries
                </Label>
                <Input
                  id='retries'
                  type='number'
                  min='0'
                  max='10'
                  value={config.retries || 3}
                  onChange={(e) =>
                    handleChange("retries", parseInt(e.target.value) || 3)
                  }
                />
              </div>
              <div className='space-y-1'>
                <Label htmlFor='timeout' className='text-xs'>
                  Timeout (ms)
                </Label>
                <Input
                  id='timeout'
                  type='number'
                  min='1000'
                  max='60000'
                  value={config.timeout || 10000}
                  onChange={(e) =>
                    handleChange("timeout", parseInt(e.target.value) || 10000)
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
