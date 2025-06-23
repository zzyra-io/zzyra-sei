import type { Metadata } from "next";
import { Inter, Montserrat } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
  title: {
    default: "Zyra Documentation - AI-Powered Web3 Workflow Automation",
    template: "%s | Zyra Docs",
  },
  description:
    "Comprehensive documentation for Zyra - Build, deploy, and manage Web3 workflows with AI-powered automation. Features visual builder, blockchain integrations, and enterprise security.",
  keywords: [
    "Web3",
    "Blockchain",
    "Workflow Automation",
    "AI",
    "DeFi",
    "Smart Contracts",
    "Documentation",
    "Developer Tools",
  ],
  authors: [{ name: "Zyra Team" }],
  creator: "Zyra",
  publisher: "Zyra",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://docs.zyra.io"
  ),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://docs.zyra.io",
    title: "Zyra Documentation - AI-Powered Web3 Workflow Automation",
    description:
      "Build, deploy, and manage Web3 workflows with AI-powered automation.",
    siteName: "Zyra Documentation",
  },
  twitter: {
    card: "summary_large_image",
    title: "Zyra Documentation - AI-Powered Web3 Workflow Automation",
    description:
      "Build, deploy, and manage Web3 workflows with AI-powered automation.",
    creator: "@zyra_io",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      lang='en'
      dir='ltr'
      className={`${inter.variable} ${montserrat.variable}`}>
      <head>
        <link rel='icon' href='/favicon.ico' />
        <meta name='viewport' content='width=device-width, initial-scale=1.0' />
      </head>
      <body className='font-inter antialiased bg-background-primary text-text-primary'>
        {/* Skip to main content for accessibility */}
        <a
          href='#main-content'
          className='sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-accent-primary text-background-primary px-4 py-2 rounded-lg font-medium z-50'>
          Skip to main content
        </a>

        {/* Global Banner */}
        <div className='bg-gradient-to-r from-purple-600 to-blue-600 text-white text-center py-3 text-sm relative'>
          <div className='container-responsive flex items-center justify-center gap-2'>
            <span className='animate-pulse'>🎉</span>
            <span>
              <strong>Zyra v2.0</strong> is now available with enhanced AI
              capabilities and PostgreSQL integration!
            </span>
            <a
              href='/getting-started'
              className='underline hover:no-underline font-semibold ml-2 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-purple-600 rounded'>
              Get Started →
            </a>
          </div>
        </div>

        {/* Main Content */}
        <main id='main-content' className='min-h-screen'>
          {children}
        </main>

        {/* Enhanced Footer */}
        <footer className='border-t border-border-primary bg-background-secondary/50 backdrop-blur-sm'>
          <div className='container-responsive py-16'>
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12'>
              {/* Brand Section */}
              <div className='lg:col-span-2'>
                <div className='flex items-center space-x-3 mb-6'>
                  <div className='w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg'>
                    <span className='text-white text-xl font-bold'>Z</span>
                  </div>
                  <span className='text-2xl font-montserrat font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent'>
                    Zyra
                  </span>
                </div>
                <p className='text-text-secondary mb-6 max-w-md leading-relaxed'>
                  AI-powered Web3 workflow automation platform. Build, deploy,
                  and manage blockchain workflows with visual tools and
                  enterprise security.
                </p>
                <div className='flex space-x-4'>
                  <a
                    href='https://github.com/zyra-io'
                    className='social-link'
                    aria-label='GitHub'
                    rel='noopener noreferrer'>
                    <svg
                      className='w-5 h-5'
                      fill='currentColor'
                      viewBox='0 0 24 24'>
                      <path d='M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z' />
                    </svg>
                  </a>
                  <a
                    href='https://discord.gg/zyra'
                    className='social-link'
                    aria-label='Discord'
                    rel='noopener noreferrer'>
                    <svg
                      className='w-5 h-5'
                      fill='currentColor'
                      viewBox='0 0 24 24'>
                      <path d='M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0190 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9460 2.4189-2.1568 2.4189Z' />
                    </svg>
                  </a>
                  <a
                    href='https://twitter.com/zyra_io'
                    className='social-link'
                    aria-label='Twitter'
                    rel='noopener noreferrer'>
                    <svg
                      className='w-5 h-5'
                      fill='currentColor'
                      viewBox='0 0 24 24'>
                      <path d='M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' />
                    </svg>
                  </a>
                </div>
              </div>

              {/* Documentation Links */}
              <div>
                <h3 className='text-sm font-semibold text-text-primary mb-6 uppercase tracking-wider'>
                  Documentation
                </h3>
                <ul className='space-y-3'>
                  <li>
                    <a href='/getting-started' className='footer-link'>
                      Getting Started
                    </a>
                  </li>
                  <li>
                    <a href='/ai-features' className='footer-link'>
                      AI Features
                    </a>
                  </li>
                  <li>
                    <a href='/api-reference' className='footer-link'>
                      API Reference
                    </a>
                  </li>
                  <li>
                    <a href='/workflow-builder' className='footer-link'>
                      Workflow Builder
                    </a>
                  </li>
                </ul>
              </div>

              {/* Community Links */}
              <div>
                <h3 className='text-sm font-semibold text-text-primary mb-6 uppercase tracking-wider'>
                  Community
                </h3>
                <ul className='space-y-3'>
                  <li>
                    <a
                      href='https://github.com/zyra-io'
                      className='footer-link'
                      rel='noopener noreferrer'>
                      GitHub
                    </a>
                  </li>
                  <li>
                    <a
                      href='https://discord.gg/zyra'
                      className='footer-link'
                      rel='noopener noreferrer'>
                      Discord
                    </a>
                  </li>
                  <li>
                    <a
                      href='https://twitter.com/zyra_io'
                      className='footer-link'
                      rel='noopener noreferrer'>
                      Twitter
                    </a>
                  </li>
                  <li>
                    <a href='/support' className='footer-link'>
                      Support
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            {/* Footer Bottom */}
            <div className='border-t border-border-primary mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4'>
              <p className='text-text-tertiary text-sm'>
                © {new Date().getFullYear()} Zyra. Built with Next.js and
                Nextra.
              </p>
              <p className='text-text-tertiary text-sm'>
                Powered by{" "}
                <a
                  href='https://nextra.site'
                  className='text-accent-primary hover:text-accent-secondary transition-colors'
                  target='_blank'
                  rel='noopener noreferrer'>
                  Nextra ⚡
                </a>
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
