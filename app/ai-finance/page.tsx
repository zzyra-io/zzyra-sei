"use client"

import { AuthGate } from "@/components/auth-gate"
import { AIFinanceAssistant } from "@/components/goat/ai-finance-assistant"
import { GoatProvider } from "@/lib/goat/goat-context"
import { motion } from "framer-motion"

export default function AIFinancePage() {
  return (
    <AuthGate>
      <GoatProvider>
        <div className="container py-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="text-3xl font-bold mb-2">AI Finance Assistant</h1>
            <p className="text-muted-foreground mb-8">
              Use AI to automate financial operations across multiple blockchains
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <AIFinanceAssistant />
            </div>
            <div>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="space-y-6"
              >
                <div className="bg-card rounded-lg border p-4">
                  <h3 className="font-medium mb-2">What You Can Do</h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start">
                      <span className="bg-primary/10 text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5">
                        1
                      </span>
                      <span>Check token balances across multiple chains</span>
                    </li>
                    <li className="flex items-start">
                      <span className="bg-primary/10 text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5">
                        2
                      </span>
                      <span>Send tokens to any address</span>
                    </li>
                    <li className="flex items-start">
                      <span className="bg-primary/10 text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5">
                        3
                      </span>
                      <span>Swap tokens using decentralized exchanges</span>
                    </li>
                    <li className="flex items-start">
                      <span className="bg-primary/10 text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5">
                        4
                      </span>
                      <span>Get market prices and financial insights</span>
                    </li>
                    <li className="flex items-start">
                      <span className="bg-primary/10 text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5">
                        5
                      </span>
                      <span>Create automated financial workflows</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-card rounded-lg border p-4">
                  <h3 className="font-medium mb-2">Supported Chains</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 p-2 rounded-md bg-muted">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                      <span className="text-sm">Ethereum</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-md bg-muted">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <span className="text-sm">Optimism</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-md bg-muted">
                      <div className="w-3 h-3 rounded-full bg-purple-500" />
                      <span className="text-sm">Polygon</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-md bg-muted">
                      <div className="w-3 h-3 rounded-full bg-blue-400" />
                      <span className="text-sm">Arbitrum</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-md bg-muted">
                      <div className="w-3 h-3 rounded-full bg-blue-600" />
                      <span className="text-sm">Base</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-md bg-muted">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <span className="text-sm">Solana</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </GoatProvider>
    </AuthGate>
  )
}
