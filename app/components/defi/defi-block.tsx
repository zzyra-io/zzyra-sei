import { useState, useCallback, useEffect } from 'react';
import { DefiBlockType } from '@/types/defi-blocks';
import { LiquidityBlock } from './liquidity-block';
import { YieldBlock } from './yield-block';
import { PositionBlock } from './position-block';
import { RebalanceBlock } from './rebalance-block';

interface DefiBlockProps {
  type: DefiBlockType;
  config: Record<string, any>;
  onChange: (config: Record<string, any>) => void;
}

export const DefiBlock = ({ type, config, onChange }: DefiBlockProps) => {
  const [localConfig, setLocalConfig] = useState(config);

  // Memoize the change handler to prevent unnecessary re-renders
  const handleConfigChange = useCallback((field: string, value: any) => {
    const newConfig = {
      ...localConfig,
      [field]: value
    };
    setLocalConfig(newConfig);
    onChange(newConfig);
  }, [localConfig, onChange]);

  // Update local config when parent config changes
  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  return (
    <div className="p-4 border rounded-lg bg-background/80">
      <h3 className="text-lg font-semibold mb-4">{type}</h3>
      {renderBlockContent(type, localConfig, handleConfigChange)}
    </div>
  );
};

const renderBlockContent = (type: DefiBlockType, config: Record<string, any>, onChange: (field: string, value: any) => void) => {
  switch (type) {
    case DefiBlockType.LIQUIDITY_PROVIDER:
      return <LiquidityBlock config={config} onChange={onChange} />;
    case DefiBlockType.YIELD_STRATEGY:
      return <YieldBlock config={config} onChange={onChange} />;
    case DefiBlockType.POSITION_MANAGER:
      return <PositionBlock config={config} onChange={onChange} />;
    case DefiBlockType.REBALANCE_CALCULATOR:
      return <RebalanceBlock config={config} onChange={onChange} />;
    default:
      return <div>Unsupported block type: {type}</div>;
  }
};
