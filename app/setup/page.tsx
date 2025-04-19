"use client"

import { useState } from "react"
import { setupDatabase } from "@/app/actions/setup-database"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/button"
import { CheckCircle, Database, Loader2 } from "lucide-react"

export default function SetupPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSetup = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await setupDatabase()

      if (result.success) {
        setIsComplete(true)
      } else {
        setError(result.error || "An unknown error occurred")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Setup
          </CardTitle>
          <CardDescription>Initialize your Supabase database with all required tables and default data</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">This will create the following tables:</p>
          <ul className="list-disc pl-5 text-sm text-gray-500 space-y-1">
            <li>workflows</li>
            <li>workflow_executions</li>
            <li>profiles</li>
            <li>workflow_templates</li>
            <li>teams</li>
            <li>team_members</li>
          </ul>
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">{error}</div>
          )}
          {isComplete && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md text-green-600 text-sm flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Database setup completed successfully!
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={handleSetup} disabled={isLoading || isComplete} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Setting up...
              </>
            ) : isComplete ? (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Setup Complete
              </>
            ) : (
              "Initialize Database"
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
