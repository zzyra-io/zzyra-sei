"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface InteractiveButtonProps extends React.ComponentPropsWithoutRef<typeof Button> {
  scaleOnHover?: boolean
  scaleOnTap?: boolean
  shiftOnTap?: boolean
  ripple?: boolean
}

export const InteractiveButton = React.forwardRef<HTMLButtonElement, InteractiveButtonProps>(
  (
    { className, scaleOnHover = true, scaleOnTap = true, shiftOnTap = false, ripple = false, children, ...props },
    ref,
  ) => {
    const [rippleEffect, setRippleEffect] = React.useState<{ x: number; y: number; visible: boolean }>({
      x: 0,
      y: 0,
      visible: false,
    })

    const handleRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!ripple) return

      const rect = e.currentTarget.getBoundingClientRect()

      setRippleEffect({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        visible: true,
      })

      setTimeout(() => {
        setRippleEffect((prev) => ({ ...prev, visible: false }))
      }, 600)
    }

    return (
      <motion.div
        whileHover={scaleOnHover ? { scale: 1.02 } : undefined}
        whileTap={scaleOnTap ? { scale: 0.98 } : shiftOnTap ? { y: 2 } : undefined}
        className={cn("relative overflow-hidden", className)}
      >
        <Button className={cn("relative z-10")} onClick={handleRipple} ref={ref} {...props}>
          {children}
        </Button>

        {ripple && rippleEffect.visible && (
          <motion.div
            initial={{ scale: 0, opacity: 0.7 }}
            animate={{ scale: 4, opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute rounded-full bg-primary/20 w-12 h-12 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{
              left: rippleEffect.x,
              top: rippleEffect.y,
              zIndex: 0,
            }}
          />
        )}
      </motion.div>
    )
  },
)

InteractiveButton.displayName = "InteractiveButton"
