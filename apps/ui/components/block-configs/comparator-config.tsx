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
import { Switch } from "@/components/ui/switch";

interface ComparatorConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export function ComparatorConfig({ config, onChange }: ComparatorConfigProps) {
  const handleChange = (field: string, value: unknown) => {
    onChange({ ...config, [field]: value });
  };

  const handleInputsChange = (value: string) => {
    try {
      if (value.trim()) {
        const parsed = JSON.parse(value);
        handleChange("inputs", parsed);
      } else {
        handleChange("inputs", {});
      }
    } catch {
      // If it's not valid JSON, keep the string for user to fix
      handleChange("inputs", value);
    }
  };

  const handleConditionsChange = (value: string) => {
    try {
      if (value.trim()) {
        const parsed = JSON.parse(value);
        handleChange("conditions", parsed);
      } else {
        handleChange("conditions", []);
      }
    } catch {
      // If it's not valid JSON, keep the string for user to fix
      handleChange("conditions", value);
    }
  };

  return (
    <div className='w-80 h-full flex flex-col bg-background border-l'>
      <div className='flex items-center justify-between p-4 border-b'>
        <h3 className='font-medium'>Comparator Configuration</h3>
      </div>

      <div className='flex-1 overflow-y-auto p-4 space-y-4'>
        {/* Operation Type */}
        <div className='space-y-2'>
          <Label htmlFor='operation'>Comparison Operation</Label>
          <Select
            value={(config.operation as string) || "equals"}
            onValueChange={(value) => handleChange("operation", value)}>
            <SelectTrigger>
              <SelectValue placeholder='Select operation' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='equals'>Equals</SelectItem>
              <SelectItem value='not_equals'>Not Equals</SelectItem>
              <SelectItem value='greater_than'>Greater Than</SelectItem>
              <SelectItem value='greater_than_or_equal'>
                Greater Than or Equal
              </SelectItem>
              <SelectItem value='less_than'>Less Than</SelectItem>
              <SelectItem value='less_than_or_equal'>
                Less Than or Equal
              </SelectItem>
              <SelectItem value='between'>Between</SelectItem>
              <SelectItem value='not_between'>Not Between</SelectItem>
              <SelectItem value='contains'>Contains</SelectItem>
              <SelectItem value='not_contains'>Not Contains</SelectItem>
              <SelectItem value='starts_with'>Starts With</SelectItem>
              <SelectItem value='ends_with'>Ends With</SelectItem>
              <SelectItem value='is_null'>Is Null</SelectItem>
              <SelectItem value='is_not_null'>Is Not Null</SelectItem>
              <SelectItem value='is_empty'>Is Empty</SelectItem>
              <SelectItem value='is_not_empty'>Is Not Empty</SelectItem>
              <SelectItem value='in'>In Array</SelectItem>
              <SelectItem value='not_in'>Not In Array</SelectItem>
              <SelectItem value='regex'>Regex Match</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Input Values */}
        <div className='space-y-2'>
          <Label htmlFor='inputs'>Input Values</Label>
          <Textarea
            id='inputs'
            placeholder='{"left": "{{price}}", "right": 2000}'
            value={
              typeof config.inputs === "object" && config.inputs !== null
                ? JSON.stringify(config.inputs, null, 2)
                : (config.inputs as string) || ""
            }
            onChange={(e) => handleInputsChange(e.target.value)}
            rows={4}
            className='font-mono text-sm'
          />
          <p className='text-xs text-muted-foreground'>
            JSON object with comparison values. Use {`{{variable}}`} for
            template variables.
          </p>
        </div>

        {/* Multiple Conditions (for complex logic) */}
        <div className='space-y-2'>
          <Label htmlFor='conditions'>Multiple Conditions (optional)</Label>
          <Textarea
            id='conditions'
            placeholder='[{"operation": "greater_than", "inputs": {"left": "{{price}}", "right": 2000}}]'
            value={
              Array.isArray(config.conditions)
                ? JSON.stringify(config.conditions, null, 2)
                : (config.conditions as string) || ""
            }
            onChange={(e) => handleConditionsChange(e.target.value)}
            rows={6}
            className='font-mono text-sm'
          />
          <p className='text-xs text-muted-foreground'>
            Array of condition objects for complex logic. Overrides single
            operation if provided.
          </p>
        </div>

        {/* Logical Operator (for multiple conditions) */}
        <div className='space-y-2'>
          <Label htmlFor='logicalOperator'>Logical Operator</Label>
          <Select
            value={(config.logicalOperator as string) || "AND"}
            onValueChange={(value) => handleChange("logicalOperator", value)}>
            <SelectTrigger>
              <SelectValue placeholder='Select operator' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='AND'>
                AND (all conditions must be true)
              </SelectItem>
              <SelectItem value='OR'>
                OR (any condition must be true)
              </SelectItem>
            </SelectContent>
          </Select>
          <p className='text-xs text-muted-foreground'>
            Used when multiple conditions are provided
          </p>
        </div>

        {/* Case Sensitive (for string operations) */}
        <div className='flex items-center space-x-2'>
          <Switch
            id='caseSensitive'
            checked={(config.caseSensitive as boolean) || false}
            onCheckedChange={(checked) =>
              handleChange("caseSensitive", checked)
            }
          />
          <Label htmlFor='caseSensitive' className='text-sm'>
            Case Sensitive (for string comparisons)
          </Label>
        </div>

        {/* Examples Card */}
        <Card>
          <CardHeader className='pb-3'>
            <CardTitle className='text-sm'>Examples</CardTitle>
          </CardHeader>
          <CardContent className='space-y-2'>
            <div className='text-xs space-y-1'>
              <div>
                <strong>Simple:</strong>{" "}
                {`{"left": "{{price}}", "right": 2000}`}
              </div>
              <div>
                <strong>Between:</strong>{" "}
                {`{"value": "{{age}}", "min": 18, "max": 65}`}
              </div>
              <div>
                <strong>Contains:</strong>{" "}
                {`{"text": "{{message}}", "substring": "error"}`}
              </div>
              <div>
                <strong>In Array:</strong>{" "}
                {`{"value": "{{status}}", "array": ["active", "pending"]}`}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
