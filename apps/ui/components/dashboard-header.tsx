"use client";

import { Logo } from "@/components/logo";
import { ModeToggle } from "@/components/mode-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { UserMenu } from "@/components/user-menu";
import { cn } from "@/lib/utils";
import { Blocks, FileText, Home, Layers, Menu, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NotificationBell } from "./NotificationBell";
import { ConnectKitButton } from "connectkit";

export function DashboardHeader() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Track scroll position for header styling
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    { name: "Builder", href: "/builder", icon: Layers, badge: "New" },
    { name: "Templates", href: "/templates", icon: FileText },
    { name: "Blocks Library", href: "/blocks/library", icon: Blocks },
    // { name: "Blockchain", href: "/blockchain", icon: Wallet },
  ];

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-200",
        isScrolled
          ? "border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
          : "bg-background"
      )}>
      <div className='flex h-16 items-center px-4 sm:px-6'>
        <div className='flex items-center'>
          <Link href='/dashboard' className='flex items-center'>
            <Logo className='h-8 w-8' />
            <span className='ml-2 text-xl font-bold'>Zzyra</span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className='ml-8 hidden lg:block'>
          <ul className='flex space-x-1'>
            {navigation.map((item) => {
              const isActive =
                pathname === item.href || pathname?.startsWith(`${item.href}/`);
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}>
                    <item.icon className='mr-2 h-4 w-4' />
                    {item.name}
                    {item.badge && (
                      <Badge
                        variant='default'
                        className='ml-2 px-1.5 py-0.5 h-5'>
                        {item.badge}
                      </Badge>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Search Bar - Desktop */}
        <div className='ml-auto   w-auto  hidden md:flex items-center relative max-w-md  mr-4'>
          <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-2 text-muted-foreground' />
          <Input
            placeholder='Search workflows, templates...'
            className='pl-10 h-9 bg-muted/50 border-muted focus-visible:bg-background'
          />
        </div>

        <div className='ml-auto flex items-center space-x-2'>
          {/* Notifications */}

          <NotificationBell />

          {/* Theme Toggle */}
          <ConnectKitButton showAvatar={true} showBalance={true} />
          <ModeToggle />

          {/* User Menu */}
          <UserMenu />

          {/* Mobile Menu Trigger */}
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant='ghost' size='icon' className='lg:hidden'>
                <Menu className='h-6 w-6' />
              </Button>
            </SheetTrigger>
            <SheetContent side='left' className='w-72 sm:w-80'>
              <div className='flex items-center justify-between mb-6'>
                <Link
                  href='/dashboard'
                  className='flex items-center'
                  onClick={() => setIsMobileMenuOpen(false)}>
                  <Logo className='h-6 w-6' />
                  <span className='ml-2 text-lg font-bold'>Zzyra</span>
                </Link>
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={() => setIsMobileMenuOpen(false)}>
                  <X className='h-5 w-5' />
                </Button>
              </div>
              <nav className='flex flex-col space-y-1'>
                {navigation.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    pathname?.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center px-3 py-3 text-sm font-medium rounded-md",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}>
                      <item.icon className='mr-3 h-5 w-5' />
                      {item.name}
                      {item.badge && (
                        <Badge variant='default' className='ml-auto'>
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
