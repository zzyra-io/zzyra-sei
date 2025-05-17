import type React from "react";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";
import "@/styles/flow-components.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/components/auth-provider";
import { Toaster } from "@/components/ui/toaster";
import { SkipLink } from "@/components/a11y/skip-link";
import { PostHogProvider } from "@/components/PostHogProvider";
import { NotificationToastContainer } from "@/components/NotificationToast";
import { NotificationSocketProvider } from "@/components/notification/notification-socket-provider";
import { FloatingParticles } from "@/components/floating-particles";
import { ZyraProviders } from "../components/zyra-providers";

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
          <ZyraProviders>
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
          </ZyraProviders>
        </PostHogProvider>
      </body>
    </html>
  );
}
