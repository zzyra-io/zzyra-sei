import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

interface YieldBlockProps {
  config: any;
  onChange: (field: string, value: any) => void;
}

export const YieldBlock = ({ config, onChange }: YieldBlockProps) => {
  const [protocol, setProtocol] = useState(config.protocol || 'AAVE');
  const [asset, setAsset] = useState(config.asset || '');
  const [amount, setAmount] = useState(config.amount || '');
  const [strategy, setStrategy] = useState(config.strategy || 'COMPOUND');
  const [autoCompound, setAutoCompound] = useState(config.autoCompound || false);

  const protocols = [
    { value: 'AAVE', label: 'Aave' },
    { value: 'COMPOUND', label: 'Compound' },
    { value: 'YIELD', label: 'Yearn' },
    { value: 'CURVE', label: 'Curve' }
  ];

  const strategies = [
    { value: 'COMPOUND', label: 'Compound Interest' },
    { value: 'REINVEST', label: 'Reinvest Rewards' },
    { value: 'DCA', label: 'Dollar-Cost Averaging' }
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
        <Label htmlFor="asset">Asset</Label>
        <Input
          id="asset"
          value={asset}
          onChange={(e) => {
            setAsset(e.target.value);
            onChange('asset', e.target.value);
          }}
          placeholder="Enter asset address"
        />
      </div>

      <div>
        <Label htmlFor="amount">Amount</Label>
        <Input
          id="amount"
          type="number"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            onChange('amount', e.target.value);
          }}
          placeholder="Enter amount"
        />
      </div>

      <div>
        <Label htmlFor="strategy">Strategy</Label>
        <Select
          id="strategy"
          value={strategy}
          onChange={(e) => {
            setStrategy(e.target.value);
            onChange('strategy', e.target.value);
          }}
        >
          {strategies.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="autoCompound"
          checked={autoCompound}
          onCheckedChange={(checked) => {
            setAutoCompound(checked);
            onChange('autoCompound', checked);
          }}
        />
        <Label htmlFor="autoCompound">Auto Compound Rewards</Label>
      </div>
    </div>
  );
};
