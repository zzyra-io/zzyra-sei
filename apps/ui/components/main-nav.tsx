"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Braces, BookOpen, Library, Blocks, Workflow, Home, Settings, ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export function MainNav({ className }: { className?: string }) {
  const pathname = usePathname()
  
  const routes = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: Home,
      active: pathname === "/dashboard",
    },
    {
      name: "Workflows",
      href: "/workflows",
      icon: Workflow,
      active: pathname.startsWith("/workflows"),
    },
    {
      name: "Block Library",
      href: "/blocks/library",
      icon: Library,
      active: pathname.startsWith("/blocks"),
      badge: "New",
    },
    {
      name: "Documentation",
      href: "/docs",
      icon: BookOpen,
      active: pathname.startsWith("/docs"),
    },
    {
      name: "Settings",
      href: "/settings",
      icon: Settings,
      active: pathname.startsWith("/settings"),
    }
  ]

  return (
    <nav className={cn("flex flex-col", className)}>
      <div className="space-y-1">
        {routes.map((route) => (
          <TooltipProvider key={route.href} delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href={route.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-all duration-200 group",
                    route.active
                      ? "bg-gradient-to-r from-primary to-purple-600 text-primary-foreground shadow-md"
                      : "hover:bg-gradient-to-r hover:from-primary/10 hover:to-purple-500/10 hover:text-accent-foreground"
                  )}
                >
                  <route.icon className="h-4 w-4" />
                  <span>{route.name}</span>
                  {route.badge && (
                    <Badge variant="outline" className={cn(
                      "ml-auto text-xs py-0 px-1.5 transition-all",
                      route.active 
                        ? "border-primary-foreground bg-white/20 text-primary-foreground" 
                        : "bg-gradient-to-r from-primary/20 to-purple-500/20 border-primary text-primary group-hover:from-primary/30 group-hover:to-purple-500/30"
                    )}>
                      {route.badge}
                    </Badge>
                  )}
                  {route.active && <ChevronRight className="ml-auto h-4 w-4" />}
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">
                {route.name}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
    </nav>
  )
}
