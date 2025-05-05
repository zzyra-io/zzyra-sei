import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { BlockProps } from '@/types/workflow';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  ChevronDownIcon,
  TrendingUpIcon,
  PercentIcon,
  ShieldIcon,
  BalanceIcon,
  ArrowRightIcon,
} from 'lucide-react';
import TokenSelector from '@/components/web3/token-selector';

// Define optimization strategies
const OPTIMIZATION_STRATEGIES = [
  { value: 'max_yield', label: 'Maximum Yield', icon: <TrendingUpIcon className="h-4 w-4 mr-2" /> },
  { value: 'min_risk', label: 'Minimum Risk', icon: <ShieldIcon className="h-4 w-4 mr-2" /> },
  { value: 'balanced', label: 'Balanced', icon: <BalanceIcon className="h-4 w-4 mr-2" /> },
];

// Define protocols
const PROTOCOLS = [
  { value: 'aave', label: 'Aave', logo: '/assets/protocols/aave.svg' },
  { value: 'uniswap', label: 'Uniswap', logo: '/assets/protocols/uniswap.svg' },
  { value: 'compound', label: 'Compound', logo: '/assets/protocols/compound.svg' },
  { value: 'curve', label: 'Curve Finance', logo: '/assets/protocols/curve.svg' },
  { value: 'convex', label: 'Convex Finance', logo: '/assets/protocols/convex.svg' },
  { value: 'yearn', label: 'Yearn Finance', logo: '/assets/protocols/yearn.svg' },
];

