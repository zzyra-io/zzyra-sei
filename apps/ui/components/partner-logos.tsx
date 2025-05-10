"use client"

import { motion } from "framer-motion"

export function PartnerLogos() {
  // In a real app, you would use actual partner logos
  const partners = [
    { name: "Ethereum", color: "bg-blue-500" },
    { name: "Polygon", color: "bg-purple-500" },
    { name: "Solana", color: "bg-green-500" },
    { name: "Avalanche", color: "bg-red-500" },
    { name: "Binance", color: "bg-yellow-500" },
    { name: "Arbitrum", color: "bg-blue-400" },
  ]

  return (
    <div className="py-8">
      <div className="mb-6 text-center">
        <h3 className="text-lg font-medium">Trusted by leading protocols</h3>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-6 md:gap-8">
        {partners.map((partner, index) => (
          <motion.div
            key={partner.name}
            className="flex h-12 w-32 items-center justify-center rounded-lg border bg-background/80 px-4 backdrop-blur-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            whileHover={{ y: -5, boxShadow: "0 10px 30px -15px rgba(0, 0, 0, 0.1)" }}
          >
            <div className={`mr-2 h-6 w-6 rounded-full ${partner.color}`}></div>
            <span className="font-medium">{partner.name}</span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
