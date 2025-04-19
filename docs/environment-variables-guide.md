# Environment Variables Integration Guide

This guide explains how to use the environment variables in your automated workflows.

## Available Environment Variables

- `NEXT_PUBLIC_RPC_URL`: RPC URL for EVM-compatible blockchains
- `NEXT_PUBLIC_SOLANA_RPC_URL`: RPC URL for Solana blockchain
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`: Project ID for WalletConnect
- `NEXT_PUBLIC_GOAT_API_KEY`: API key for advanced financial operations

## Using Environment Variables in Workflows

### In Financial Operation Blocks

The Financial Operation block automatically uses these environment variables based on the selected blockchain and operation type:

1. **EVM Blockchains** (Ethereum, Optimism, Polygon, etc.)
   - Uses `NEXT_PUBLIC_RPC_URL` for connecting to the blockchain
   - Uses `NEXT_PUBLIC_GOAT_API_KEY` for enhanced operations like swaps and DeFi interactions

2. **Solana Blockchain**
   - Uses `NEXT_PUBLIC_SOLANA_RPC_URL` for connecting to Solana
   - Uses `NEXT_PUBLIC_GOAT_API_KEY` for enhanced operations

3. **Wallet Connection**
   - Uses `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` for WalletConnect integration
   - This enables secure wallet connections without exposing private keys

### Programmatic Access

You can also access these variables programmatically in custom code blocks:

\`\`\`javascript
// Access RPC URLs based on blockchain
const rpcUrl = blockchain === "solana" 
  ? process.env.NEXT_PUBLIC_SOLANA_RPC_URL 
  : process.env.NEXT_PUBLIC_RPC_URL;

// Access API key for enhanced operations
const apiKey = process.env.NEXT_PUBLIC_GOAT_API_KEY;

// Access WalletConnect project ID
const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
\`\`\`

## Security Considerations

- Environment variables prefixed with `NEXT_PUBLIC_` are exposed to the browser
- Never store private keys as environment variables
- Use WalletConnect for secure wallet connections instead of handling private keys directly
- Consider using server-side operations for sensitive transactions

## Best Practices

1. **Chain-Specific Configuration**
   - Create separate workflow templates for different blockchains
   - Use conditional logic to handle chain-specific requirements

2. **Error Handling**
   - Always implement proper error handling for RPC failures
   - Provide fallback RPC providers when possible

3. **Testing**
   - Test workflows on testnets before deploying to production
   - Use minimal amounts when testing on mainnets

4. **Monitoring**
   - Implement logging for all blockchain operations
   - Set up alerts for failed transactions
\`\`\`

Let's update the navigation to include the new Finance page:

\`\`\`typescriptreact file="components/dashboard-header.tsx"
[v0-no-op-code-block-prefix]"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { UserMenu } from "@/components/user-menu"
import { ModeToggle } from "@/components/mode-toggle"
import { Logo } from "@/components/logo"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { Plus, Home, Settings, FileText, BarChart3, Coins } from 'lucide-react'

export function DashboardHeader() {
  const pathname = usePathname()

  const navigationItems = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: Home,
    },
    {
      name: "Builder",
      href: "/builder",
      icon: FileText,
    },
    {
      name: "Templates",
      href: "/templates",
      icon: BarChart3,
    },
    {
      name: "Finance",
      href: "/finance",
      icon: Coins,
    },
    {
      name: "Settings",
      href: "/settings",
      icon: Settings,
    },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <Link href="/dashboard" className="mr-6 flex items-center space-x-2">
            <Logo className="h-6 w-6" />
            <span className="font-bold">Zyra</span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center transition-colors hover:text-foreground/80",
                  pathname === item.href ? "text-foreground" : "text-foreground/60",
                )}
              >
                <motion.div
                  className="flex items-center gap-1.5"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </motion.div>
                {pathname === item.href && (
                  <motion.div
                    className="absolute bottom-0 left-0 h-0.5 w-full bg-primary"
                    layoutId="navbar-indicator"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
              </Link>
            ))}
          </nav>
        </div>
        <div className="ml-auto flex items-center space-x-4">
          <Button asChild>
            <Link href="/builder">
              <Plus className="mr-2 h-4 w-4" />
              New Workflow
            </Link>
          </Button>
          <ModeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
