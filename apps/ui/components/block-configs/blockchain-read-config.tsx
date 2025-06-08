import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAccount, useChains } from "wagmi";
import { supportedNetworks } from "@/lib/utils/network";

interface BlockchainReadConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export function BlockchainReadConfig({
  config,
  onChange,
}: BlockchainReadConfigProps) {
  const handleChange = (field: string, value: unknown) => {
    onChange({ ...config, [field]: value });
  };

  const account = useAccount();
  const chains = useChains();
  console.log("account", account);

  return (
    <div className='w-80 h-full flex flex-col bg-background border-l'>
      <div className='flex items-center justify-between p-4 border-b'>
        <h3 className='font-medium'>Blockchain Read Configuration</h3>
      </div>

      <div className='flex-1 overflow-y-auto p-4 space-y-4'>
        {/* Operation Type */}
        <div className='space-y-2'>
          <Label htmlFor='operation'>Operation</Label>
          <Select
            value={(config.operation as string) || "get_balance"}
            onValueChange={(value) => handleChange("operation", value)}>
            <SelectTrigger>
              <SelectValue placeholder='Select operation' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='get_balance'>Get Balance</SelectItem>
              <SelectItem value='get_token_balance'>
                Get Token Balance
              </SelectItem>
              <SelectItem value='get_token_info'>Get Token Info</SelectItem>
              <SelectItem value='get_nft_balance'>Get NFT Balance</SelectItem>
              <SelectItem value='get_transaction'>Get Transaction</SelectItem>
              <SelectItem value='get_transaction_receipt'>
                Get Transaction Receipt
              </SelectItem>
              <SelectItem value='get_block'>Get Block</SelectItem>
              <SelectItem value='get_logs'>Get Logs</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Network */}
        <div className='space-y-2'>
          <Label htmlFor='network'>Network</Label>
          <Select
            value={(config.network as string) || chains[0].id.toString()}
            onValueChange={(value) => handleChange("network", value)}>
            <SelectTrigger>
              <SelectValue placeholder='Select network' />
            </SelectTrigger>
            <SelectContent>
              {chains.map((network: any) => (
                <SelectItem key={network.id} value={network.id}>
                  {network.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Address */}

        <div className='space-y-2'>
          <Label htmlFor='address'>Address</Label>
          <Input
            id='address'
            placeholder='0x742d35Cc6634C0532925a3b8D0A48b9e12C4f2E0 or {{walletAddress}}'
            value={
              (account.address ? account.address : "") ||
              (config.address as string)
            }
            onChange={(e) => handleChange("address", e.target.value)}
          />
          <p className='text-xs text-muted-foreground'>
            Wallet address or contract address. Use {`{{variable}}`} for
            template variables.
          </p>
        </div>

        {/* Token Address (for token operations) */}
        {((config.operation as string) === "get_token_balance" ||
          (config.operation as string) === "get_token_info") && (
          <div className='space-y-2'>
            <Label htmlFor='tokenAddress'>Token Address</Label>
            <Input
              id='tokenAddress'
              placeholder='0xA0b86a33E6eF6e5c21D5F84C2Bf07a9A3d8C1234'
              value={(config.tokenAddress as string) || ""}
              onChange={(e) => handleChange("tokenAddress", e.target.value)}
            />
            <p className='text-xs text-muted-foreground'>
              Contract address of the ERC-20 token
            </p>
          </div>
        )}

        {/* Token ID (for NFT operations) */}
        {(config.operation as string) === "get_nft_balance" && (
          <div className='space-y-2'>
            <Label htmlFor='tokenId'>Token ID (optional)</Label>
            <Input
              id='tokenId'
              placeholder='123'
              value={(config.tokenId as string) || ""}
              onChange={(e) => handleChange("tokenId", e.target.value)}
            />
            <p className='text-xs text-muted-foreground'>
              Specific NFT token ID (leave empty for collection balance)
            </p>
          </div>
        )}

        {/* Transaction Hash (for transaction operations) */}
        {((config.operation as string) === "get_transaction" ||
          (config.operation as string) === "get_transaction_receipt") && (
          <div className='space-y-2'>
            <Label htmlFor='txHash'>Transaction Hash</Label>
            <Input
              id='txHash'
              placeholder='0x123...abc or {{transactionHash}}'
              value={(config.txHash as string) || ""}
              onChange={(e) => handleChange("txHash", e.target.value)}
            />
            <p className='text-xs text-muted-foreground'>
              Transaction hash to look up
            </p>
          </div>
        )}

        {/* Block Number/Hash (for block operations) */}
        {(config.operation as string) === "get_block" && (
          <div className='space-y-2'>
            <Label htmlFor='blockNumber'>Block Number/Hash</Label>
            <Input
              id='blockNumber'
              placeholder='latest, 12345678, or 0x123...abc'
              value={(config.blockNumber as string) || ""}
              onChange={(e) => handleChange("blockNumber", e.target.value)}
            />
            <p className='text-xs text-muted-foreground'>
              Block number, hash, or latest
            </p>
          </div>
        )}

        {/* Advanced Settings */}
        <Card>
          <CardHeader className='pb-3'>
            <CardTitle className='text-sm'>Advanced Settings</CardTitle>
          </CardHeader>
          <CardContent className='space-y-3'>
            <div className='space-y-2'>
              <Label htmlFor='retries' className='text-xs'>
                Retries
              </Label>
              <Input
                id='retries'
                type='number'
                min='0'
                max='10'
                value={(config.retries as number) || 3}
                onChange={(e) =>
                  handleChange("retries", parseInt(e.target.value) || 3)
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Examples Card */}
        <Card>
          <CardHeader className='pb-3'>
            <CardTitle className='text-sm'>Examples</CardTitle>
          </CardHeader>
          <CardContent className='space-y-2'>
            <div className='text-xs space-y-1'>
              <div>
                <strong>ETH Balance:</strong> address = {`{{walletAddress}}`}
              </div>
              <div>
                <strong>USDC Balance:</strong> tokenAddress =
                0xA0b86a33E6eF6e5c21D5F84C2Bf07a9A3d8C1234
              </div>
              <div>
                <strong>Transaction:</strong> txHash = {`{{transactionHash}}`}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
