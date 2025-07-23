"use client";

import { CountdownTimer } from "@/components/countdown-timer";
import DevelopmentWarning from "@/components/development-warning";
import { FeatureCard } from "@/components/feature-card";
import { FloatingParticles } from "@/components/floating-particles";
import { GradientButton } from "@/components/gradient-button";
import { HeroAnimation } from "@/components/hero-animation";
import { InteractiveDemo } from "@/components/interactive-demo";
import { PartnerLogos } from "@/components/partner-logos";
import { StatsCounterGroup } from "@/components/stats-counter";
import { TestimonialCard } from "@/components/testimonial-card";
import { TrustBadges } from "@/components/trust-badges";
import { Button } from "@/components/ui/button";
import { WorkflowPreview } from "@/components/workflow-preview";
import useAuthStore from "@/lib/store/auth-store";
import {
  AnimatePresence,
  AnimationControls,
  HTMLMotionProps,
  motion,
  useAnimation,
  useInView,
  Variants,
} from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Bot,
  Check,
  ChevronRight,
  Cpu,
  Layers,
  LucideLayoutDashboard,
  Settings,
  Sparkles,
  Star,
  Workflow,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

// Define motion components with proper typing
const MotionDiv = motion.div;
const MotionHeader = motion.header;
const MotionFooter = motion.footer;
const MotionButton = motion.button;
const MotionA = motion.a;

