"use client";

import { useState, useEffect } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Info } from "lucide-react";
import { fetchCryptoPrice } from "@/lib/services/price-service";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Remove the circular dependency - don't self-register
// import blockConfigRegistry from "@/lib/block-config-registry";
// blockConfigRegistry.register("PRICE_MONITOR", PriceMonitorConfig);

interface PriceMonitorConfigProps {
  config: any;
  onChange: (config: any) => void;
}

export function PriceMonitorConfig({
  config,
  onChange,
}: PriceMonitorConfigProps) {
  const [activeTab, setActiveTab] = useState("basic");
  const [showAdvancedWarning, setShowAdvancedWarning] = useState(false);

  // --- Current Price State ---
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);

  // Fetch price when asset changes
  useEffect(() => {
    let cancelled = false;
    async function fetchPrice() {
      setPriceLoading(true);
      setPriceError(null);
      setCurrentPrice(null);
      try {
        const asset = config.asset || "ETHEREUM";
        const { price } = await fetchCryptoPrice(asset);
        if (!cancelled) setCurrentPrice(price);
      } catch (err: any) {
        if (!cancelled) setPriceError(err.message || "Failed to fetch price");
      } finally {
        if (!cancelled) setPriceLoading(false);
      }
    }
    fetchPrice();
    return () => {
      cancelled = true;
    };
  }, [config.asset]);

  // Initialize with defaults if values are missing
  useEffect(() => {
    const defaults = {
      asset: config.asset || "ETHEREUM",
      condition: config.condition || "above",
      targetPrice: config.targetPrice || "0",
      checkInterval: config.checkInterval || "5",
      dataSource: config.dataSource || "coingecko",
      notifyOnTrigger: config.notifyOnTrigger !== false,
      retryOnFailure: config.retryOnFailure !== false,
      maxRetries: config.maxRetries || "3",
      retryDelay: config.retryDelay || "30",
      historicalComparison: config.historicalComparison || "none",
      comparisonPeriod: config.comparisonPeriod || "24",
    };

    // Only update if there are missing values
    if (Object.keys(defaults).some((key) => config[key] === undefined)) {
      onChange({ ...config, ...defaults });
    }
  }, []);

  const handleChange = (key: string, value: any) => {
    onChange({ ...config, [key]: value });
  };

  const handleAdvancedTabClick = () => {
    if (!showAdvancedWarning) {
      setShowAdvancedWarning(true);
    }
    setActiveTab("advanced");
  };

  return (
    <div className='p-4 space-y-4'>
      {/* Current Price Display */}
      <div className='flex items-center gap-2 mb-2'>
        <span className='font-medium'>Current Price:</span>
        {priceLoading ? (
          <span className='text-muted-foreground animate-pulse'>
            Loading...
          </span>
        ) : priceError ? (
          <span className='text-destructive'>{priceError}</span>
        ) : currentPrice !== null ? (
          <span className='text-primary font-mono'>
            $
            {currentPrice.toLocaleString(undefined, {
              maximumFractionDigits: 6,
            })}
          </span>
        ) : (
          <span className='text-muted-foreground'>N/A</span>
        )}
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className='grid w-full grid-cols-2'>
          <TabsTrigger value='basic'>Basic</TabsTrigger>
          <TabsTrigger value='advanced' onClick={handleAdvancedTabClick}>
            Advanced
          </TabsTrigger>
        </TabsList>

        <TabsContent value='basic' className='space-y-4 pt-4'>
          <div className='space-y-2'>
            <Label htmlFor='asset'>Asset</Label>
            <Select
              value={config.asset || "ETHEREUM"}
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
                <SelectItem value='CARDANO'>Cardano (ADA)</SelectItem>
                <SelectItem value='DOGECOIN'>Dogecoin (DOGE)</SelectItem>
                <SelectItem value='POLYGON'>Polygon (MATIC)</SelectItem>
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
            <div className='flex items-center justify-between'>
              <Label htmlFor='checkInterval'>Check Interval (minutes)</Label>
              <span className='text-sm text-muted-foreground'>
                {config.checkInterval || "5"} min
              </span>
            </div>
            <Slider
              id='checkInterval'
              value={[Number(config.checkInterval || "5")]}
              min={1}
              max={60}
              step={1}
              onValueChange={(value) =>
                handleChange("checkInterval", value[0].toString())
              }
            />
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

          <div className='flex items-center space-x-2 pt-2'>
            <Switch
              id='notifyOnTrigger'
              checked={config.notifyOnTrigger !== false}
              onCheckedChange={(checked) =>
                handleChange("notifyOnTrigger", checked)
              }
            />
            <Label htmlFor='notifyOnTrigger'>Notify when triggered</Label>
          </div>
        </TabsContent>

        <TabsContent value='advanced' className='space-y-4 pt-4'>
          {showAdvancedWarning && (
            <Alert variant='warning' className='mb-4'>
              <AlertCircle className='h-4 w-4' />
              <AlertDescription>
                Advanced settings may affect workflow performance and
                reliability.
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardContent className='pt-6 space-y-4'>
              <div className='space-y-2'>
                <div className='flex items-center gap-2'>
                  <Label htmlFor='retryOnFailure'>Retry on failure</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className='h-4 w-4 text-muted-foreground' />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className='w-[200px]'>
                          Automatically retry if the price check fails
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className='flex items-center space-x-2'>
                  <Switch
                    id='retryOnFailure'
                    checked={config.retryOnFailure !== false}
                    onCheckedChange={(checked) =>
                      handleChange("retryOnFailure", checked)
                    }
                  />
                  <Label htmlFor='retryOnFailure'>Enable retries</Label>
                </div>
              </div>

              {config.retryOnFailure !== false && (
                <>
                  <div className='space-y-2'>
                    <Label htmlFor='maxRetries'>Maximum retries</Label>
                    <Input
                      id='maxRetries'
                      type='number'
                      value={config.maxRetries || "3"}
                      onChange={(e) =>
                        handleChange("maxRetries", e.target.value)
                      }
                      min='1'
                      max='10'
                    />
                  </div>

                  <div className='space-y-2'>
                    <Label htmlFor='retryDelay'>Retry delay (seconds)</Label>
                    <Input
                      id='retryDelay'
                      type='number'
                      value={config.retryDelay || "30"}
                      onChange={(e) =>
                        handleChange("retryDelay", e.target.value)
                      }
                      min='5'
                      max='300'
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className='pt-6 space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='historicalComparison'>
                  Historical comparison
                </Label>
                <Select
                  value={config.historicalComparison || "none"}
                  onValueChange={(value) =>
                    handleChange("historicalComparison", value)
                  }>
                  <SelectTrigger id='historicalComparison'>
                    <SelectValue placeholder='Select comparison type' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='none'>None</SelectItem>
                    <SelectItem value='24h'>24-hour change</SelectItem>
                    <SelectItem value='7d'>7-day change</SelectItem>
                    <SelectItem value='30d'>30-day change</SelectItem>
                    <SelectItem value='custom'>Custom period</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {config.historicalComparison === "custom" && (
                <div className='space-y-2'>
                  <Label htmlFor='comparisonPeriod'>
                    Comparison period (hours)
                  </Label>
                  <Input
                    id='comparisonPeriod'
                    type='number'
                    value={config.comparisonPeriod || "24"}
                    onChange={(e) =>
                      handleChange("comparisonPeriod", e.target.value)
                    }
                    min='1'
                    max='720'
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
