import React from "react";
import { Badge } from "./badge";
import { cn } from "@/lib/utils";

interface TemplateVariableProps {
  children: string;
  className?: string;
  variant?: "default" | "secondary" | "outline" | "destructive";
  size?: "sm" | "default" | "lg";
}

/**
 * Component for displaying template variables with visual distinction
 * Examples: {{data.price}}, {{json.email}}, {{config.userEmail}}
 */
export function TemplateVariable({
  children,
  className,
  variant = "secondary",
  size = "sm",
}: TemplateVariableProps) {
  // Extract the template variable pattern
  const templatePattern = /\{\{([^}]+)\}\}/g;

  if (!templatePattern.test(children)) {
    return <span className={className}>{children}</span>;
  }

  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {children.split(/(\{\{[^}]+\}\})/).map((part, index) => {
        if (part.match(/\{\{[^}]+\}\}/)) {
          return (
            <Badge
              key={index}
              variant={variant}
              size={size}
              className='font-mono text-xs bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 border-purple-200 hover:from-purple-200 hover:to-blue-200 transition-colors'>
              {part}
            </Badge>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
}

/**
 * Component for displaying template variables in a more compact inline format
 */
export function InlineTemplateVariable({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  const templatePattern = /\{\{([^}]+)\}\}/g;

  if (!templatePattern.test(children)) {
    return <span className={className}>{children}</span>;
  }

  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {children.split(/(\{\{[^}]+\}\})/).map((part, index) => {
        if (part.match(/\{\{[^}]+\}\}/)) {
          return (
            <code
              key={index}
              className='px-1.5 py-0.5 text-xs font-mono bg-gradient-to-r from-purple-50 to-blue-50 text-purple-600 border border-purple-200 rounded'>
              {part}
            </code>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
}

/**
 * Component for displaying template variables in text areas and inputs
 */
export function TemplateVariableText({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  const templatePattern = /\{\{([^}]+)\}\}/g;

  if (!templatePattern.test(children)) {
    return <span className={className}>{children}</span>;
  }

  return (
    <span className={cn("whitespace-pre-wrap", className)}>
      {children.split(/(\{\{[^}]+\}\})/).map((part, index) => {
        if (part.match(/\{\{[^}]+\}\}/)) {
          return (
            <span
              key={index}
              className='px-1 py-0.5 text-xs font-mono bg-gradient-to-r from-purple-50 to-blue-50 text-purple-600 border border-purple-200 rounded'>
              {part}
            </span>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
}
