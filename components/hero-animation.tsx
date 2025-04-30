"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

export function HeroAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isInteracting, setIsInteracting] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas dimensions
    const setCanvasDimensions = () => {
      const devicePixelRatio = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();

      canvas.width = rect.width * devicePixelRatio;
      canvas.height = rect.height * devicePixelRatio;

      ctx.scale(devicePixelRatio, devicePixelRatio);
    };

    setCanvasDimensions();
    window.addEventListener("resize", setCanvasDimensions);

    // Animation variables
    const nodes: Node[] = [];
    const connections: Connection[] = [];
    const NUM_NODES = 15;
    const CONNECTION_DISTANCE = 120;
    const NODE_RADIUS = 6;
    const COLORS = [
      "#7c3aed", // purple-600
      "#8b5cf6", // violet-500
      "#3b82f6", // blue-500
      "#06b6d4", // cyan-500
      "#10b981", // emerald-500
    ];

    // Define node and connection types
    interface Node {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      color: string;
    }

    interface Connection {
      from: Node;
      to: Node;
      opacity: number;
    }

    // Create nodes
    for (let i = 0; i < NUM_NODES; i++) {
      const x = (Math.random() * canvas.width) / window.devicePixelRatio;
      const y = (Math.random() * canvas.height) / window.devicePixelRatio;
      const vx = (Math.random() - 0.5) * 1;
      const vy = (Math.random() - 0.5) * 1;
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];

      nodes.push({ x, y, vx, vy, radius: NODE_RADIUS, color });
    }

    // Animation loop
    let animationFrameId: number;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update node positions
      nodes.forEach((node) => {
        // If mouse is interacting, attract nodes to mouse position
        if (isInteracting) {
          const dx = mousePosition.x - node.x;
          const dy = mousePosition.y - node.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 200) {
            node.vx += dx * 0.001;
            node.vy += dy * 0.001;
          }
        }

        node.x += node.vx;
        node.y += node.vy;

        // Apply friction
        node.vx *= 0.99;
        node.vy *= 0.99;

        // Bounce off edges
        if (
          node.x < node.radius ||
          node.x > canvas.width / window.devicePixelRatio - node.radius
        ) {
          node.vx *= -1;
        }

        if (
          node.y < node.radius ||
          node.y > canvas.height / window.devicePixelRatio - node.radius
        ) {
          node.vy *= -1;
        }

        // Draw node
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.fill();
      });

      // Clear connections
      connections.length = 0;

      // Create connections between nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < CONNECTION_DISTANCE) {
            connections.push({
              from: nodes[i],
              to: nodes[j],
              opacity: 1 - distance / CONNECTION_DISTANCE,
            });
          }
        }
      }

      // Draw connections
      connections.forEach((connection) => {
        ctx.beginPath();
        ctx.moveTo(connection.from.x, connection.from.y);
        ctx.lineTo(connection.to.x, connection.to.y);
        ctx.strokeStyle = `rgba(124, 58, 237, ${connection.opacity * 0.5})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    // Handle mouse interactions
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      setMousePosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    };

    const handleMouseEnter = () => {
      setIsInteracting(true);
    };

    const handleMouseLeave = () => {
      setIsInteracting(false);
    };

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseenter", handleMouseEnter);
    canvas.addEventListener("mouseleave", handleMouseLeave);

    // Cleanup
    return () => {
      window.removeEventListener("resize", setCanvasDimensions);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseenter", handleMouseEnter);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isInteracting, mousePosition]);

  return (
    <motion.div
      className='relative h-[400px] w-[400px] rounded-xl border bg-background/50 p-2 shadow-lg backdrop-blur-sm'
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      whileHover={{ scale: 1.02 }}>
      <canvas
        ref={canvasRef}
        className='absolute inset-0 w-full h-full rounded-lg cursor-pointer'
        style={{ width: "100%", height: "100%" }}
      />
      <div className='absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10'>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className='text-2xl font-bold mb-2'>
          <span className='bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600'>
            Web3 Automation
          </span>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className='text-sm text-muted-foreground mb-6'>
          Powered by AI
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className='flex flex-col gap-3 w-full max-w-[250px]'>
          <div className='h-8 rounded-md bg-primary/10 animate-pulse' />
          <div className='h-8 rounded-md bg-primary/10 animate-pulse' />
          <div className='h-8 rounded-md bg-primary/10 animate-pulse' />
        </motion.div>
      </div>
    </motion.div>
  );
}
