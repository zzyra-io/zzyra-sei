"use client";

import type React from "react";

import { forwardRef } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const gradientButtonVariants = cva("relative overflow-hidden group", {
  variants: {
    variant: {
      default: "bg-primary text-primary-foreground hover:bg-primary/90",
      outline:
        "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      ghost: "hover:bg-accent hover:text-accent-foreground",
      link: "text-primary underline-offset-4 hover:underline",
    },
    size: {
      default: "h-10 px-4 py-2",
      sm: "h-9 rounded-md px-3",
      lg: "h-11 rounded-md px-8",
      icon: "h-10 w-10",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

export interface GradientButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof gradientButtonVariants> {
  asChild?: boolean;
}

const GradientButton = forwardRef<HTMLButtonElement, GradientButtonProps>(
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
    if (asChild) {
      return (
        <Slot
          className={cn(gradientButtonVariants({ variant, size, className }))}
          ref={ref}
          {...props}>
          <div className='relative'>
            {children}
            <motion.div
              as='div'
              className='absolute inset-0 -z-10 bg-gradient-to-r from-primary to-purple-600 opacity-100 group-hover:opacity-90'
              initial={{ opacity: 0.9 }}
              whileHover={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            />
          </div>
        </Slot>
      );
    }

    return (
      <Button
        className={cn(gradientButtonVariants({ variant, size, className }))}
        ref={ref}
        {...props}>
        {children}
        <motion.div
          as='div'
          className='absolute inset-0 -z-10 bg-gradient-to-r from-primary to-purple-600 opacity-100 group-hover:opacity-90'
          initial={{ opacity: 0.9 }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        />
      </Button>
    );
  }
);

GradientButton.displayName = "GradientButton";

export { GradientButton };
