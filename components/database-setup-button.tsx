"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Database } from "lucide-react"
import { setupDatabase } from "@/app/actions/setup-database"
import { useToast } from "@/components/ui/use-toast"

export function DatabaseSetupButton() {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleSetupDatabase = async () => {
    setIsLoading(true)
    try {
      const result = await setupDatabase()

      if (result.error) {
        toast({
          title: "Database Setup Failed",
          description: result.error,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Database Setup Completed",
          description: "The database has been set up successfully.",
        })
      }
    } catch (error: any) {
      toast({
        title: "Database Setup Failed",
        description: error.message || "An error occurred during database setup",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button onClick={handleSetupDatabase} disabled={isLoading} variant="outline" className="gap-2">
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
      {isLoading ? "Setting Up Database..." : "Setup Database"}
    </Button>
  )
}
