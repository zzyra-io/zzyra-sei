import { SkipLink } from "@/components/a11y/skip-link";
import { Providers } from "@/components/providers";
import { FloatingParticles } from "@/components/floating-particles";
import { NotificationSocketProvider } from "@/components/notification/notification-socket-provider";
import { NotificationToastContainer } from "@/components/NotificationToast";
import { PostHogProvider } from "@/components/PostHogProvider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { WorkflowExecutionProvider } from "@/components/workflow/BlockExecutionMonitor";
import "@/styles/flow-components.css";
import { Montserrat } from "next/font/google";
import type React from "react";
import { WagmiProviders } from "../components/wagmi-providers";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  variable: "--font-montserrat",
});

export const metadata = {
  title: "Zzyra - AI-Powered Workflow Automation with Blockchain",
  description: "Build powerful AI-native workflows that seamlessly integrate with blockchain technology",
  metadataBase: new URL("https://zyra.vercel.app"),
  generator: "v0.dev",
  icons: {
    icon: [
      { url: "/zyra-icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", type: "image/x-icon" }
    ],
    apple: "/zyra-icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang='en' suppressHydrationWarning className={montserrat.variable}>
      <body className='min-h-screen bg-background font-montserrat antialiased'>
        <PostHogProvider>
          <SkipLink />
          <WagmiProviders>
            <Providers>
              <ThemeProvider
                attribute='class'
                defaultTheme='system'
                enableSystem
                disableTransitionOnChange>
                <WorkflowExecutionProvider>
                  <NotificationSocketProvider>
                    <div className='fixed inset-0 pointer-events-none z-0'>
                      <FloatingParticles />
                    </div>
                    <main id='main-content'>{children}</main>
                    <Toaster />
                    <NotificationToastContainer />
                  </NotificationSocketProvider>
                </WorkflowExecutionProvider>
              </ThemeProvider>
            </Providers>
          </WagmiProviders>
        </PostHogProvider>
      </body>
    </html>
  );
}
