"use client"

import { useState } from "react"
import { setupDatabase } from "@/app/actions/setup-database"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { Database, Loader2 } from "lucide-react"

interface DatabaseSetupProps {
  onSetupComplete: () => void
}

export function DatabaseSetup({ onSetupComplete }: DatabaseSetupProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleSetup = async () => {
    setIsLoading(true)
    try {
      const result = await setupDatabase()

      if (result.success) {
        toast({
          title: "Database setup complete",
          description: "The workflows table has been created successfully.",
        })
        onSetupComplete()
      } else {
        toast({
          title: "Database setup failed",
          description: result.error || "Failed to set up the database. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Database setup failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Database className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-center">Database Setup Required</CardTitle>
        <CardDescription className="text-center">
          The workflows table needs to be created in your Supabase database.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Click the button below to automatically set up the required database tables. This will:
        </p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-muted-foreground">
          <li>Create the workflows table</li>
          <li>Set up proper security policies</li>
          <li>Create necessary indexes for performance</li>
        </ul>
      </CardContent>
      <CardFooter className="flex justify-center">
        <Button onClick={handleSetup} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Setting up database...
            </>
          ) : (
            <>
              <Database className="mr-2 h-4 w-4" />
              Set Up Database
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
