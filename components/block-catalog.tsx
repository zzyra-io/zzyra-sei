"use client"

import type React from "react"

import { useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Block definitions
const blocks = {
  triggers: [
    {
      id: "ethereum_price_trigger",
      name: "Ethereum Price Trigger",
      description: "Triggers when ETH price crosses a threshold",
      nodeType: "trigger",
      icon: "ethereum",
      config: {
        threshold: 2000,
        condition: "above",
      },
    },
    {
      id: "time_trigger",
      name: "Time Trigger",
      description: "Triggers at specified intervals",
      nodeType: "trigger",
      icon: "clock",
      config: {
        interval: "daily",
        time: "09:00",
      },
    },
    {
      id: "webhook_trigger",
      name: "Webhook Trigger",
      description: "Triggers when a webhook is received",
      nodeType: "trigger",
      icon: "webhook",
      config: {
        endpoint: "",
      },
    },
  ],
  actions: [
    {
      id: "send_email",
      name: "Send Email",
      description: "Sends an email notification",
      nodeType: "action",
      icon: "mail",
      config: {
        to: "",
        subject: "",
        body: "",
      },
    },
    {
      id: "send_slack",
      name: "Send Slack Message",
      description: "Sends a message to a Slack channel",
      nodeType: "action",
      icon: "message-square",
      config: {
        channel: "",
        message: "",
      },
    },
    {
      id: "execute_trade",
      name: "Execute Trade",
      description: "Executes a cryptocurrency trade",
      nodeType: "action",
      icon: "trending-up",
      config: {
        pair: "ETH/USDT",
        amount: 0.1,
        type: "market",
      },
    },
  ],
  conditions: [
    {
      id: "condition",
      name: "Condition",
      description: "Evaluates a condition to determine flow",
      nodeType: "condition",
      icon: "git-branch",
      config: {
        condition: "",
      },
    },
    {
      id: "delay",
      name: "Delay",
      description: "Adds a delay before continuing",
      nodeType: "condition",
      icon: "clock",
      config: {
        duration: 5,
        unit: "minutes",
      },
    },
  ],
  data: [
    {
      id: "transform",
      name: "Transform Data",
      description: "Transforms data between steps",
      nodeType: "data",
      icon: "edit-3",
      config: {
        transformation: "",
      },
    },
    {
      id: "api_request",
      name: "API Request",
      description: "Makes an HTTP request to an API",
      nodeType: "data",
      icon: "globe",
      config: {
        url: "",
        method: "GET",
        headers: {},
        body: "",
      },
    },
  ],
}

interface BlockCatalogProps {
  onAddNode: (block: any) => void
}

export function BlockCatalog({ onAddNode }: BlockCatalogProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("all")

  // Filter blocks based on search query and active tab
  const filteredBlocks = Object.entries(blocks).reduce(
    (acc, [category, categoryBlocks]) => {
      if (activeTab !== "all" && activeTab !== category) return acc

      const filtered = categoryBlocks.filter((block) => {
        const searchString = `${block.name} ${block.description}`.toLowerCase()
        return searchString.includes(searchQuery.toLowerCase())
      })

      if (filtered.length > 0) {
        acc[category] = filtered
      }

      return acc
    },
    {} as Record<string, typeof blocks.triggers>,
  )

  // Handle drag start
  const handleDragStart = (e: React.DragEvent, block: any) => {
    e.dataTransfer.setData("application/reactflow", JSON.stringify(block))
    e.dataTransfer.effectAllowed = "move"
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search blocks..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid grid-cols-5 mx-4 mt-2">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="triggers">Triggers</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
          <TabsTrigger value="conditions">Logic</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1 p-4">
          {Object.entries(filteredBlocks).map(([category, categoryBlocks]) => (
            <div key={category} className="mb-6">
              <h3 className="text-sm font-medium mb-2 capitalize">{category}</h3>
              <div className="space-y-2">
                {categoryBlocks.map((block) => (
                  <Card
                    key={block.id}
                    className="cursor-grab hover:bg-accent/50 transition-colors"
                    draggable
                    onDragStart={(e) => handleDragStart(e, block)}
                    onClick={() => onAddNode(block)}
                  >
                    <CardHeader className="p-3">
                      <CardTitle className="text-sm">{block.name}</CardTitle>
                      <CardDescription className="text-xs">{block.description}</CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>
          ))}

          {Object.keys(filteredBlocks).length === 0 && (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">No blocks found</p>
            </div>
          )}
        </ScrollArea>
      </Tabs>
    </div>
  )
}
