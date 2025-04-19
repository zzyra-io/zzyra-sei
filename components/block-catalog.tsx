"use client"

import { cn } from "@/lib/utils"

import type React from "react"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { motion, AnimatePresence } from "framer-motion"
import { Search, Wallet, Bell, Code, Zap, Coins, BarChart } from "lucide-react"

interface BlockCatalogProps {
  onAddNode: (block: any) => void
}

export function BlockCatalog({ onAddNode }: BlockCatalogProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState("web3")
  const [draggedBlock, setDraggedBlock] = useState<string | null>(null)

  const blockCategories = [
    {
      id: "web3",
      name: "Web3",
      blocks: [
        {
          id: "wallet",
          name: "Wallet Monitor",
          description: "Monitor wallet balance and transactions",
          icon: Wallet,
        },
        {
          id: "transaction",
          name: "Transaction",
          description: "Send tokens or interact with contracts",
          icon: Zap,
        },
        {
          id: "goat-finance",
          name: "GOAT Finance",
          description: "AI-powered financial operations",
          icon: Coins,
        },
      ],
    },
    {
      id: "notification",
      name: "Notifications",
      blocks: [
        {
          id: "notification",
          name: "Notification",
          description: "Send notifications via email or in-app",
          icon: Bell,
        },
      ],
    },
    {
      id: "code",
      name: "Code",
      blocks: [
        {
          id: "code",
          name: "Custom Code",
          description: "Execute custom JavaScript code",
          icon: Code,
        },
      ],
    },
    {
      id: "analytics",
      name: "Analytics",
      blocks: [
        {
          id: "analytics",
          name: "Analytics",
          description: "Track and analyze metrics",
          icon: BarChart,
        },
      ],
    },
  ]

  const filteredCategories = blockCategories
    .map((category) => ({
      ...category,
      blocks: category.blocks.filter(
        (block) =>
          block.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          block.description.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    }))
    .filter((category) => category.blocks.length > 0)

  const handleDragStart = (e: React.DragEvent, block: any) => {
    e.dataTransfer.setData("application/reactflow", JSON.stringify(block))
    e.dataTransfer.effectAllowed = "move"
    setDraggedBlock(block.id)
  }

  const handleDragEnd = () => {
    setDraggedBlock(null)
  }

  return (
    <div className="flex flex-col h-full">
      <motion.div
        className="p-4"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search blocks..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </motion.div>
      <Tabs
        defaultValue="web3"
        className="flex-1 flex flex-col"
        value={activeCategory}
        onValueChange={setActiveCategory}
      >
        <TabsList className="grid grid-cols-4 mx-4">
          {blockCategories.map((category, index) => (
            <TabsTrigger key={category.id} value={category.id}>
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 * index }}>
                {category.name}
              </motion.span>
            </TabsTrigger>
          ))}
        </TabsList>
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {filteredCategories.map((category) => (
              <TabsContent key={category.id} value={category.id} className="h-full data-[state=active]:flex flex-col">
                <ScrollArea className="flex-1">
                  <motion.div
                    className="grid grid-cols-1 gap-2 p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {category.blocks.map((block, index) => (
                      <motion.div
                        key={block.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 * index }}
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        className="cursor-grab"
                        draggable
                        onDragStart={(e) => handleDragStart(e, block)}
                        onDragEnd={handleDragEnd}
                        onClick={() => onAddNode(block)}
                      >
                        <div
                          className={cn(
                            "flex items-start gap-3 rounded-lg border bg-card p-3 text-card-foreground shadow-sm transition-all duration-200",
                            "hover:bg-accent hover:text-accent-foreground",
                            draggedBlock === block.id && "ring-2 ring-primary opacity-50",
                          )}
                        >
                          <motion.div
                            whileHover={{ rotate: 10 }}
                            transition={{ type: "spring", stiffness: 400, damping: 10 }}
                          >
                            <block.icon className="mt-0.5 h-5 w-5 text-muted-foreground" />
                          </motion.div>
                          <div>
                            <h3 className="font-medium leading-none">{block.name}</h3>
                            <p className="text-xs text-muted-foreground mt-1">{block.description}</p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                </ScrollArea>
              </TabsContent>
            ))}
          </AnimatePresence>
        </div>
      </Tabs>
    </div>
  )
}
