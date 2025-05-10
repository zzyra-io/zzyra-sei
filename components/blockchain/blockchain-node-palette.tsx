"use client";

import { useState } from "react";
import { 
  Wallet, 
  ArrowRight, 
  Shield, 
  Clock, 
  Activity,
  RefreshCw,
  Database,
  Zap,
  Code,
  Image,
  GitBranch
} from "lucide-react";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BlockchainNodeType } from "@/lib/web3/blockchain-nodes";
import { useBlockchainNodes } from "./blockchain-node-factory";

// Map of blockchain node types to icon components
const nodeIcons: Record<string, any> = {
  [BlockchainNodeType.TRANSACTION_MONITOR]: Activity,
  [BlockchainNodeType.TRANSACTION_VERIFY]: Shield,
  [BlockchainNodeType.TRANSACTION_HISTORY]: Clock,
  [BlockchainNodeType.TOKEN_TRANSFER]: ArrowRight,
  [BlockchainNodeType.TOKEN_APPROVAL]: Shield,
  [BlockchainNodeType.TOKEN_BALANCE]: Wallet,
  [BlockchainNodeType.CONTRACT_INTERACTION]: Code,
  [BlockchainNodeType.CONTRACT_DEPLOY]: Database,
  [BlockchainNodeType.CONTRACT_VERIFY]: Shield,
  [BlockchainNodeType.DEFI_SWAP]: RefreshCw,
  [BlockchainNodeType.DEFI_LIQUIDITY]: Database,
  [BlockchainNodeType.DEFI_YIELD]: Activity,
  [BlockchainNodeType.NFT_MINT]: Image,
  [BlockchainNodeType.NFT_TRANSFER]: ArrowRight,
  [BlockchainNodeType.NFT_MARKETPLACE]: Image,
  [BlockchainNodeType.CHAIN_MONITOR]: Activity,
  [BlockchainNodeType.CHAIN_SWITCH]: GitBranch,
  [BlockchainNodeType.GAS_OPTIMIZER]: Zap,
};

interface BlockchainNodePaletteProps {
  onAddNode: (nodeData: any) => void;
}

export const BlockchainNodePalette = ({ onAddNode }: BlockchainNodePaletteProps) => {
  const [activeTab, setActiveTab] = useState("transaction");
  const { createNode, getAvailableNodeTypes } = useBlockchainNodes();
  const nodeTypes = getAvailableNodeTypes();
  
  // Handle adding a node to the workflow
  const handleAddNode = (nodeType: BlockchainNodeType) => {
    const nodeData = createNode(nodeType, { x: 100, y: 100 });
    onAddNode(nodeData);
  };
  
  // Render a node item in the palette
  const renderNodeItem = (nodeType: BlockchainNodeType, metadata: any) => {
    const Icon = nodeIcons[nodeType] || Wallet;
    
    return (
      <TooltipProvider key={nodeType}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              className="flex items-center justify-start w-full p-2 h-auto mb-2 hover:bg-amber-50 hover:border-amber-200 transition-colors"
              onClick={() => handleAddNode(nodeType)}
            >
              <div className="bg-gradient-to-br from-amber-500 to-yellow-600 p-1.5 rounded-md mr-2">
                <Icon className="h-4 w-4 text-white" />
              </div>
              <div className="text-left">
                <div className="font-medium text-sm">{metadata.label}</div>
                <div className="text-xs text-gray-500 truncate max-w-[200px]">
                  {metadata.description}
                </div>
              </div>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-xs">
            <p className="font-medium">{metadata.label}</p>
            <p className="text-sm">{metadata.description}</p>
            <div className="mt-1">
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                Blockchain
              </Badge>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <Card className="w-full">
      <CardContent className="p-3">
        <Tabs defaultValue="transaction" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="transaction">Transactions</TabsTrigger>
            <TabsTrigger value="token">Tokens</TabsTrigger>
            <TabsTrigger value="defi">DeFi & More</TabsTrigger>
          </TabsList>
          
          <ScrollArea className="h-[400px] pr-4">
            <TabsContent value="transaction" className="mt-0">
              <Accordion type="single" collapsible defaultValue="transaction">
                <AccordionItem value="transaction">
                  <AccordionTrigger className="py-2">
                    Transaction Operations
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-1">
                      {nodeTypes.transaction.map(({ type, metadata }) => 
                        renderNodeItem(type, metadata)
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="chain">
                  <AccordionTrigger className="py-2">
                    Chain Operations
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-1">
                      {nodeTypes.chain.map(({ type, metadata }) => 
                        renderNodeItem(type, metadata)
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </TabsContent>
            
            <TabsContent value="token" className="mt-0">
              <Accordion type="single" collapsible defaultValue="token">
                <AccordionItem value="token">
                  <AccordionTrigger className="py-2">
                    Token Operations
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-1">
                      {nodeTypes.token.map(({ type, metadata }) => 
                        renderNodeItem(type, metadata)
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="nft">
                  <AccordionTrigger className="py-2">
                    NFT Operations
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-1">
                      {nodeTypes.nft.map(({ type, metadata }) => 
                        renderNodeItem(type, metadata)
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </TabsContent>
            
            <TabsContent value="defi" className="mt-0">
              <Accordion type="single" collapsible defaultValue="defi">
                <AccordionItem value="defi">
                  <AccordionTrigger className="py-2">
                    DeFi Operations
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-1">
                      {nodeTypes.defi.map(({ type, metadata }) => 
                        renderNodeItem(type, metadata)
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="contract">
                  <AccordionTrigger className="py-2">
                    Smart Contract Operations
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-1">
                      {nodeTypes.contract.map(({ type, metadata }) => 
                        renderNodeItem(type, metadata)
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default BlockchainNodePalette;
