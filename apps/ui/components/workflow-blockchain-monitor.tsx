"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Globe,
  Zap,
  Settings,
  Play,
  Pause,
  RefreshCw,
  Database,
  Eye,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ChainConfig {
  chainId: string;
  name: string;
  rpcUrl: string;
  enabled: boolean;
}

interface EventFilter {
  contractAddress: string;
  eventName: string;
  enabled: boolean;
  lastProcessed?: string;
}

interface TransactionFilter {
  address: string;
  direction: 'incoming' | 'outgoing' | 'both';
  minValue?: string;
  enabled: boolean;
}

interface PriceMonitor {
  asset: string;
  symbol: string;
  condition: 'above' | 'below' | 'change';
  threshold: number;
  enabled: boolean;
  currentPrice?: number;
  lastTriggered?: string;
}

interface WorkflowBlockchainMonitorProps {
  workflowId?: string;
  nodeId?: string;
  onEventDetected?: (event: any) => void;
  onTransactionDetected?: (transaction: any) => void;
  onPriceAlert?: (alert: any) => void;
  isExecuting?: boolean;
}

export function WorkflowBlockchainMonitor({
  workflowId,
  nodeId,
  onEventDetected,
  onTransactionDetected,
  onPriceAlert,
  isExecuting = false,
}: WorkflowBlockchainMonitorProps) {
  const [isMonitoringActive, setIsMonitoringActive] = useState(false);
  const [selectedChain, setSelectedChain] = useState("1");
  const [monitoringStats, setMonitoringStats] = useState({
    eventsProcessed: 0,
    transactionsTracked: 0,
    priceAlertsTriggered: 0,
    lastUpdate: new Date(),
  });

  const [chainConfigs, setChainConfigs] = useState<ChainConfig[]>([
    {
      chainId: "1",
      name: "Ethereum Mainnet",
      rpcUrl: "https://mainnet.infura.io/v3/...",
      enabled: true,
    },
    {
      chainId: "137",
      name: "Polygon",
      rpcUrl: "https://polygon-mainnet.infura.io/v3/...",
      enabled: false,
    },
    {
      chainId: "56",
      name: "BSC",
      rpcUrl: "https://bsc-dataseed.binance.org/",
      enabled: false,
    },
  ]);

  const [eventFilters, setEventFilters] = useState<EventFilter[]>([
    {
      contractAddress: "0xA0b86a33E6441e8DE2f3DAbE96EbC86f8E0C40cE",
      eventName: "Transfer",
      enabled: true,
      lastProcessed: new Date().toISOString(),
    },
  ]);

  const [transactionFilters, setTransactionFilters] = useState<TransactionFilter[]>([
    {
      address: "0x123...abc",
      direction: "both",
      minValue: "0.1",
      enabled: true,
    },
  ]);

  const [priceMonitors, setPriceMonitors] = useState<PriceMonitor[]>([
    {
      asset: "ethereum",
      symbol: "ETH",
      condition: "above",
      threshold: 2500,
      enabled: true,
      currentPrice: 2340.50,
    },
  ]);

  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  // Simulate monitoring activity
  useEffect(() => {
    if (!isMonitoringActive) return;

    const interval = setInterval(() => {
      // Simulate event detection
      if (Math.random() > 0.8 && eventFilters.some(f => f.enabled)) {
        const event = {
          type: 'blockchain_event',
          contractAddress: eventFilters[0].contractAddress,
          eventName: eventFilters[0].eventName,
          data: {
            blockNumber: Math.floor(Math.random() * 1000000) + 18500000,
            transactionHash: `0x${Math.random().toString(16).substring(2, 66)}`,
            timestamp: new Date().toISOString(),
          },
        };
        
        setRecentActivity(prev => [event, ...prev.slice(0, 9)]);
        setMonitoringStats(prev => ({
          ...prev,
          eventsProcessed: prev.eventsProcessed + 1,
          lastUpdate: new Date(),
        }));
        
        onEventDetected?.(event);
      }

      // Simulate transaction detection
      if (Math.random() > 0.9 && transactionFilters.some(f => f.enabled)) {
        const transaction = {
          type: 'transaction',
          hash: `0x${Math.random().toString(16).substring(2, 66)}`,
          from: transactionFilters[0].address,
          to: `0x${Math.random().toString(16).substring(2, 42)}`,
          value: (Math.random() * 10).toFixed(4),
          timestamp: new Date().toISOString(),
        };
        
        setRecentActivity(prev => [transaction, ...prev.slice(0, 9)]);
        setMonitoringStats(prev => ({
          ...prev,
          transactionsTracked: prev.transactionsTracked + 1,
          lastUpdate: new Date(),
        }));
        
        onTransactionDetected?.(transaction);
      }

      // Simulate price alerts
      if (Math.random() > 0.95 && priceMonitors.some(p => p.enabled)) {
        const priceChange = (Math.random() - 0.5) * 0.02;
        setPriceMonitors(prev => prev.map(monitor => {
          const newPrice = monitor.currentPrice! * (1 + priceChange);
          const shouldTrigger = 
            (monitor.condition === 'above' && newPrice > monitor.threshold) ||
            (monitor.condition === 'below' && newPrice < monitor.threshold);
          
          if (shouldTrigger && monitor.enabled) {
            const alert = {
              type: 'price_alert',
              asset: monitor.asset,
              symbol: monitor.symbol,
              condition: monitor.condition,
              threshold: monitor.threshold,
              currentPrice: newPrice,
              timestamp: new Date().toISOString(),
            };
            
            setRecentActivity(prev => [alert, ...prev.slice(0, 9)]);
            setMonitoringStats(prev => ({
              ...prev,
              priceAlertsTriggered: prev.priceAlertsTriggered + 1,
              lastUpdate: new Date(),
            }));
            
            onPriceAlert?.(alert);
          }
          
          return {
            ...monitor,
            currentPrice: newPrice,
            lastTriggered: shouldTrigger ? new Date().toISOString() : monitor.lastTriggered,
          };
        }));
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isMonitoringActive, eventFilters, transactionFilters, priceMonitors, onEventDetected, onTransactionDetected, onPriceAlert]);

  const addEventFilter = () => {
    setEventFilters(prev => [...prev, {
      contractAddress: "",
      eventName: "",
      enabled: false,
    }]);
  };

  const updateEventFilter = (index: number, updates: Partial<EventFilter>) => {
    setEventFilters(prev => prev.map((filter, i) => 
      i === index ? { ...filter, ...updates } : filter
    ));
  };

  const removeEventFilter = (index: number) => {
    setEventFilters(prev => prev.filter((_, i) => i !== index));
  };

  const addTransactionFilter = () => {
    setTransactionFilters(prev => [...prev, {
      address: "",
      direction: "both",
      enabled: false,
    }]);
  };

  const updateTransactionFilter = (index: number, updates: Partial<TransactionFilter>) => {
    setTransactionFilters(prev => prev.map((filter, i) => 
      i === index ? { ...filter, ...updates } : filter
    ));
  };

  const removeTransactionFilter = (index: number) => {
    setTransactionFilters(prev => prev.filter((_, i) => i !== index));
  };

  const addPriceMonitor = () => {
    setPriceMonitors(prev => [...prev, {
      asset: "",
      symbol: "",
      condition: "above",
      threshold: 0,
      enabled: false,
    }]);
  };

  const updatePriceMonitor = (index: number, updates: Partial<PriceMonitor>) => {
    setPriceMonitors(prev => prev.map((monitor, i) => 
      i === index ? { ...monitor, ...updates } : monitor
    ));
  };

  const removePriceMonitor = (index: number) => {
    setPriceMonitors(prev => prev.filter((_, i) => i !== index));
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'blockchain_event':
        return <Database className="w-4 h-4 text-blue-600" />;
      case 'transaction':
        return <Activity className="w-4 h-4 text-green-600" />;
      case 'price_alert':
        return <Zap className="w-4 h-4 text-yellow-600" />;
      default:
        return <Globe className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Globe className="w-5 h-5" />
              <CardTitle>Blockchain Monitor</CardTitle>
              <Badge variant={isMonitoringActive ? "default" : "secondary"}>
                {isMonitoringActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div className="flex items-center space-x-2">
              <Label htmlFor="monitoring-toggle" className="text-sm">
                Enable Monitoring
              </Label>
              <Switch
                id="monitoring-toggle"
                checked={isMonitoringActive}
                onCheckedChange={setIsMonitoringActive}
                disabled={isExecuting}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {monitoringStats.eventsProcessed}
              </div>
              <div className="text-xs text-muted-foreground">Events</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {monitoringStats.transactionsTracked}
              </div>
              <div className="text-xs text-muted-foreground">Transactions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {monitoringStats.priceAlertsTriggered}
              </div>
              <div className="text-xs text-muted-foreground">Price Alerts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {chainConfigs.filter(c => c.enabled).length}
              </div>
              <div className="text-xs text-muted-foreground">Chains</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration */}
        <div className="space-y-4">
          {/* Chain Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Blockchain Networks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {chainConfigs.map((chain, index) => (
                <div key={chain.chainId} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={chain.enabled}
                      onCheckedChange={(enabled) => {
                        setChainConfigs(prev => prev.map((c, i) => 
                          i === index ? { ...c, enabled } : c
                        ));
                      }}
                    />
                    <span className="text-sm font-medium">{chain.name}</span>
                  </div>
                  <Badge variant={chain.enabled ? "default" : "outline"} className="text-xs">
                    ID: {chain.chainId}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Event Filters */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Event Filters</CardTitle>
                <Button size="sm" variant="outline" onClick={addEventFilter}>
                  Add Filter
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-32">
                <div className="space-y-3">
                  {eventFilters.map((filter, index) => (
                    <div key={index} className="p-3 border rounded space-y-2">
                      <div className="flex items-center justify-between">
                        <Switch
                          checked={filter.enabled}
                          onCheckedChange={(enabled) => updateEventFilter(index, { enabled })}
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeEventFilter(index)}
                        >
                          Remove
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Contract Address"
                          value={filter.contractAddress}
                          onChange={(e) => updateEventFilter(index, { contractAddress: e.target.value })}
                          className="text-xs"
                        />
                        <Input
                          placeholder="Event Name"
                          value={filter.eventName}
                          onChange={(e) => updateEventFilter(index, { eventName: e.target.value })}
                          className="text-xs"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Price Monitors */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Price Monitors</CardTitle>
                <Button size="sm" variant="outline" onClick={addPriceMonitor}>
                  Add Monitor
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-32">
                <div className="space-y-3">
                  {priceMonitors.map((monitor, index) => (
                    <div key={index} className="p-3 border rounded space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={monitor.enabled}
                            onCheckedChange={(enabled) => updatePriceMonitor(index, { enabled })}
                          />
                          <span className="text-xs font-medium">{monitor.symbol || 'Asset'}</span>
                          {monitor.currentPrice && (
                            <Badge variant="outline" className="text-xs">
                              ${monitor.currentPrice.toFixed(2)}
                            </Badge>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removePriceMonitor(index)}
                        >
                          Remove
                        </Button>
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                        <Input
                          placeholder="Symbol"
                          value={monitor.symbol}
                          onChange={(e) => updatePriceMonitor(index, { symbol: e.target.value })}
                          className="text-xs"
                        />
                        <Select
                          value={monitor.condition}
                          onValueChange={(condition: 'above' | 'below' | 'change') => 
                            updatePriceMonitor(index, { condition })}
                        >
                          <SelectTrigger className="text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="above">Above</SelectItem>
                            <SelectItem value="below">Below</SelectItem>
                            <SelectItem value="change">Change</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          placeholder="Threshold"
                          value={monitor.threshold}
                          onChange={(e) => updatePriceMonitor(index, { threshold: parseFloat(e.target.value) || 0 })}
                          className="text-xs"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Activity Monitor */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Recent Activity</CardTitle>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-xs">
                  Last: {monitoringStats.lastUpdate.toLocaleTimeString()}
                </Badge>
                {isMonitoringActive && (
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Activity className="w-4 h-4 text-green-600" />
                  </motion.div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-80">
              <div className="space-y-3">
                <AnimatePresence>
                  {recentActivity.length > 0 ? (
                    recentActivity.map((activity, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="flex items-center space-x-3 p-3 border rounded-lg bg-gray-50"
                      >
                        {getActivityIcon(activity.type)}
                        <div className="flex-1 min-w-0">
                          {activity.type === 'blockchain_event' && (
                            <>
                              <p className="text-sm font-medium">Event: {activity.eventName}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {activity.contractAddress}
                              </p>
                            </>
                          )}
                          {activity.type === 'transaction' && (
                            <>
                              <p className="text-sm font-medium">Transaction: {activity.value} ETH</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {activity.hash}
                              </p>
                            </>
                          )}
                          {activity.type === 'price_alert' && (
                            <>
                              <p className="text-sm font-medium">
                                {activity.symbol} {activity.condition} ${activity.threshold}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Current: ${activity.currentPrice.toFixed(2)}
                              </p>
                            </>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {new Date(activity.timestamp || activity.data?.timestamp).toLocaleTimeString()}
                        </Badge>
                      </motion.div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No activity detected yet</p>
                      <p className="text-xs">Enable monitoring to start tracking events</p>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Status Alerts */}
      {!isMonitoringActive && !isExecuting && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Blockchain monitoring is currently disabled. Enable monitoring to start detecting events, transactions, and price changes.
          </AlertDescription>
        </Alert>
      )}

      {isExecuting && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            This monitor is currently being used in a workflow execution. Configuration changes are temporarily disabled.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}