import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

interface RebalanceBlockProps {
  config: any;
  onChange: (field: string, value: any) => void;
}

export const RebalanceBlock = ({ config, onChange }: RebalanceBlockProps) => {
  const [assets, setAssets] = useState(config.assets || []);
  const [threshold, setThreshold] = useState(config.threshold || '0.05');
  const [slippage, setSlippage] = useState(config.slippage || '0.5');
  const [autoRebalance, setAutoRebalance] = useState(config.autoRebalance || false);
  const [monitorInterval, setMonitorInterval] = useState(config.monitorInterval || '3600');

  const handleAssetChange = (index: number, field: string, value: string) => {
    const newAssets = [...assets];
    newAssets[index] = {
      ...newAssets[index],
      [field]: value
    };
    setAssets(newAssets);
    onChange('assets', newAssets);
  };

  const handleAddAsset = () => {
    setAssets([...assets, { address: '', weight: '0' }]);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        {assets.map((asset, index) => (
          <div key={index} className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor={`asset-${index}`}>Asset {index + 1}</Label>
              <Input
                id={`asset-${index}`}
                value={asset.address}
                onChange={(e) => handleAssetChange(index, 'address', e.target.value)}
                placeholder="Enter asset address"
              />
            </div>
            <div className="flex-1">
              <Label htmlFor={`weight-${index}`}>Weight (%)</Label>
              <Input
                id={`weight-${index}`}
                type="number"
                value={asset.weight}
                onChange={(e) => handleAssetChange(index, 'weight', e.target.value)}
                placeholder="Enter weight"
              />
            </div>
            {index > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  const newAssets = [...assets];
                  newAssets.splice(index, 1);
                  setAssets(newAssets);
                  onChange('assets', newAssets);
                }}
              >
                Remove
              </Button>
            )}
          </div>
        ))}
        <Button
          variant="outline"
          onClick={handleAddAsset}
        >
          Add Asset
        </Button>
      </div>

      <div>
        <Label htmlFor="threshold">Threshold</Label>
        <Input
          id="threshold"
          type="number"
          step="0.01"
          value={threshold}
          onChange={(e) => {
            setThreshold(e.target.value);
            onChange('threshold', e.target.value);
          }}
          placeholder="Enter threshold"
        />
      </div>

      <div>
        <Label htmlFor="slippage">Slippage</Label>
        <Input
          id="slippage"
          type="number"
          value={slippage}
          onChange={(e) => {
            setSlippage(e.target.value);
            onChange('slippage', e.target.value);
          }}
          placeholder="Enter slippage percentage"
        />
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="autoRebalance"
          checked={autoRebalance}
          onCheckedChange={(checked) => {
            setAutoRebalance(checked);
            onChange('autoRebalance', checked);
          }}
        />
        <Label htmlFor="autoRebalance">Auto Rebalance</Label>
      </div>

      <div>
        <Label htmlFor="monitorInterval">Monitor Interval (seconds)</Label>
        <Input
          id="monitorInterval"
          type="number"
          value={monitorInterval}
          onChange={(e) => {
            setMonitorInterval(e.target.value);
            onChange('monitorInterval', e.target.value);
          }}
          placeholder="Enter monitor interval"
        />
      </div>
    </div>
  );
};
