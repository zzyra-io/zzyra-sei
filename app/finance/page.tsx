import type { Metadata } from "next"
import { Web3Provider } from "@/components/web3/web3-provider"
import { FinanceProvider } from "@/lib/finance/finance-context"
import { AIFinanceAssistant } from "@/components/finance/ai-assistant"
import { WalletConnect } from "@/components/finance/wallet-connect"

export const metadata: Metadata = {
  title: "AI Financial Assistant | Zyra",
  description: "Automate your financial operations with AI",
}

export default function FinancePage() {
  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">AI Financial Assistant</h1>
      <p className="text-muted-foreground mb-8 max-w-3xl">
        Use natural language to perform financial operations across multiple blockchains. Connect your wallet, then
        describe what you want to do, and our AI will handle the rest.
      </p>

      <div className="grid md:grid-cols-2 gap-8">
        <Web3Provider>
          <FinanceProvider>
            <div className="space-y-8">
              <WalletConnect />
              <AIFinanceAssistant />
            </div>
          </FinanceProvider>
        </Web3Provider>
      </div>
    </div>
  )
}