export default function HomePage() {
  const { user } = useAuthStore();
  const [showInteractiveDemo, setShowInteractiveDemo] = useState(false);

  // Refs for scroll animations
  const heroRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const demoRef = useRef<HTMLDivElement>(null);
  const workflowRef = useRef<HTMLDivElement>(null);
  const trustRef = useRef<HTMLDivElement>(null);
  const testimonialsRef = useRef<HTMLDivElement>(null);
  const partnersRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  // Check if elements are in view
  const heroInView = useInView(heroRef as React.RefObject<Element>, {
    once: false,
    amount: 0.2,
  });
  const statsInView = useInView(statsRef as React.RefObject<Element>, {
    once: false,
    amount: 0.2,
  });
  const featuresInView = useInView(featuresRef as React.RefObject<Element>, {
    once: false,
    amount: 0.2,
  });
  const demoInView = useInView(demoRef as React.RefObject<Element>, {
    once: false,
    amount: 0.2,
  });
  const workflowInView = useInView(workflowRef as React.RefObject<Element>, {
    once: false,
    amount: 0.2,
  });
  const trustInView = useInView(trustRef as React.RefObject<Element>, {
    once: false,
    amount: 0.2,
  });
  const testimonialsInView = useInView(
    testimonialsRef as React.RefObject<Element>,
    {
      once: false,
      amount: 0.2,
    }
  );
  const partnersInView = useInView(partnersRef as React.RefObject<Element>, {
    once: false,
    amount: 0.2,
  });
  const ctaInView = useInView(ctaRef as React.RefObject<Element>, {
    once: false,
    amount: 0.2,
  });

  // Animation controls
  const heroControls = useAnimation();
  const statsControls = useAnimation();
  const featuresControls = useAnimation();
  const demoControls = useAnimation();
  const workflowControls = useAnimation();
  const trustControls = useAnimation();
  const testimonialsControls = useAnimation();
  const partnersControls = useAnimation();
  const ctaControls = useAnimation();

  // Trigger animations when elements come into view
  useEffect(() => {
    if (heroInView) heroControls.start("visible");
    if (statsInView) statsControls.start("visible");
    if (featuresInView) featuresControls.start("visible");
    if (demoInView) demoControls.start("visible");
    if (workflowInView) workflowControls.start("visible");
    if (trustInView) trustControls.start("visible");
    if (testimonialsInView) testimonialsControls.start("visible");
    if (partnersInView) partnersControls.start("visible");
    if (ctaInView) ctaControls.start("visible");
  }, [
    heroInView,
    statsInView,
    featuresInView,
    demoInView,
    workflowInView,
    trustInView,
    testimonialsInView,
    partnersInView,
    ctaInView,
    heroControls,
    statsControls,
    featuresControls,
    demoControls,
    workflowControls,
    trustControls,
    testimonialsControls,
    partnersControls,
    ctaControls,
  ]);

  // Features data - emphasizing AI and custom block creation
  const features = [
    {
      title: "AI Creates Blocks for You in Seconds",
      description:
        "Just describe what you want in plain English. Our AI instantly builds custom automation blocks that work perfectly every time.",
      icon: Bot,
      color: "from-purple-500 to-pink-500",
    },
    {
      title: "AI-Assisted Workflow Generation",
      description:
        "Describe your automation needs in natural language and watch our AI generate sophisticated Web3 workflows. Beta feature with expanding capabilities.",
      icon: Sparkles,
      color: "from-emerald-500 to-teal-400",
    },
    {
      title: "Visual Workflow Builder",
      description:
        "Drag-and-drop interface for creating complex automation workflows. Connect multiple blockchain networks and services with intuitive visual nodes.",
      icon: Settings,
      color: "from-blue-500 to-cyan-400",
    },
    {
      title: "Multi-Chain Compatibility (Planned)",
      description:
        "Designed for cross-chain automation across Ethereum, Polygon, Solana and more. Currently supporting basic single-chain operations with multi-chain roadmap.",
      icon: Workflow,
      color: "from-orange-500 to-amber-400",
    },
    {
      title: "Real-Time Execution Monitoring",
      description:
        "Track workflow execution status, view logs, and monitor automation performance. Current beta includes basic monitoring with advanced analytics planned.",
      icon: Cpu,
      color: "from-indigo-500 to-violet-400",
    },
    {
      title: "Template Marketplace (Planned)",
      description:
        "Share and discover automation templates with the community. Development roadmap includes monetization features for template creators.",
      icon: Layers,
      color: "from-red-500 to-rose-400",
    },
  ];

  // Testimonials data - rewrite with specific ROI and real use cases
  const testimonials = [
    {
      name: "Marcus Chen",
      role: "DeFi Trader, $2.3M Portfolio",
      content:
        "Zzyra saved me from 3 liquidations last month alone - that's $47,000 I would have lost. It pays for itself in the first week.",
      avatar: "/placeholder.svg?height=80&width=80",
      rating: 5,
    },
    {
      name: "Elena Rodriguez",
      role: "NFT Collector, 1,200+ NFTs",
      content:
        "I used to miss 8 out of 10 profitable drops. Now I catch 95% of them while sleeping. Made $23,000 extra this month alone.",
      avatar: "/placeholder.svg?height=80&width=80",
      rating: 5,
    },
    {
      name: "David Park",
      role: "DAO Treasury Manager",
      content:
        "We automated our entire $50M treasury management. What took 40 hours per week now takes 2 hours. ROI was 2,000% in month one.",
      avatar: "/placeholder.svg?height=80&width=80",
      rating: 5,
    },
  ];

  return (
    <div className='flex min-h-screen flex-col overflow-hidden'>
      <DevelopmentWarning />
      {/* Floating particles background */}
      <div className='fixed inset-0 pointer-events-none z-0'>
        <FloatingParticles />
      </div>

      {/* Header with glass effect */}
      <MotionHeader
        className='sticky top-0 z-50 w-full border-b backdrop-blur-lg bg-background/70'
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}>
        <div className='container flex h-16 items-center justify-between'>
          <MotionDiv
            className='flex items-center space-x-4'
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}>
            <Link href='/' className='font-bold text-xl flex items-center'>
              <Zap className='mr-2 h-5 w-5 text-primary' />
              <span className='bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600'>
                Zzyra
              </span>
            </Link>
          </MotionDiv>

          <div className='flex items-center space-x-4'>
            <AnimatePresence>
              {user && user.email ? (
                <MotionDiv
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}>
                  <Button variant='outline' className='group'>
                    <LucideLayoutDashboard className='mr-2 h-4 w-4 transition-transform group-hover:scale-110' />
                    <Link href='/dashboard'>Dashboard</Link>
                    <MotionDiv
                      className='absolute inset-0 rounded-md bg-primary/10'
                      initial={{ scale: 0 }}
                      whileHover={{ scale: 1 }}
                      transition={{ duration: 0.2 }}
                    />
                  </Button>
                </MotionDiv>
              ) : (
                <MotionDiv
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}>
                  <GradientButton asChild variant='outline'>
                    <Link href='/login'>Login</Link>
                  </GradientButton>
                </MotionDiv>
              )}
            </AnimatePresence>
          </div>
        </div>
      </MotionHeader>

      <main className='flex-1 relative z-10'>
        {/* Hero section with animated elements */}
        <section
          ref={heroRef}
          className='w-full py-20 md:py-28 lg:py-32 relative overflow-hidden'>
          <div className='absolute inset-0 bg-gradient-to-b from-primary/5 to-background/0 pointer-events-none' />
          {/* Temp alert saying zzyra is in development and these are not real results */}

          <div className='container px-4 md:px-6 relative'>
            <div className='grid gap-6 lg:grid-cols-2 lg:gap-12 xl:grid-cols-2'>
              <MotionDiv
                className='flex flex-col justify-center space-y-6'
                initial='hidden'
                animate={heroControls}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
                }}>
                <div className='space-y-4'>
                  <MotionDiv
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className='inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-medium bg-background/50 backdrop-blur-sm'>
                    <span className='relative flex h-2 w-2 mr-2'>
                      <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75'></span>
                      <span className='relative inline-flex rounded-full h-2 w-2 bg-primary'></span>
                    </span>
                    <span className='mr-2'>
                      🚀 Next-Gen Web3 Automation Platform
                    </span>
                    <span className='rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-semibold text-blue-600'>
                      IN DEVELOPMENT
                    </span>
                  </MotionDiv>

                  <MotionDiv
                    className='text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl/none'
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 }}>
                    <span className='bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600'>
                      Make $10,000+ Per Month
                    </span>
                    <br />
                    <span className='text-foreground text-3xl sm:text-4xl md:text-5xl lg:text-6xl'>
                      While You Sleep
                    </span>
                  </MotionDiv>

                  <MotionDiv
                    className='max-w-[600px] text-muted-foreground md:text-xl'
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.5 }}>
                    Experience the next evolution of Web3 automation with
                    AI-powered workflow creation. Join early adopters building
                    decentralized automation that will transform how we interact
                    with blockchain technology.
                  </MotionDiv>
                </div>

                <MotionDiv
                  className='flex flex-col gap-3 min-[400px]:flex-row'
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.6 }}>
                  <GradientButton asChild size='lg' className='group'>
                    <Link href='/login'>
                      Join Early Development - Free
                      <MotionDiv
                        initial={{ x: 0 }}
                        whileHover={{ x: 5 }}
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 10,
                        }}>
                        <ArrowRight className='ml-2 h-4 w-4' />
                      </MotionDiv>
                    </Link>
                  </GradientButton>

                  <Button
                    variant='outline'
                    size='lg'
                    className='group'
                    onClick={() => setShowInteractiveDemo(true)}>
                    See $10K+ Monthly Results
                    <MotionDiv
                      initial={{ opacity: 0, x: -5 }}
                      whileHover={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2 }}>
                      <ChevronRight className='ml-1 h-4 w-4' />
                    </MotionDiv>
                  </Button>
                </MotionDiv>

                <MotionDiv
                  className='flex items-center space-x-4 text-sm text-muted-foreground'
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8, duration: 0.5 }}>
                  <div className='flex items-center'>
                    <Check className='mr-1 h-4 w-4 text-primary' />
                    No credit card
                  </div>
                  <div className='flex items-center'>
                    <Check className='mr-1 h-4 w-4 text-primary' />
                    Free starter plan
                  </div>
                  <div className='flex items-center'>
                    <Check className='mr-1 h-4 w-4 text-primary' />
                    Cancel anytime
                  </div>
                </MotionDiv>
              </MotionDiv>

              <MotionDiv
                className='flex items-center justify-center'
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.7 }}>
                {showInteractiveDemo ? (
                  <MotionDiv
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className='w-full max-w-[500px]'>
                    <InteractiveDemo />
                  </MotionDiv>
                ) : (
                  <HeroAnimation />
                )}
              </MotionDiv>
            </div>
          </div>
        </section>

        {/* User Segments section */}
        <section className='w-full py-20 md:py-28 lg:py-32 bg-muted/30'>
          <div className='container px-4 md:px-6'>
            <div className='mx-auto flex max-w-[58rem] flex-col items-center justify-center gap-4 text-center mb-12'>
              <h2 className='text-3xl font-bold leading-[1.1] sm:text-3xl md:text-4xl'>
                <span className='bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600'>
                  Which Describes You?
                </span>
              </h2>
              <p className='max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7'>
                Join early development and help shape the future of Web3
                automation
              </p>
            </div>

            <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-4'>
              {[
                {
                  title: "Web3 Developer",
                  description: "Building the future of decentralized apps",
                  benefit: "AI-assisted workflow generation",
                  roi: "Early Access - Development Preview",
                  price: "Free during beta",
                },
                {
                  title: "DeFi Enthusiast",
                  description: "Exploring automated trading strategies",
                  benefit: "Test advanced automation concepts",
                  roi: "Early Access - Development Preview",
                  price: "Free during beta",
                },
                {
                  title: "Automation Pioneer",
                  description: "Want to explore Web3 automation",
                  benefit: "Shape product development",
                  roi: "Early Access - Development Preview",
                  price: "Free during beta",
                },
                {
                  title: "Enterprise Innovator",
                  description: "Evaluating Web3 integration",
                  benefit: "Preview enterprise features",
                  roi: "Early Access - Development Preview",
                  price: "Contact for preview",
                },
              ].map((segment, index) => (
                <div
                  key={segment.title}
                  className='rounded-xl border bg-background/50 backdrop-blur-sm p-6 shadow-sm hover:shadow-md transition-shadow'>
                  <h3 className='font-semibold text-lg mb-2'>
                    {segment.title}
                  </h3>
                  <p className='text-sm text-muted-foreground mb-3'>
                    {segment.description}
                  </p>
                  <p className='text-sm font-medium mb-2'>{segment.benefit}</p>
                  <p className='text-sm text-blue-600 font-bold mb-3'>
                    {segment.roi}
                  </p>
                  <p className='text-lg font-bold text-primary'>
                    {segment.price}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Stats section */}
        <section ref={statsRef} className='w-full py-20 md:py-28 lg:py-32'>
          <div className='container px-4 md:px-6'>
            <motion.div
              initial='hidden'
              animate={statsControls}
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
              }}>
              <div className='text-center mb-12'>
                <div className='inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-medium bg-background/50 backdrop-blur-sm mb-4'>
                  <span className='relative flex h-2 w-2 mr-2'>
                    <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75'></span>
                    <span className='relative inline-flex rounded-full h-2 w-2 bg-blue-500'></span>
                  </span>
                  <span className='mr-2'>🎯 Development Roadmap</span>
                  <span className='rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-semibold text-blue-600'>
                    VISION 2025
                  </span>
                </div>
                <h2 className='text-2xl font-bold leading-[1.1] sm:text-3xl md:text-4xl mb-2'>
                  <span className='bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600'>
                    Our Development Goals
                  </span>
                </h2>
                <p className='text-muted-foreground max-w-2xl mx-auto'>
                  Ambitious targets driving our development roadmap as we build
                  the future of Web3 automation
                </p>
              </div>
              <StatsCounterGroup />
            </motion.div>
          </div>
        </section>

        {/* Trust badges */}
        <section
          ref={trustRef}
          className='w-full py-20 md:py-28 lg:py-32 bg-muted/20'>
          <div className='container px-4 md:px-6'>
            <motion.div
              initial='hidden'
              animate={trustControls}
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
              }}>
              <TrustBadges />
            </motion.div>
          </div>
        </section>

        {/* Features section with animated cards */}
        <section
          ref={featuresRef}
          className='w-full py-20 md:py-28 lg:py-32 bg-gradient-to-b from-background to-muted/50'>
          <div className='container px-4 md:px-6'>
            <motion.div
              className='mx-auto flex max-w-[58rem] flex-col items-center justify-center gap-4 text-center'
              initial='hidden'
              animate={featuresControls}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.5 },
                },
              }}>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className='inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-medium mb-4'>
                <Sparkles className='mr-2 h-3.5 w-3.5 text-primary' />
                Powerful Features
              </motion.div>

              <h2 className='text-3xl font-bold leading-[1.1] sm:text-3xl md:text-5xl'>
                <span className='bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600'>
                  Built for the Future of Web3
                </span>
              </h2>

              <p className='max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7'>
                Advanced capabilities designed for next-generation Web3
                automation and AI-assisted workflows
              </p>
            </motion.div>

            <div className='mx-auto grid justify-center gap-6 sm:grid-cols-2 md:grid-cols-3 lg:gap-10 mt-16'>
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial='hidden'
                  animate={featuresControls}
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      transition: { duration: 0.5, delay: index * 0.1 },
                    },
                  }}>
                  <FeatureCard
                    title={feature.title}
                    description={feature.description}
                    icon={feature.icon}
                    gradientClass={feature.color}
                  />
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Real AI Block Examples */}
        <section className='w-full py-20 md:py-28 lg:py-32 bg-muted/20'>
          <div className='container px-4 md:px-6'>
            <div className='mx-auto flex max-w-[58rem] flex-col items-center justify-center gap-4 text-center mb-16'>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className='inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-medium mb-4'>
                <Sparkles className='mr-2 h-3.5 w-3.5 text-primary animate-pulse' />
                AI Workflow Examples
              </motion.div>

              <h2 className='text-3xl font-bold leading-[1.1] sm:text-3xl md:text-5xl'>
                <span className='bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600'>
                  AI-Generated Workflow Examples
                </span>
              </h2>

              <p className='max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7'>
                Example workflows demonstrating AI-assisted generation
                capabilities. These represent development concepts and beta
                features.
              </p>
            </div>

            <div className='grid gap-8 lg:grid-cols-2 mb-16'>
              {/* Example 1: DeFi Arbitrage */}
              <div className='bg-background/50 backdrop-blur-sm border rounded-xl p-8 shadow-lg'>
                <div className='mb-6'>
                  <div className='flex items-center mb-4'>
                    <div className='w-12 h-12 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-lg flex items-center justify-center mr-4'>
                      <Bot className='h-6 w-6 text-green-500' />
                    </div>
                    <div>
                      <h3 className='text-xl font-bold'>
                        Cross-Chain Arbitrage Hunter
                      </h3>
                      <p className='text-sm text-muted-foreground'>
                        Created from: "Monitor USDC price differences across
                        chains and alert on arbitrage opportunities"
                      </p>
                    </div>
                  </div>

                  <div className='bg-muted/50 rounded-lg p-4 mb-4'>
                    <p className='text-sm font-mono text-green-600'>
                      ✓ Monitor USDC price on Ethereum, Polygon, Arbitrum
                      <br />✓ Execute trades when spread {">"} 0.1%
                      <br />
                      ✓ Account for gas fees automatically
                      <br />✓ Risk management: Max $5,000 per trade
                    </p>
                  </div>

                  <div className='grid grid-cols-2 gap-4'>
                    <div className='bg-blue-500/10 border border-blue-500/20 rounded-lg p-3'>
                      <p className='text-sm font-semibold text-blue-600'>
                        Status
                      </p>
                      <p className='text-lg font-bold text-blue-600'>
                        Development Preview
                      </p>
                    </div>
                    <div className='bg-purple-500/10 border border-purple-500/20 rounded-lg p-3'>
                      <p className='text-sm font-semibold text-purple-600'>
                        Complexity
                      </p>
                      <p className='text-lg font-bold text-purple-600'>
                        Advanced
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Example 2: NFT Floor Tracker */}
              <div className='bg-background/50 backdrop-blur-sm border rounded-xl p-8 shadow-lg'>
                <div className='mb-6'>
                  <div className='flex items-center mb-4'>
                    <div className='w-12 h-12 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg flex items-center justify-center mr-4'>
                      <Bot className='h-6 w-6 text-purple-500' />
                    </div>
                    <div>
                      <h3 className='text-xl font-bold'>
                        Smart NFT Floor Sniper
                      </h3>
                      <p className='text-sm text-muted-foreground'>
                        Created from: "Alert me when NFTs drop 15% below average
                        floor price for potential opportunities"
                      </p>
                    </div>
                  </div>

                  <div className='bg-muted/50 rounded-lg p-4 mb-4'>
                    <p className='text-sm font-mono text-purple-600'>
                      ✓ Track 50+ collections in real-time
                      <br />
                      ✓ Calculate 7-day average floor price
                      <br />✓ Auto-buy when price drops {">"} 15%
                      <br />✓ Set max budget and collection limits
                    </p>
                  </div>

                  <div className='grid grid-cols-2 gap-4'>
                    <div className='bg-blue-500/10 border border-blue-500/20 rounded-lg p-3'>
                      <p className='text-sm font-semibold text-blue-600'>
                        Status
                      </p>
                      <p className='text-lg font-bold text-blue-600'>
                        Development Preview
                      </p>
                    </div>
                    <div className='bg-green-500/10 border border-green-500/20 rounded-lg p-3'>
                      <p className='text-sm font-semibold text-green-600'>
                        Complexity
                      </p>
                      <p className='text-lg font-bold text-green-600'>
                        Intermediate
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Block Creation Process */}
            <div className='bg-gradient-to-br from-primary/5 to-purple-500/5 border border-primary/20 rounded-2xl p-8 mb-12'>
              <h3 className='text-2xl font-bold mb-6 text-center'>
                How AI-Assisted Workflow Generation Works
              </h3>

              <div className='grid gap-6 md:grid-cols-4'>
                <div className='text-center'>
                  <div className='w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4'>
                    <span className='text-primary font-bold text-xl'>1</span>
                  </div>
                  <h4 className='font-semibold mb-2'>Describe Your Goal</h4>
                  <p className='text-sm text-muted-foreground'>
                    "I want to automatically buy ETH when it drops 10% in a day"
                  </p>
                </div>

                <div className='text-center'>
                  <div className='w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4'>
                    <span className='text-primary font-bold text-xl'>2</span>
                  </div>
                  <h4 className='font-semibold mb-2'>AI Analyzes Intent</h4>
                  <p className='text-sm text-muted-foreground'>
                    Understands price monitoring, percentage calculation, and
                    execution logic
                  </p>
                </div>

                <div className='text-center'>
                  <div className='w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4'>
                    <span className='text-primary font-bold text-xl'>3</span>
                  </div>
                  <h4 className='font-semibold mb-2'>Generates Block Code</h4>
                  <p className='text-sm text-muted-foreground'>
                    Creates smart contract interactions, API calls, and safety
                    checks
                  </p>
                </div>

                <div className='text-center'>
                  <div className='w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4'>
                    <span className='text-primary font-bold text-xl'>4</span>
                  </div>
                  <h4 className='font-semibold mb-2'>Block Goes Live</h4>
                  <p className='text-sm text-muted-foreground'>
                    Instantly deployed and earning money 24/7 while you sleep
                  </p>
                </div>
              </div>
            </div>

            <div className='text-center'>
              <GradientButton asChild size='lg' className='group'>
                <Link href='/login'>
                  Try AI Workflow Generation - Beta
                  <ArrowRight className='ml-2 h-4 w-4' />
                </Link>
              </GradientButton>
              <p className='text-sm text-muted-foreground mt-3'>
                Early beta testers create basic workflows quickly using natural
                language • No coding required
              </p>
            </div>
          </div>
        </section>

        {/* Interactive demo section (full width) */}
        <section
          ref={demoRef}
          className='w-full py-20 md:py-28 lg:py-32 relative overflow-hidden'>
          <div className='absolute inset-0 bg-gradient-to-b from-muted/50 to-background pointer-events-none' />

          <div className='container px-4 md:px-6 relative'>
            <motion.div
              className='mx-auto flex max-w-[58rem] flex-col items-center justify-center gap-4 text-center mb-16'
              initial='hidden'
              animate={demoControls}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.5 },
                },
              }}>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className='inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-medium mb-4'>
                <Bot className='mr-2 h-3.5 w-3.5 text-primary' />
                Try It Yourself
              </motion.div>

              <h2 className='text-3xl font-bold leading-[1.1] sm:text-3xl md:text-5xl'>
                <span className='bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600'>
                  See How Easy It Is to Make $1,000+ Weekly
                </span>
              </h2>

              <p className='max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7'>
                See how early adopters create Web3 automations using our visual
                builder. Development preview - features expanding rapidly.
              </p>
            </motion.div>

            <motion.div
              initial='hidden'
              animate={demoControls}
              variants={{
                hidden: { opacity: 0, y: 40 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.7, delay: 0.2 },
                },
              }}
              className='relative mx-auto max-w-4xl'>
              <InteractiveDemo />
            </motion.div>
          </div>
        </section>

        {/* Workflow preview section */}
        <section
          ref={workflowRef}
          className='w-full py-20 md:py-28 lg:py-32 relative overflow-hidden'>
          <div className='absolute inset-0 bg-gradient-to-b from-muted/50 to-background pointer-events-none' />

          <div className='container px-4 md:px-6 relative'>
            <motion.div
              className='mx-auto flex max-w-[58rem] flex-col items-center justify-center gap-4 text-center mb-16'
              initial='hidden'
              animate={workflowControls}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.5 },
                },
              }}>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className='inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-medium mb-4'>
                <Workflow className='mr-2 h-3.5 w-3.5 text-primary' />
                Visual Builder
              </motion.div>

              <h2 className='text-3xl font-bold leading-[1.1] sm:text-3xl md:text-5xl'>
                <span className='bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600'>
                  Build Workflows Visually
                </span>
              </h2>

              <p className='max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7'>
                Drag-and-drop interface to create complex blockchain workflows
                without code
              </p>
            </motion.div>

            <motion.div
              initial='hidden'
              animate={workflowControls}
              variants={{
                hidden: { opacity: 0, y: 40 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.7, delay: 0.2 },
                },
              }}
              className='relative mx-auto max-w-5xl'>
              <WorkflowPreview />
            </motion.div>
          </div>
        </section>

        {/* Partners section */}
        <section
          ref={partnersRef}
          className='w-full py-20 md:py-28 lg:py-32 bg-muted/20'>
          <div className='container px-4 md:px-6'>
            <motion.div
              initial='hidden'
              animate={partnersControls}
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1, transition: { duration: 0.5 } },
              }}>
              <PartnerLogos />
            </motion.div>
          </div>
        </section>

        {/* Testimonials section */}
        <section
          ref={testimonialsRef}
          className='w-full py-20 md:py-28 lg:py-32 bg-muted/30'>
          <div className='container px-4 md:px-6'>
            <motion.div
              className='mx-auto flex max-w-[58rem] flex-col items-center justify-center gap-4 text-center mb-16'
              initial='hidden'
              animate={testimonialsControls}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.5 },
                },
              }}>
              <h2 className='text-3xl font-bold leading-[1.1] sm:text-3xl md:text-5xl'>
                <span className='bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600'>
                  Real Results from Real Users
                </span>
              </h2>

              <p className='max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7'>
                Here's exactly how much money our users have made using Zzyra
                automation
              </p>
            </motion.div>

            <div className='mx-auto grid justify-center gap-8 sm:grid-cols-2 md:grid-cols-3 lg:gap-12'>
              {testimonials.map((testimonial, index) => (
                <motion.div
                  key={testimonial.name}
                  initial='hidden'
                  animate={testimonialsControls}
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      transition: { duration: 0.5, delay: index * 0.1 + 0.2 },
                    },
                  }}>
                  <TestimonialCard
                    name={testimonial.name}
                    role={testimonial.role}
                    content={testimonial.content}
                    avatar={testimonial.avatar}
                    rating={testimonial.rating}
                  />
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA section */}
        <section
          ref={ctaRef}
          className='w-full py-20 md:py-28 lg:py-32 relative overflow-hidden'>
          <div className='absolute inset-0 bg-gradient-to-b from-background to-primary/5 pointer-events-none' />

          <div className='container px-4 md:px-6 relative'>
            <motion.div
              className='mx-auto max-w-[58rem] rounded-2xl border bg-background/50 backdrop-blur-sm p-8 md:p-12 shadow-lg'
              initial='hidden'
              animate={ctaControls}
              variants={{
                hidden: { opacity: 0, y: 40 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.7 },
                },
              }}>
              <div className='grid gap-8 md:grid-cols-2'>
                <div className='flex flex-col items-start space-y-6'>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className='inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-medium mb-2'>
                    <Zap className='mr-2 h-3.5 w-3.5 text-primary' />
                    Ready to Get Started?
                  </motion.div>

                  <h2 className='text-3xl font-bold leading-[1.1] sm:text-3xl md:text-4xl'>
                    <span className='bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600'>
                      Join the Future of Web3 Automation
                    </span>
                  </h2>

                  <p className='text-muted-foreground sm:text-lg'>
                    Join early development community and help shape the future
                    of Web3 automation with AI-assisted workflows
                  </p>

                  <motion.div
                    className='flex flex-col sm:flex-row gap-4 w-full sm:w-auto'
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}>
                    <GradientButton asChild size='lg' className='group'>
                      <Link href='/login'>
                        <span className='hidden sm:inline'>
                          Join Development Preview
                        </span>
                        <span className='sm:hidden'>Join Beta</span>
                        <MotionDiv
                          initial={{ x: 0 }}
                          whileHover={{ x: 5 }}
                          transition={{
                            type: "spring",
                            stiffness: 400,
                            damping: 10,
                          }}>
                          <ArrowRight className='ml-2 h-4 w-4' />
                        </MotionDiv>
                      </Link>
                    </GradientButton>

                    <Button
                      asChild
                      variant='outline'
                      size='lg'
                      className='group'>
                      <Link href='/pricing'>
                        View Development Roadmap
                        <MotionDiv
                          initial={{ rotate: 0 }}
                          whileHover={{ rotate: 45 }}
                          transition={{ duration: 0.2 }}>
                          <ArrowUpRight className='ml-2 h-4 w-4' />
                        </MotionDiv>
                      </Link>
                    </Button>
                  </motion.div>
                </div>

                <div className='flex flex-col justify-center'>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}>
                    <CountdownTimer />
                  </motion.div>
                </div>
              </div>

              {/* Benefits list */}
              <motion.div
                className='mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-3'
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}>
                {[
                  "Join early development of next-generation Web3 automation",
                  "AI-assisted workflow generation with natural language commands",
                  "Visual drag-and-drop builder for complex blockchain operations",
                  "Multi-chain automation capabilities (development roadmap)",
                  "Real-time execution monitoring and workflow analytics",
                  "Community-driven template marketplace (planned feature)",
                ].map((benefit, index) => (
                  <motion.div
                    key={index}
                    className='flex items-center'
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.5 + index * 0.1 }}>
                    <Check className='mr-2 h-4 w-4 text-primary' />
                    <span className='text-sm font-medium'>{benefit}</span>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </section>
      </main>

      <div className='w-full h-16 bg-red-500/10 flex items-center justify-center z-50'>
        <p className='text-sm text-red-500'>
          * Zzyra is in still DEVELOPMENT stage and NONE of these are real
          results.
        </p>
      </div>

      {/* Footer with subtle animation */}
      <MotionFooter
        className='border-t py-8 md:py-12 bg-background/80 backdrop-blur-sm'
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}>
        <div className='container px-4 md:px-6'>
          <div className='grid gap-8 md:grid-cols-2 lg:grid-cols-4'>
            <div className='flex flex-col space-y-4'>
              <div className='flex items-center space-x-2'>
                <Zap className='h-5 w-5 text-primary' />
                <span className='font-bold text-lg'>Zzyra</span>
              </div>
              <p className='text-sm text-muted-foreground'>
                The next generation platform for Web3 automation and workflow
                orchestration.
              </p>
              <div className='flex space-x-4'>
                <MotionA
                  href='#'
                  className='text-muted-foreground hover:text-foreground transition-colors'
                  whileHover={{ scale: 1.1 }}>
                  <svg
                    className='h-5 w-5'
                    fill='currentColor'
                    viewBox='0 0 24 24'
                    aria-hidden='true'>
                    <path
                      fillRule='evenodd'
                      d='M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z'
                      clipRule='evenodd'
                    />
                  </svg>
                </MotionA>
                <MotionA
                  href='#'
                  className='text-muted-foreground hover:text-foreground transition-colors'
                  whileHover={{ scale: 1.1 }}>
                  <svg
                    className='h-5 w-5'
                    fill='currentColor'
                    viewBox='0 0 24 24'
                    aria-hidden='true'>
                    <path d='M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84' />
                  </svg>
                </MotionA>
                <MotionA
                  href='#'
                  className='text-muted-foreground hover:text-foreground transition-colors'
                  whileHover={{ scale: 1.1 }}>
                  <svg
                    className='h-5 w-5'
                    fill='currentColor'
                    viewBox='0 0 24 24'
                    aria-hidden='true'>
                    <path
                      fillRule='evenodd'
                      d='M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z'
                      clipRule='evenodd'
                    />
                  </svg>
                </MotionA>
              </div>
            </div>

            <div className='flex flex-col space-y-4'>
              <h3 className='font-medium'>Product</h3>
              <ul className='space-y-2 text-sm'>
                <li>
                  <Link
                    href='#'
                    className='text-muted-foreground hover:text-foreground transition-colors'>
                    Features
                  </Link>
                </li>
                <li>
                  <Link
                    href='#'
                    className='text-muted-foreground hover:text-foreground transition-colors'>
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link
                    href='#'
                    className='text-muted-foreground hover:text-foreground transition-colors'>
                    Templates
                  </Link>
                </li>
                <li>
                  <Link
                    href='#'
                    className='text-muted-foreground hover:text-foreground transition-colors'>
                    Integrations
                  </Link>
                </li>
              </ul>
            </div>

            <div className='flex flex-col space-y-4'>
              <h3 className='font-medium'>Resources</h3>
              <ul className='space-y-2 text-sm'>
                <li>
                  <Link
                    href='https://docs.zzyra.com'
                    className='text-muted-foreground hover:text-foreground transition-colors'>
                    Documentation
                  </Link>
                </li>
                <li>
                  <Link
                    href='https://docs.zzyra.com/api-reference'
                    className='text-muted-foreground hover:text-foreground transition-colors'>
                    API Reference
                  </Link>
                </li>
                <li>
                  <Link
                    href='https://zzyra.com/blog'
                    className='text-muted-foreground hover:text-foreground transition-colors'>
                    Blog
                  </Link>
                </li>
                <li>
                  <Link
                    href='#'
                    className='text-muted-foreground hover:text-foreground transition-colors'>
                    Community
                  </Link>
                </li>
              </ul>
            </div>

            <div className='flex flex-col space-y-4'>
              <h3 className='font-medium'>Company</h3>
              <ul className='space-y-2 text-sm'>
                <li>
                  <Link
                    href='#'
                    className='text-muted-foreground hover:text-foreground transition-colors'>
                    About
                  </Link>
                </li>
                <li>
                  <Link
                    href='#'
                    className='text-muted-foreground hover:text-foreground transition-colors'>
                    Careers
                  </Link>
                </li>
                <li>
                  <Link
                    href='#'
                    className='text-muted-foreground hover:text-foreground transition-colors'>
                    Contact
                  </Link>
                </li>
                <li>
                  <Link
                    href='#'
                    className='text-muted-foreground hover:text-foreground transition-colors'>
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className='mt-8 border-t pt-8 flex flex-col md:flex-row justify-between items-center'>
            <p className='text-center text-sm text-muted-foreground md:text-left'>
              © 2025 Zzyra. All rights reserved.
            </p>
            <div className='mt-4 md:mt-0'>
              <motion.button
                className='inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-medium bg-primary/10 text-primary'
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}>
                <Star className='mr-2 h-3.5 w-3.5' />
                Join our waitlist
              </motion.button>
            </div>
          </div>
        </div>
      </MotionFooter>
    </div>
  );
}