// Define default tokens for yield strategies
const DEFAULT_TOKENS = [
  { symbol: 'ETH', address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' },
  { symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' },
  { symbol: 'USDT', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' },
  { symbol: 'DAI', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F' },
  { symbol: 'WBTC', address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599' },
];

// Define yield strategy form data interface
interface YieldStrategyFormData {
  strategy: string;
  optimizationGoal: string;
  assets: string[];
  protocols: string[];
  rebalancingInterval: number;
  minYieldThreshold: number;
  autoExecute: boolean;
  maxAllocation: number;
  minDiversification: number;
}

// Default form values
const defaultValues: YieldStrategyFormData = {
  strategy: 'yield_farming',
  optimizationGoal: 'balanced',
  assets: ['ETH', 'USDC', 'DAI'],
  protocols: ['aave', 'uniswap'],
  rebalancingInterval: 24,
  minYieldThreshold: 3,
  autoExecute: false,
  maxAllocation: 40,
  minDiversification: 3,
};

export default function DefiYieldStrategyBlock({ data, onChange }: BlockProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedTokens, setSelectedTokens] = useState<string[]>([]);

  // Initialize react-hook-form
  const form = useForm<YieldStrategyFormData>({
    defaultValues: data?.config || defaultValues,
  });

  // Sync form changes with workflow node data
  const onSubmit = (values: YieldStrategyFormData) => {
    onChange({
      ...data,
      config: {
        ...values,
        type: 'YIELD_STRATEGY',
      },
    });
  };

  // Watch form values
  const watchValues = form.watch();

  // Update data when form values change
  useEffect(() => {
    const subscription = form.watch((value) => {
      onChange({
        ...data,
        config: {
          ...value,
          type: 'YIELD_STRATEGY',
        },
      });
    });
    return () => subscription.unsubscribe();
  }, [form, onChange, data]);

  // Update initial form values when data changes
  useEffect(() => {
    if (data?.config && Object.keys(data.config).length) {
      form.reset(data.config);
    }
  }, [data?.config, form]);
  
  // Initialize selected tokens based on form data
  useEffect(() => {
    if (watchValues.assets?.length > 0) {
      setSelectedTokens(watchValues.assets);
    }
  }, [watchValues.assets]);

  return (
    <div className="w-full p-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            {/* Strategy Selection */}
            <FormField
              control={form.control}
              name="strategy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>DeFi Strategy</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select strategy" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="yield_farming">Yield Farming</SelectItem>
                      <SelectItem value="lending">Lending</SelectItem>
                      <SelectItem value="liquidity_provision">Liquidity Provision</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Optimization Goal */}
            <FormField
              control={form.control}
              name="optimizationGoal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Optimization Goal</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select optimization goal" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {OPTIMIZATION_STRATEGIES.map((strategy) => (
                        <SelectItem key={strategy.value} value={strategy.value}>
                          <div className="flex items-center">
                            {strategy.icon}
                            {strategy.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Asset Selection */}
            <FormField
              control={form.control}
              name="assets"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assets to Include</FormLabel>
                  <FormControl>
                    <div className="flex flex-wrap gap-2 p-2 border rounded-md">
                      {DEFAULT_TOKENS.map((token) => (
                        <Badge
                          key={token.symbol}
                          variant={field.value.includes(token.symbol) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => {
                            const newAssets = field.value.includes(token.symbol)
                              ? field.value.filter((a) => a !== token.symbol)
                              : [...field.value, token.symbol];
                            field.onChange(newAssets);
                          }}
                        >
                          {token.symbol}
                        </Badge>
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Protocol Selection */}
            <FormField
              control={form.control}
              name="protocols"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Protocols to Include</FormLabel>
                  <FormControl>
                    <div className="flex flex-wrap gap-2 p-2 border rounded-md">
                      {PROTOCOLS.map((protocol) => (
                        <Badge
                          key={protocol.value}
                          variant={field.value.includes(protocol.value) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => {
                            const newProtocols = field.value.includes(protocol.value)
                              ? field.value.filter((p) => p !== protocol.value)
                              : [...field.value, protocol.value];
                            field.onChange(newProtocols);
                          }}
                        >
                          {protocol.label}
                        </Badge>
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Advanced Settings Toggle */}
            <div className="flex items-center justify-between pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center"
              >
                Advanced Settings
                <ChevronDownIcon className={`ml-2 h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
              </Button>
            </div>

            {/* Advanced Settings Section */}
            {showAdvanced && (
              <div className="space-y-4 border rounded-md p-4 bg-muted/20">
                {/* Rebalancing Interval */}
                <FormField
                  control={form.control}
                  name="rebalancingInterval"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rebalancing Interval (hours)</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-4">
                          <Slider
                            min={1}
                            max={168}
                            step={1}
                            value={[field.value]}
                            onValueChange={(value) => field.onChange(value[0])}
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            className="w-20"
                            value={field.value}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Min Yield Threshold */}
                <FormField
                  control={form.control}
                  name="minYieldThreshold"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimum Yield Threshold (%)</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-4">
                          <Slider
                            min={0}
                            max={20}
                            step={0.1}
                            value={[field.value]}
                            onValueChange={(value) => field.onChange(value[0])}
                            className="flex-1"
                          />
                          <div className="flex items-center w-20">
                            <Input
                              type="number"
                              value={field.value}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                            <span className="ml-1">%</span>
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Max Allocation */}
                <FormField
                  control={form.control}
                  name="maxAllocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maximum Allocation per Asset (%)</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-4">
                          <Slider
                            min={10}
                            max={100}
                            step={5}
                            value={[field.value]}
                            onValueChange={(value) => field.onChange(value[0])}
                            className="flex-1"
                          />
                          <div className="flex items-center w-20">
                            <Input
                              type="number"
                              value={field.value}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 10)}
                            />
                            <span className="ml-1">%</span>
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Min Diversification */}
                <FormField
                  control={form.control}
                  name="minDiversification"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimum Number of Assets</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-4">
                          <Slider
                            min={1}
                            max={10}
                            step={1}
                            value={[field.value]}
                            onValueChange={(value) => field.onChange(value[0])}
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            className="w-20"
                            value={field.value}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Auto Execute */}
                <FormField
                  control={form.control}
                  name="autoExecute"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Auto-Execute Strategy
                        </FormLabel>
                        <FormDescription>
                          Automatically execute trades to implement the optimal strategy
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>
        </form>
      </Form>
      
      {/* Preview Section */}
      <div className="mt-6 p-4 border rounded-md bg-muted/10">
        <h3 className="text-lg font-medium mb-2">Strategy Preview</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Optimization Goal</p>
            <p className="font-medium">
              {OPTIMIZATION_STRATEGIES.find(s => s.value === watchValues.optimizationGoal)?.label || "Balanced"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Assets</p>
            <p className="font-medium">{watchValues.assets?.join(', ') || 'None selected'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Protocols</p>
            <p className="font-medium">
              {watchValues.protocols?.map(p => 
                PROTOCOLS.find(proto => proto.value === p)?.label
              ).join(', ') || 'None selected'}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Rebalancing</p>
            <p className="font-medium">Every {watchValues.rebalancingInterval} hours</p>
          </div>
        </div>
      </div>
    </div>
  );
}
