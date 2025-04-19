import type React from "react"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/components/auth-provider"
import { ReactQueryProvider } from "@/components/react-query-provider"
import { Toaster } from "@/components/ui/toaster"
import { Web3Provider } from "@/components/web3/web3-provider"
import { FinanceProvider } from "@/lib/finance/finance-context"
import { SkipLink } from "@/components/a11y/skip-link"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
})

export const metadata = {
  title: "Zyra - Web3 Automation",
  description: "Build powerful Web3 automation workflows",
  metadataBase: new URL("https://zyra.vercel.app"),
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <Web3Provider>
            <FinanceProvider>
              <ReactQueryProvider>
                <AuthProvider>
                  <SkipLink />
                  {children}
                  <Toaster />
                </AuthProvider>
              </ReactQueryProvider>
            </FinanceProvider>
          </Web3Provider>
        </ThemeProvider>
      </body>
    </html>
  )
}
