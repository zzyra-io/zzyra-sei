"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import type { WorkflowTemplate } from "@/lib/services/template-service"
import { Crown, ArrowRight } from "lucide-react"

interface TemplateCardProps {
  template: WorkflowTemplate
  onUse: () => void
}

export function TemplateCard({ template, onUse }: TemplateCardProps) {
  return (
    <Card className="flex flex-col overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="line-clamp-1 text-lg">{template.name}</CardTitle>
            <CardDescription className="line-clamp-1">{template.category}</CardDescription>
          </div>
          {template.is_premium && (
            <Badge variant="default" className="bg-amber-500 hover:bg-amber-600">
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
        <Button onClick={onUse} className="mt-2 w-full">
          Use Template
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  )
}
