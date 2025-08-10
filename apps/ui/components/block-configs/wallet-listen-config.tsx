import React, { useState, useMemo, useEffect } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { X, Plus, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { walletListenerSchema } from "@zzyra/types";

const NETWORKS = [
  { value: "sei", label: "Sei" },
];

const EVENT_TYPES = [
  { value: "transfer", label: "Transfer" },
  { value: "swap", label: "Swap" },
  { value: "contractCall", label: "Contract Call" },
  { value: "nftMint", label: "NFT Mint" },
  { value: "nftTransfer", label: "NFT Transfer" },
];

interface WalletListenerConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

interface ValidationError {
  path: string[];
  message: string;
}

export function WalletListenerConfig({
  config,
  onChange,
}: WalletListenerConfigProps) {
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>(
    []
  );
  const [isValid, setIsValid] = useState(true);
  const [walletInput, setWalletInput] = useState("");

  // Schema-driven validation
  const validateConfig = useMemo(() => {
    return (configData: unknown) => {
      try {
        walletListenerSchema.configSchema.parse(configData);
        setValidationErrors([]);
        setIsValid(true);
        return true;
      } catch (error) {
        if (error instanceof z.ZodError) {
          const errors: ValidationError[] = error.errors.map((err) => ({
            path: err.path.map(String),
            message: err.message,
          }));
          setValidationErrors(errors);
          setIsValid(false);
        }
        return false;
      }
    };
  }, []);

  useEffect(() => {
    validateConfig(config);
  }, [config, validateConfig]);

  const getFieldError = (fieldName: string): string | undefined => {
    const error = validationErrors.find((err) => err.path.includes(fieldName));
    return error?.message;
  };

  const handleChange = (field: string, value: unknown) => {
    onChange({ ...config, [field]: value });
  };

  // Wallet address management
  const walletAddresses = (config.walletAddresses as string[]) || [];
  const addWalletAddress = () => {
    if (walletInput && !walletAddresses.includes(walletInput)) {
      handleChange("walletAddresses", [...walletAddresses, walletInput]);
      setWalletInput("");
    }
  };
  const removeWalletAddress = (address: string) => {
    handleChange(
      "walletAddresses",
      walletAddresses.filter((a) => a !== address)
    );
  };

  // Event types management
  const eventTypes = (config.eventTypes as string[]) || [];
  const toggleEventType = (type: string) => {
    if (eventTypes.includes(type)) {
      handleChange(
        "eventTypes",
        eventTypes.filter((t) => t !== type)
      );
    } else {
      handleChange("eventTypes", [...eventTypes, type]);
    }
  };

  return (
    <div className='space-y-6'>
      {/* Validation Alert */}
      {!isValid && (
        <Alert variant='destructive'>
          <AlertCircle className='h-4 w-4' />
          <AlertDescription>
            Please fix the configuration errors:
            <ul className='mt-2 list-disc list-inside'>
              {validationErrors.map((error, index) => (
                <li key={index}>{error.message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Network Selection */}
      <div className='space-y-2'>
        <Label htmlFor='network'>Network</Label>
        <Select
          value={(config.network as string) || "sei"}
          onValueChange={(value) => handleChange("network", value)}>
          <SelectTrigger id='network' className='h-11'>
            <SelectValue placeholder='Select network' />
          </SelectTrigger>
          <SelectContent>
            {NETWORKS.map((net) => (
              <SelectItem key={net.value} value={net.value}>
                {net.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {getFieldError("network") && (
          <div className='flex items-center space-x-2 text-sm text-red-500'>
            <AlertCircle className='h-4 w-4' />
            <span>{getFieldError("network")}</span>
          </div>
        )}
      </div>

      {/* Wallet Addresses */}
      <div className='space-y-2'>
        <Label htmlFor='walletAddresses'>Wallet Addresses</Label>
        <div className='flex space-x-2'>
          <Input
            id='walletAddresses'
            placeholder='Enter wallet address'
            value={walletInput}
            onChange={(e) => setWalletInput(e.target.value)}
            className='h-11'
          />
          <Button
            type='button'
            onClick={addWalletAddress}
            disabled={!walletInput}>
            <Plus className='h-4 w-4' />
          </Button>
        </div>
        <div className='flex flex-wrap gap-2 mt-2'>
          {walletAddresses.map((address) => (
            <Badge
              key={address}
              variant='secondary'
              className='flex items-center'>
              <span className='mr-2'>{address}</span>
              <Button
                type='button'
                size='icon'
                variant='ghost'
                onClick={() => removeWalletAddress(address)}
                className='h-4 w-4 p-0'>
                <X className='h-3 w-3' />
              </Button>
            </Badge>
          ))}
        </div>
        {getFieldError("walletAddresses") && (
          <div className='flex items-center space-x-2 text-sm text-red-500'>
            <AlertCircle className='h-4 w-4' />
            <span>{getFieldError("walletAddresses")}</span>
          </div>
        )}
      </div>

      {/* Event Types */}
      <div className='space-y-2'>
        <Label>Event Types</Label>
        <div className='flex flex-wrap gap-2'>
          {EVENT_TYPES.map((et) => (
            <Button
              key={et.value}
              type='button'
              variant={eventTypes.includes(et.value) ? "default" : "outline"}
              onClick={() => toggleEventType(et.value)}
              className={cn(
                "h-8 px-3",
                eventTypes.includes(et.value) && "bg-primary text-white"
              )}>
              {et.label}
            </Button>
          ))}
        </div>
        {getFieldError("eventTypes") && (
          <div className='flex items-center space-x-2 text-sm text-red-500'>
            <AlertCircle className='h-4 w-4' />
            <span>{getFieldError("eventTypes")}</span>
          </div>
        )}
      </div>

      {/* Min Amount */}
      <div className='space-y-2'>
        <Label htmlFor='minAmount'>Minimum Amount (optional)</Label>
        <Input
          id='minAmount'
          type='number'
          placeholder='0'
          value={config.minAmount as number | ""}
          onChange={(e) =>
            handleChange(
              "minAmount",
              e.target.value ? Number(e.target.value) : undefined
            )
          }
          className='h-11'
        />
        {getFieldError("minAmount") && (
          <div className='flex items-center space-x-2 text-sm text-red-500'>
            <AlertCircle className='h-4 w-4' />
            <span>{getFieldError("minAmount")}</span>
          </div>
        )}
      </div>

      {/* Token Denomination */}
      <div className='space-y-2'>
        <Label htmlFor='tokenDenom'>Token Denomination (optional)</Label>
        <Input
          id='tokenDenom'
          placeholder='e.g. usei, eth, usdc'
          value={(config.tokenDenom as string) || ""}
          onChange={(e) => handleChange("tokenDenom", e.target.value)}
          className='h-11'
        />
        {getFieldError("tokenDenom") && (
          <div className='flex items-center space-x-2 text-sm text-red-500'>
            <AlertCircle className='h-4 w-4' />
            <span>{getFieldError("tokenDenom")}</span>
          </div>
        )}
      </div>

      {/* Poll Interval */}
      <div className='space-y-2'>
        <Label htmlFor='pollInterval'>Poll Interval (seconds, optional)</Label>
        <Input
          id='pollInterval'
          type='number'
          placeholder='30'
          value={config.pollInterval as number | ""}
          onChange={(e) =>
            handleChange(
              "pollInterval",
              e.target.value ? Number(e.target.value) : undefined
            )
          }
          className='h-11'
        />
        {getFieldError("pollInterval") && (
          <div className='flex items-center space-x-2 text-sm text-red-500'>
            <AlertCircle className='h-4 w-4' />
            <span>{getFieldError("pollInterval")}</span>
          </div>
        )}
      </div>

      {/* Start Block */}
      <div className='space-y-2'>
        <Label htmlFor='startBlock'>Start Block (optional)</Label>
        <Input
          id='startBlock'
          type='number'
          placeholder='Block number'
          value={config.startBlock as number | ""}
          onChange={(e) =>
            handleChange(
              "startBlock",
              e.target.value ? Number(e.target.value) : undefined
            )
          }
          className='h-11'
        />
        {getFieldError("startBlock") && (
          <div className='flex items-center space-x-2 text-sm text-red-500'>
            <AlertCircle className='h-4 w-4' />
            <span>{getFieldError("startBlock")}</span>
          </div>
        )}
      </div>

      {/* Description */}
      <div className='space-y-2'>
        <Label htmlFor='description'>Description (optional)</Label>
        <Input
          id='description'
          placeholder='Describe this listener...'
          value={(config.description as string) || ""}
          onChange={(e) => handleChange("description", e.target.value)}
          className='h-11'
        />
        {getFieldError("description") && (
          <div className='flex items-center space-x-2 text-sm text-red-500'>
            <AlertCircle className='h-4 w-4' />
            <span>{getFieldError("description")}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default WalletListenerConfig;
