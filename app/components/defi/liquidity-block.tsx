import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

interface LiquidityBlockProps {
  config: any;
  onChange: (field: string, value: any) => void;
}

export const LiquidityBlock = ({ config, onChange }: LiquidityBlockProps) => {
  const [protocol, setProtocol] = useState(config.protocol || 'UNISWAP');
  const [tokenA, setTokenA] = useState(config.tokenA || '');
  const [tokenB, setTokenB] = useState(config.tokenB || '');
  const [amount, setAmount] = useState(config.amount || '');
  const [slippage, setSlippage] = useState(config.slippage || '0.5');

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
        <Label htmlFor="tokenA">Token A</Label>
        <Input
          id="tokenA"
          value={tokenA}
          onChange={(e) => {
            setTokenA(e.target.value);
            onChange('tokenA', e.target.value);
          }}
          placeholder="Enter token address"
        />
      </div>

      <div>
        <Label htmlFor="tokenB">Token B</Label>
        <Input
          id="tokenB"
          value={tokenB}
          onChange={(e) => {
            setTokenB(e.target.value);
            onChange('tokenB', e.target.value);
          }}
          placeholder="Enter token address"
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
    </div>
  );
};
