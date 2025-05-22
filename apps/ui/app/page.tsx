"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  motion,
  useAnimation,
  useInView,
  AnimatePresence,
} from "framer-motion";
import {
  ArrowRight,
  LucideLayoutDashboard,
  Zap,
  Bot,
  Layers,
  Workflow,
  Sparkles,
  ChevronRight,
  ArrowUpRight,
  Blocks,
  Cpu,
  Shield,
  Star,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroAnimation } from "@/components/hero-animation";
import { FeatureCard } from "@/components/feature-card";
import { WorkflowPreview } from "@/components/workflow-preview";
import { TestimonialCard } from "@/components/testimonial-card";
import { GradientButton } from "@/components/gradient-button";
import { FloatingParticles } from "@/components/floating-particles";
import { InteractiveDemo } from "@/components/interactive-demo";
import { StatsCounterGroup } from "@/components/stats-counter";
import { TrustBadges } from "@/components/trust-badges";
import { PartnerLogos } from "@/components/partner-logos";
import { CountdownTimer } from "@/components/countdown-timer";
import { useSession } from "next-auth/react";

export default function HomePage() {
  const { data: session } = useSession();
  const [scrollY, setScrollY] = useState(0);
  const [showInteractiveDemo, setShowInteractiveDemo] = useState(false);

  // Refs for scroll animations
  const heroRef = useRef(null);
  const statsRef = useRef(null);
  const featuresRef = useRef(null);
  const demoRef = useRef(null);
  const workflowRef = useRef(null);
  const trustRef = useRef(null);
  const testimonialsRef = useRef(null);
  const partnersRef = useRef(null);
  const ctaRef = useRef(null);

  // Check if elements are in view
  const heroInView = useInView(heroRef, { once: false, amount: 0.2 });
  const statsInView = useInView(statsRef, { once: false, amount: 0.2 });
  const featuresInView = useInView(featuresRef, { once: false, amount: 0.2 });
  const demoInView = useInView(demoRef, { once: false, amount: 0.2 });
  const workflowInView = useInView(workflowRef, { once: false, amount: 0.2 });
  const trustInView = useInView(trustRef, { once: false, amount: 0.2 });
  const testimonialsInView = useInView(testimonialsRef, {
    once: false,
    amount: 0.2,
  });
  const partnersInView = useInView(partnersRef, { once: false, amount: 0.2 });
  const ctaInView = useInView(ctaRef, { once: false, amount: 0.2 });

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

  // Handle scroll events
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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

  // Features data
  const features = [
    {
      title: "AI Assistance",
      description:
        "Get intelligent recommendations for your workflows powered by advanced AI",
      icon: Sparkles,
      color: "from-purple-500 to-pink-500",
    },
    {
      title: "Visual Builder",
      description:
        "Drag-and-drop interface to create complex blockchain workflows without code",
      icon: Blocks,
      color: "from-blue-500 to-cyan-400",
    },
    {
      title: "Multi-Chain Support",
      description:
        "Connect and automate across multiple blockchains seamlessly",
      icon: Layers,
      color: "from-emerald-500 to-teal-400",
    },
    {
      title: "Smart Agents",
      description:
        "Autonomous agents that execute your workflows with precision",
      icon: Bot,
      color: "from-orange-500 to-amber-400",
    },
    {
      title: "Error Handling",
      description:
        "Intelligent error detection and recovery for reliable automation",
      icon: Shield,
      color: "from-red-500 to-rose-400",
    },
    {
      title: "Analytics",
      description:
        "Comprehensive insights into your workflow performance and optimization",
      icon: Cpu,
      color: "from-indigo-500 to-violet-400",
    },
  ];

  // Testimonials data
  const testimonials = [
    {
      name: "Alex Chen",
      role: "DeFi Trader",
      content:
        "Zyra has completely transformed how I manage my DeFi positions. The automation saves me hours every day and has increased my returns by 32%.",
      avatar: "/placeholder.svg?height=80&width=80",
      rating: 5,
    },
    {
      name: "Sarah Johnson",
      role: "NFT Creator",
      content:
        "As an artist, I can focus on creating while Zyra handles all my NFT drops and collection management. It's like having a full-time assistant.",
      avatar: "/placeholder.svg?height=80&width=80",
      rating: 5,
    },
    {
      name: "Michael Rodriguez",
      role: "Protocol Developer",
      content:
        "The multi-chain support and error handling capabilities are game-changers for our protocol operations. We've reduced downtime by 95%.",
      avatar: "/placeholder.svg?height=80&width=80",
      rating: 5,
    },
  ];

  return (
    <div className='flex min-h-screen flex-col overflow-hidden'>
      {/* Floating particles background */}
      <div className='fixed inset-0 pointer-events-none z-0'>
        <FloatingParticles />
      </div>

      {/* Header with glass effect */}
      <motion.header
        className='sticky top-0 z-50 w-full border-b backdrop-blur-lg bg-background/70'
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}>
        <div className='container flex h-16 items-center justify-between'>
          <motion.div
            className='flex items-center space-x-4'
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}>
            <Link href='/' className='font-bold text-xl flex items-center'>
              <Zap className='mr-2 h-5 w-5 text-primary' />
              <span className='bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600'>
                Zyra
              </span>
            </Link>
          </motion.div>

          <div className='flex items-center space-x-4'>
            <AnimatePresence>
              {session ? (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}>
                  <Button variant='outline' className='group'>
                    <LucideLayoutDashboard className='mr-2 h-4 w-4 transition-transform group-hover:scale-110' />
                    <Link href='/dashboard'>Dashboard</Link>
                    <motion.div
                      className='absolute inset-0 rounded-md bg-primary/10'
                      initial={{ scale: 0 }}
                      whileHover={{ scale: 1 }}
                      transition={{ duration: 0.2 }}
                    />
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}>
                  <GradientButton asChild variant='outline'>
                    <Link href='/login'>Login</Link>
                  </GradientButton>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.header>

      <main className='flex-1 relative z-10'>
        {/* Hero section with animated elements */}
        <section
          ref={heroRef}
          className='w-full py-20 md:py-28 lg:py-32 relative overflow-hidden'>
          <div className='absolute inset-0 bg-gradient-to-b from-primary/5 to-background/0 pointer-events-none' />

          <div className='container px-4 md:px-6 relative'>
            <div className='grid gap-6 lg:grid-cols-2 lg:gap-12 xl:grid-cols-2'>
              <motion.div
                className='flex flex-col justify-center space-y-6'
                initial='hidden'
                animate={heroControls}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
                }}>
                <div className='space-y-4'>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className='inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-medium bg-background/50 backdrop-blur-sm'>
                    <span className='relative flex h-2 w-2 mr-2'>
                      <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75'></span>
                      <span className='relative inline-flex rounded-full h-2 w-2 bg-primary'></span>
                    </span>
                    <span className='mr-2'>Introducing Web3 Automation</span>
                    <span className='rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary'>
                      NEW
                    </span>
                  </motion.div>

                  <motion.h1
                    className='text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl/none'
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 }}>
                    <span className='bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600'>
                      Automate Your Web3 Workflows
                    </span>
                  </motion.h1>

                  <motion.p
                    className='max-w-[600px] text-muted-foreground md:text-xl'
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.5 }}>
                    Build powerful automation workflows for blockchain
                    operations with AI assistance. Save time, reduce errors, and
                    unlock new possibilities.
                  </motion.p>
                </div>

                <motion.div
                  className='flex flex-col gap-3 min-[400px]:flex-row'
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.6 }}>
                  <GradientButton asChild size='lg' className='group'>
                    <Link href='/login'>
                      Get Started Free
                      <motion.div
                        initial={{ x: 0 }}
                        whileHover={{ x: 5 }}
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 10,
                        }}>
                        <ArrowRight className='ml-2 h-4 w-4' />
                      </motion.div>
                    </Link>
                  </GradientButton>

                  <Button
                    variant='outline'
                    size='lg'
                    className='group'
                    onClick={() => setShowInteractiveDemo(true)}>
                    Try Interactive Demo
                    <motion.span
                      initial={{ opacity: 0, x: -5 }}
                      whileHover={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2 }}>
                      <ChevronRight className='ml-1 h-4 w-4' />
                    </motion.span>
                  </Button>
                </motion.div>

                <motion.div
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
                </motion.div>
              </motion.div>

              <motion.div
                className='flex items-center justify-center'
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.7 }}>
                {showInteractiveDemo ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className='w-full max-w-[500px]'>
                    <InteractiveDemo />
                  </motion.div>
                ) : (
                  <HeroAnimation />
                )}
              </motion.div>
            </div>
          </div>
        </section>

        {/* Stats section */}
        <section ref={statsRef} className='w-full py-12 md:py-16'>
          <div className='container px-4 md:px-6'>
            <motion.div
              initial='hidden'
              animate={statsControls}
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
              }}>
              <StatsCounterGroup />
            </motion.div>
          </div>
        </section>

        {/* Trust badges */}
        <section ref={trustRef} className='w-full py-12 md:py-16 bg-muted/20'>
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
                  Supercharge Your Web3 Experience
                </span>
              </h2>

              <p className='max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7'>
                Powerful tools to automate your blockchain operations with
                intelligence and precision
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
                  Create Your First Workflow
                </span>
              </h2>

              <p className='max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7'>
                Experience the power of Zyra with our interactive demo. No
                signup required.
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
          className='w-full py-16 md:py-20 bg-muted/20'>
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
                  Trusted by Web3 Pioneers
                </span>
              </h2>

              <p className='max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7'>
                See what our users are saying about Zyra
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
                      Transform Your Web3 Experience Today
                    </span>
                  </h2>

                  <p className='text-muted-foreground sm:text-lg'>
                    Join thousands of users who are automating their blockchain
                    operations with Zyra
                  </p>

                  <motion.div
                    className='flex flex-col sm:flex-row gap-4 w-full sm:w-auto'
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}>
                    <GradientButton asChild size='lg' className='group'>
                      <Link href='/login'>
                        Start Building
                        <motion.div
                          initial={{ x: 0 }}
                          whileHover={{ x: 5 }}
                          transition={{
                            type: "spring",
                            stiffness: 400,
                            damping: 10,
                          }}>
                          <ArrowRight className='ml-2 h-4 w-4' />
                        </motion.div>
                      </Link>
                    </GradientButton>

                    <Button
                      asChild
                      variant='outline'
                      size='lg'
                      className='group'>
                      <Link href='/templates'>
                        View Demo
                        <motion.div
                          initial={{ rotate: 0 }}
                          whileHover={{ rotate: 45 }}
                          transition={{ duration: 0.2 }}>
                          <ArrowUpRight className='ml-2 h-4 w-4' />
                        </motion.div>
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
                  "Save 20+ hours per week on manual tasks",
                  "Reduce operational errors by up to 95%",
                  "Execute transactions at optimal gas prices",
                  "Never miss a profitable opportunity",
                  "Secure multi-signature approval workflows",
                  "Real-time monitoring and alerts",
                ].map((benefit, index) => (
                  <motion.div
                    key={index}
                    className='flex items-center'
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.5 + index * 0.1 }}>
                    <Check className='mr-2 h-4 w-4 text-primary' />
                    <span className='text-sm'>{benefit}</span>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer with subtle animation */}
      <motion.footer
        className='border-t py-8 md:py-12 bg-background/80 backdrop-blur-sm'
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}>
        <div className='container px-4 md:px-6'>
          <div className='grid gap-8 md:grid-cols-2 lg:grid-cols-4'>
            <div className='flex flex-col space-y-4'>
              <div className='flex items-center space-x-2'>
                <Zap className='h-5 w-5 text-primary' />
                <span className='font-bold text-lg'>Zyra</span>
              </div>
              <p className='text-sm text-muted-foreground'>
                The next generation platform for Web3 automation and workflow
                orchestration.
              </p>
              <div className='flex space-x-4'>
                <motion.a
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
                </motion.a>
                <motion.a
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
                </motion.a>
                <motion.a
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
                </motion.a>
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
                    href='#'
                    className='text-muted-foreground hover:text-foreground transition-colors'>
                    Documentation
                  </Link>
                </li>
                <li>
                  <Link
                    href='#'
                    className='text-muted-foreground hover:text-foreground transition-colors'>
                    API Reference
                  </Link>
                </li>
                <li>
                  <Link
                    href='#'
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
              © 2025 Zyra. All rights reserved.
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
      </motion.footer>
    </div>
  );
}
