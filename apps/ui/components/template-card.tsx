"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import type { WorkflowTemplate } from "@/lib/services/template-service"
import { Crown, ArrowRight, Sparkles } from "lucide-react"
import { motion } from "framer-motion"

interface TemplateCardProps {
  template: WorkflowTemplate
  onUse: () => void
}

export function TemplateCard({ template, onUse }: TemplateCardProps) {
  return (
    <motion.div
      className="group relative"
      whileHover={{ y: -5 }}
      transition={{ type: "spring", stiffness: 400, damping: 10 }}
    >
      <Card className="relative flex flex-col overflow-hidden border bg-background/50 backdrop-blur-sm transition-all hover:shadow-lg">
        {/* Gradient overlay on hover */}
        <motion.div
          className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 to-purple-500/5 opacity-0 group-hover:opacity-100"
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
        
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="line-clamp-1 text-lg bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground group-hover:from-primary group-hover:to-purple-600 transition-all duration-300">
                {template.name}
              </CardTitle>
              <CardDescription className="line-clamp-1 flex items-center">
                <Sparkles className="mr-1 h-3 w-3 text-primary opacity-60" />
                {template.category}
              </CardDescription>
            </div>
            {template.is_premium && (
              <Badge variant="default" className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 border-0">
                <Crown className="mr-1 h-3 w-3" />
                Premium
              </Badge>
            )}
          </div>
        </CardHeader>
      <CardContent className="flex-1 pb-2">
        <p className="line-clamp-3 text-sm text-muted-foreground">{template.description}</p>
      </CardContent>
      <CardFooter className="flex flex-col items-start gap-2 pt-2">
        {template.tags && template.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {template.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {template.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{template.tags.length - 3}
              </Badge>
            )}
          </div>
        )}
        <motion.div className="mt-2 w-full" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button 
            onClick={onUse} 
            className="relative w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 border-0 group"
          >
            Use Template
            <motion.div
              initial={{ x: 0 }}
              whileHover={{ x: 3 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <ArrowRight className="ml-2 h-4 w-4" />
            </motion.div>
          </Button>
        </motion.div>
      </CardFooter>
      </Card>
    </motion.div>
  )
}
