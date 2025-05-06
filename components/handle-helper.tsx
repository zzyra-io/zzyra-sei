"use client";

import { memo, useCallback, useState } from "react";
import { Handle, Position } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface HandleHelperProps {
  type: "source" | "target";
  position: Position;
  id: string;
  isConnectable: boolean;
  handleColor: string;
  label?: string;
  isEnabled?: boolean;
  isSelected?: boolean;
  pulse?: boolean;
  status?: string;
}

export const HandleHelper = memo(
  ({
    type,
    position,
    id,
    isConnectable,
    handleColor,
    label,
    isEnabled = true,
    isSelected = false,
    pulse = false,
    status = 'idle',
  }: HandleHelperProps) => {
    const [isHovered, setIsHovered] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const isLeft = position === Position.Left;
    const isRight = position === Position.Right;
    const isTop = position === Position.Top;
    const isBottom = position === Position.Bottom;

    const getTooltipPosition = useCallback(() => {
      if (isLeft) return "left-0 transform -translate-x-full -translate-y-1/2";
      if (isRight) return "right-0 transform translate-x-full -translate-y-1/2";
      if (isTop) return "top-0 transform -translate-y-full -translate-x-1/2";
      if (isBottom)
        return "bottom-0 transform translate-y-full -translate-x-1/2";
      return "";
    }, [isLeft, isRight, isTop, isBottom]);

    const getConnectorPosition = useCallback(() => {
      if (isLeft) return "right-0 transform translate-x-1/2 -translate-y-1/2";
      if (isRight) return "left-0 transform -translate-x-1/2 -translate-y-1/2";
      if (isTop) return "bottom-0 transform -translate-x-1/2 translate-y-1/2";
      if (isBottom) return "top-0 transform -translate-x-1/2 -translate-y-1/2";
      return "";
    }, [isLeft, isRight, isTop, isBottom]);

    return (
      <div
        className='absolute flex items-center justify-center'
        style={{
          width: 30,
          height: 30,
          left: isLeft ? -15 : isRight ? "auto" : "50%",
          right: isRight ? -15 : "auto",
          top: isTop ? -15 : isBottom ? "auto" : "50%",
          bottom: isBottom ? -15 : "auto",
          transform:
            isLeft || isRight
              ? "translateY(-50%)"
              : isTop || isBottom
              ? "translateX(-50%)"
              : "none",
          zIndex: isHovered || isDragging ? 100 : 10,
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}>
        <div
          className='absolute inset-0 rounded-full'
          style={{ cursor: isConnectable ? "crosshair" : "not-allowed" }}
        />
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 0.15, scale: 1.5 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className='absolute rounded-full'
              style={{ width: 24, height: 24, backgroundColor: handleColor }}
            />
          )}
        </AnimatePresence>
        <Handle
          type={type}
          position={position}
          id={id}
          isConnectable={isConnectable && isEnabled}
          className={cn(
            "!h-5 !w-5 !bg-background !border-2 transition-all duration-300",
            isEnabled
              ? `!border-[${handleColor}]`
              : "!border-muted-foreground opacity-50",
            (isSelected || isHovered) && "!scale-110",
            isDragging && "!scale-125",
            pulse && status !== 'idle' && "animate-pulse"
          )}
          style={{
            boxShadow: `0 0 0 4px rgba(255, 255, 255, ${
              isHovered ? 0.6 : 0.3
            })`,
            borderColor: handleColor,
          }}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
        />
        <AnimatePresence>
          {/* Status-based glow effect */}
          {status !== 'idle' && pulse && (
            <motion.div
              key={`status-${status}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 0.5, scale: 1.8 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ repeat: Infinity, repeatType: "reverse", duration: 1 }}
              className='absolute rounded-full'
              style={{ width: 20, height: 20, backgroundColor: handleColor }}
            />
          )}
          {isHovered && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              className={cn(
                "absolute w-2 h-2 rounded-full",
                getConnectorPosition()
              )}
              style={{ backgroundColor: handleColor }}
            />
          )}
        </AnimatePresence>
        <AnimatePresence>
          {isHovered && label && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className={cn(
                "absolute px-2 py-1 text-xs rounded whitespace-nowrap bg-white dark:bg-slate-800 shadow-md border z-50",
                getTooltipPosition()
              )}
              style={{ borderColor: handleColor, color: handleColor }}>
              {label}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

HandleHelper.displayName = "HandleHelper";
