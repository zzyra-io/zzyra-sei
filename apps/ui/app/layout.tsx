import { SkipLink } from "@/components/a11y/skip-link";
import { AuthProvider } from "@/components/auth-provider";
import { FloatingParticles } from "@/components/floating-particles";
import { NotificationSocketProvider } from "@/components/notification/notification-socket-provider";
import { NotificationToastContainer } from "@/components/NotificationToast";
import { PostHogProvider } from "@/components/PostHogProvider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import "@/styles/flow-components.css";
import { Space_Grotesk } from "next/font/google";
import type React from "react";
import { WagmiProviders } from "../components/wagmi-providers";
import "./globals.css";

const inter = Space_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
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
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang='en' suppressHydrationWarning className={inter.variable}>
      <body className='min-h-screen bg-background font-sans antialiased'>
        <PostHogProvider>
          <SkipLink />
          <WagmiProviders>
            <AuthProvider>
              <ThemeProvider
                attribute='class'
                defaultTheme='system'
                enableSystem
                disableTransitionOnChange>
                <NotificationSocketProvider>
                  <div className='fixed inset-0 pointer-events-none z-0'>
                    <FloatingParticles />
                  </div>
                  <main id='main-content'>{children}</main>
                  <Toaster />
                  <NotificationToastContainer />
                </NotificationSocketProvider>
              </ThemeProvider>
            </AuthProvider>
          </WagmiProviders>
        </PostHogProvider>
      </body>
    </html>
  );
}
