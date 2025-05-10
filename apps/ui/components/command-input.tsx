"use client"

import type React from "react"

import { useState } from "react"
import { Loader2, SendHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface CommandInputProps {
  onGenerate: (prompt: string) => Promise<void>
  isGenerating: boolean
}

export function CommandInput({ onGenerate, isGenerating }: CommandInputProps) {
  const [prompt, setPrompt] = useState("")
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim() || isGenerating) return

    setError(null)
    try {
      await onGenerate(prompt)
      setPrompt("")
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to generate workflow")
    }
  }

  return (
    <div className="fixed bottom-8 left-1/2 w-full max-w-2xl -translate-x-1/2 transform px-4">
      {error && (
        <div className="mb-2 rounded-md bg-destructive/10 p-2 text-sm text-destructive">
          <p>{error}</p>
        </div>
      )}
      <form
        onSubmit={handleSubmit}
        className="glass-morphism flex items-center gap-2 rounded-md border p-2 shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
      >
        <Input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your automation workflow..."
          className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
          disabled={isGenerating}
        />
        <Button type="submit" size="sm" disabled={!prompt.trim() || isGenerating}>
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <SendHorizontal className="mr-2 h-4 w-4" />
              Generate
            </>
          )}
        </Button>
      </form>
    </div>
  )
}
