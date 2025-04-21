import type React from "react";
import { Inter, Open_Sans, Poppins } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/components/auth-provider";
import { Toaster } from "@/components/ui/toaster";
import { Web3Provider } from "@/components/web3/web3-provider";
import { FinanceProvider } from "@/lib/finance/finance-context";
import { SkipLink } from "@/components/a11y/skip-link";
import QueryProvider from "@/components/web3/query-provider";

// Removed ReactQueryProvider; QueryProvider now handles React Query and Wagmi/ConnectKit

const inter = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata = {
  title: "Zyra - Web3 Automation",
  description: "Build powerful Web3 automation workflows",
  metadataBase: new URL("https://zyra.vercel.app"),
  generator: "v0.dev",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en' suppressHydrationWarning className={inter.variable}>
      <body className='min-h-screen bg-background font-sans antialiased'>
        <QueryProvider>
          <SkipLink />
          <AuthProvider>
            <ThemeProvider
              attribute='class'
              defaultTheme='system'
              enableSystem
              disableTransitionOnChange>
              <Web3Provider>
                <FinanceProvider>
                  <main id='main-content'>{children}</main>
                  <Toaster />
                </FinanceProvider>
              </Web3Provider>
            </ThemeProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
