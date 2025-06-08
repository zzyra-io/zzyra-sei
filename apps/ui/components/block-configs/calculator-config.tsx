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

interface CalculatorConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export function CalculatorConfig({ config, onChange }: CalculatorConfigProps) {
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

  return (
    <div className='w-80 h-full flex flex-col bg-background border-l'>
      <div className='flex items-center justify-between p-4 border-b'>
        <h3 className='font-medium'>Calculator Configuration</h3>
      </div>

      <div className='flex-1 overflow-y-auto p-4 space-y-4'>
        {/* Operation Type */}
        <div className='space-y-2'>
          <Label htmlFor='operation'>Operation</Label>
          <Select
            value={(config.operation as string) || "add"}
            onValueChange={(value) => handleChange("operation", value)}>
            <SelectTrigger>
              <SelectValue placeholder='Select operation' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='add'>Add</SelectItem>
              <SelectItem value='subtract'>Subtract</SelectItem>
              <SelectItem value='multiply'>Multiply</SelectItem>
              <SelectItem value='divide'>Divide</SelectItem>
              <SelectItem value='percentage'>Percentage</SelectItem>
              <SelectItem value='percentageOf'>Percentage Of</SelectItem>
              <SelectItem value='average'>Average</SelectItem>
              <SelectItem value='min'>Minimum</SelectItem>
              <SelectItem value='max'>Maximum</SelectItem>
              <SelectItem value='sum'>Sum</SelectItem>
              <SelectItem value='round'>Round</SelectItem>
              <SelectItem value='floor'>Floor</SelectItem>
              <SelectItem value='ceil'>Ceiling</SelectItem>
              <SelectItem value='abs'>Absolute</SelectItem>
              <SelectItem value='sqrt'>Square Root</SelectItem>
              <SelectItem value='power'>Power</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Input Values */}
        <div className='space-y-2'>
          <Label htmlFor='inputs'>Input Values</Label>
          <Textarea
            id='inputs'
            placeholder='{"value": "{{price}}", "percentage": 10}'
            value={
              typeof config.inputs === "object" && config.inputs !== null
                ? JSON.stringify(config.inputs, null, 2)
                : (config.inputs as string) || ""
            }
            onChange={(e) => handleInputsChange(e.target.value)}
            rows={6}
            className='font-mono text-sm'
          />
          <p className='text-xs text-muted-foreground'>
            JSON object with input values. Use {`{{variable}}`} for template
            variables.
          </p>
        </div>

        {/* Custom Formula (alternative to operation) */}
        <div className='space-y-2'>
          <Label htmlFor='formula'>Custom Formula (optional)</Label>
          <Input
            id='formula'
            placeholder='({{value}} * {{percentage}}) / 100'
            value={(config.formula as string) || ""}
            onChange={(e) => handleChange("formula", e.target.value)}
          />
          <p className='text-xs text-muted-foreground'>
            Use mathematical expressions with template variables. Overrides
            operation if provided.
          </p>
        </div>

        {/* Precision */}
        <div className='space-y-2'>
          <Label htmlFor='precision'>Decimal Precision</Label>
          <Input
            id='precision'
            type='number'
            min='0'
            max='15'
            value={(config.precision as number) || 8}
            onChange={(e) =>
              handleChange("precision", parseInt(e.target.value) || 8)
            }
          />
          <p className='text-xs text-muted-foreground'>
            Number of decimal places in the result
          </p>
        </div>

        {/* Examples Card */}
        <Card>
          <CardHeader className='pb-3'>
            <CardTitle className='text-sm'>Examples</CardTitle>
          </CardHeader>
          <CardContent className='space-y-2'>
            <div className='text-xs space-y-1'>
              <div>
                <strong>Add:</strong> {`{"a": 10, "b": 20}`}
              </div>
              <div>
                <strong>Percentage:</strong>{" "}
                {`{"value": "{{balance}}", "percentage": 10}`}
              </div>
              <div>
                <strong>Formula:</strong> {`Math.sqrt({{value}}) * 2`}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
