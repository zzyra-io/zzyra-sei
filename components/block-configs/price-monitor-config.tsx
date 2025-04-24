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
import { Slider } from "@/components/ui/slider";

interface PriceMonitorConfigProps {
  config: any;
  onChange: (config: any) => void;
}

export function PriceMonitorConfig({
  config,
  onChange,
}: PriceMonitorConfigProps) {
  const handleChange = (key: string, value: any) => {
    onChange({ ...config, [key]: value });
  };

  return (
    <div className='p-4 space-y-4'>
      <div className='space-y-2'>
        <Label htmlFor='asset'>Asset</Label>
        <Select
          value={config.asset || "ETH"}
          onValueChange={(value) => handleChange("asset", value)}>
          <SelectTrigger id='asset'>
            <SelectValue placeholder='Select asset' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='ETHEREUM'>Ethereum (ETH)</SelectItem>
            <SelectItem value='BITCOIN'>Bitcoin (BTC)</SelectItem>
            <SelectItem value='SOLANA'>Solana (SOL)</SelectItem>
            <SelectItem value='USDC'>USD Coin (USDC)</SelectItem>
            <SelectItem value='TETHER'>Tether (USDT)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className='space-y-2'>
        <Label htmlFor='condition'>Condition</Label>
        <Select
          value={config.condition || "above"}
          onValueChange={(value) => handleChange("condition", value)}>
          <SelectTrigger id='condition'>
            <SelectValue placeholder='Select condition' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='above'>Price Above</SelectItem>
            <SelectItem value='below'>Price Below</SelectItem>
            <SelectItem value='equal'>Price Equal</SelectItem>
            <SelectItem value='change'>Price Change %</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className='space-y-2'>
        <Label htmlFor='targetPrice'>
          {config.condition === "change"
            ? "Change Percentage (%)"
            : "Target Price ($)"}
        </Label>
        <Input
          id='targetPrice'
          type='number'
          value={config.targetPrice || "0"}
          onChange={(e) => handleChange("targetPrice", e.target.value)}
          step={config.condition === "change" ? "0.1" : "100"}
          min='0'
        />
      </div>

      <div className='space-y-2'>
        <Label htmlFor='checkInterval'>Check Interval (minutes)</Label>
        <div className='flex items-center space-x-2'>
          <Slider
            id='checkInterval'
            value={[Number.parseInt(config.checkInterval || "5")]}
            min={1}
            max={60}
            step={1}
            onValueChange={(value) =>
              handleChange("checkInterval", value[0].toString())
            }
          />
          <span className='w-12 text-center'>
            {config.checkInterval || "5"}
          </span>
        </div>
      </div>

      <div className='space-y-2'>
        <Label htmlFor='dataSource'>Data Source</Label>
        <Select
          value={config.dataSource || "coingecko"}
          onValueChange={(value) => handleChange("dataSource", value)}>
          <SelectTrigger id='dataSource'>
            <SelectValue placeholder='Select data source' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='coingecko'>CoinGecko</SelectItem>
            <SelectItem value='coinmarketcap'>CoinMarketCap</SelectItem>
            <SelectItem value='binance'>Binance</SelectItem>
            <SelectItem value='uniswap'>Uniswap</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
