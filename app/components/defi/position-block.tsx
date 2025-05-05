import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

interface PositionBlockProps {
  config: any;
  onChange: (field: string, value: any) => void;
}

export const PositionBlock = ({ config, onChange }: PositionBlockProps) => {
  const [protocol, setProtocol] = useState(config.protocol || 'UNISWAP');
  const [positionId, setPositionId] = useState(config.positionId || '');
  const [threshold, setThreshold] = useState(config.threshold || '0.05');
  const [monitorInterval, setMonitorInterval] = useState(config.monitorInterval || '3600');
  const [alertThreshold, setAlertThreshold] = useState(config.alertThreshold || '0.1');

  const protocols = [
    { value: 'UNISWAP', label: 'Uniswap' },
    { value: 'SUSHISWAP', label: 'SushiSwap' },
    { value: 'BALANCER', label: 'Balancer' },
    { value: 'CURVE', label: 'Curve' }
  ];

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="protocol">Protocol</Label>
        <Select
          id="protocol"
          value={protocol}
          onChange={(e) => {
            setProtocol(e.target.value);
            onChange('protocol', e.target.value);
          }}
        >
          {protocols.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label htmlFor="positionId">Position ID</Label>
        <Input
          id="positionId"
          value={positionId}
          onChange={(e) => {
            setPositionId(e.target.value);
            onChange('positionId', e.target.value);
          }}
          placeholder="Enter position ID"
        />
      </div>

      <div>
        <Label htmlFor="threshold">Health Threshold</Label>
        <Input
          id="threshold"
          type="number"
          step="0.01"
          value={threshold}
          onChange={(e) => {
            setThreshold(e.target.value);
            onChange('threshold', e.target.value);
          }}
          placeholder="Enter health threshold"
        />
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

      <div>
        <Label htmlFor="alertThreshold">Alert Threshold</Label>
        <Input
          id="alertThreshold"
          type="number"
          step="0.01"
          value={alertThreshold}
          onChange={(e) => {
            setAlertThreshold(e.target.value);
            onChange('alertThreshold', e.target.value);
          }}
          placeholder="Enter alert threshold"
        />
      </div>
    </div>
  );
};
