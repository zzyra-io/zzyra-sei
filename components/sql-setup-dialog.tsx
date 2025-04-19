"use client"

import { useState, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Database, Copy, Check, Play } from "lucide-react"
import { setupDatabase } from "@/app/actions/setup-database"
import { useToast } from "@/components/ui/use-toast"

interface SqlSetupDialogProps {
  children?: ReactNode
}

export function SqlSetupDialog({ children }: SqlSetupDialogProps) {
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const { toast } = useToast()

  const sqlScript = `-- Create the workflows table
CREATE TABLE IF NOT EXISTS public.workflows (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
  edges JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_public BOOLEAN NOT NULL DEFAULT false,
  tags TEXT[] NOT NULL DEFAULT '{}'::text[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create an index on user_id for faster queries
CREATE INDEX IF NOT EXISTS workflows_user_id_idx ON public.workflows(user_id);

-- Set up Row Level Security (RLS)
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;

-- Create policies for row level security
-- Users can view their own workflows or public workflows
CREATE POLICY "Users can view their own workflows or public ones" 
  ON public.workflows 
  FOR SELECT 
  USING (auth.uid() = user_id OR is_public = true);

-- Users can insert their own workflows
CREATE POLICY "Users can insert their own workflows" 
  ON public.workflows 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own workflows
CREATE POLICY "Users can update their own workflows" 
  ON public.workflows 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Users can delete their own workflows
CREATE POLICY "Users can delete their own workflows" 
  ON public.workflows 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create the workflow_templates table
CREATE TABLE IF NOT EXISTS public.workflow_templates (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
  edges JSONB NOT NULL DEFAULT '[]'::jsonb,
  tags TEXT[] NOT NULL DEFAULT '{}'::text[],
  is_premium BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS workflow_templates_category_idx ON public.workflow_templates(category);
CREATE INDEX IF NOT EXISTS workflow_templates_is_premium_idx ON public.workflow_templates(is_premium);

-- Set up Row Level Security (RLS)
ALTER TABLE public.workflow_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for row level security
-- Everyone can view templates
CREATE POLICY IF NOT EXISTS "Everyone can view templates" 
  ON public.workflow_templates 
  FOR SELECT 
  USING (true);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Create a trigger to automatically update the updated_at column
CREATE TRIGGER update_workflows_updated_at
BEFORE UPDATE ON public.workflows
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create a trigger to automatically update the updated_at column for workflow_templates
CREATE TRIGGER update_workflow_templates_updated_at
BEFORE UPDATE ON public.workflow_templates
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();`

  const handleCopy = () => {
    navigator.clipboard.writeText(sqlScript)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRunSetup = async () => {
    setIsRunning(true)
    try {
      const result = await setupDatabase()
      if (result.success) {
        toast({
          title: "Database setup successful",
          description: "All required tables have been created. You may need to refresh the page to see the changes.",
          variant: "default",
        })
        // Close the dialog after successful setup
        setTimeout(() => setOpen(false), 1500)
      } else {
        toast({
          title: "Database setup failed",
          description: result.error || "An unknown error occurred during database setup.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Database setup failed",
        description: error instanceof Error ? error.message : "An unknown error occurred during database setup.",
        variant: "destructive",
      })
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" className="gap-2">
            <Database className="h-4 w-4" />
            Database Setup
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Database Setup Instructions</DialogTitle>
          <DialogDescription>
            Run the following SQL script in your Supabase SQL Editor to set up the required tables.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="script" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="script">SQL Script</TabsTrigger>
            <TabsTrigger value="instructions">Manual Setup</TabsTrigger>
            <TabsTrigger value="auto">Auto Setup</TabsTrigger>
          </TabsList>
          <TabsContent value="script" className="mt-4">
            <div className="relative">
              <pre className="max-h-96 overflow-auto rounded-md bg-muted p-4 text-sm">
                <code>{sqlScript}</code>
              </pre>
              <Button size="sm" variant="ghost" className="absolute right-2 top-2" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="instructions" className="mt-4 space-y-4">
            <ol className="ml-6 list-decimal space-y-2">
              <li>Log in to your Supabase dashboard</li>
              <li>Select your project</li>
              <li>
                Go to the <strong>SQL Editor</strong> section in the left sidebar
              </li>
              <li>
                Click <strong>New Query</strong> to create a new SQL query
              </li>
              <li>Paste the SQL script from the "SQL Script" tab</li>
              <li>
                Click <strong>Run</strong> to execute the script
              </li>
              <li>
                Verify that the <code>workflows</code> table has been created in the <strong>Table Editor</strong>{" "}
                section
              </li>
            </ol>
            <div className="rounded-md bg-amber-50 p-4 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
              <p className="text-sm">
                <strong>Note:</strong> This script creates the necessary tables with proper row-level security policies
                to ensure that users can only access their own workflows.
              </p>
            </div>
          </TabsContent>
          <TabsContent value="auto" className="mt-4 space-y-4">
            <div className="rounded-md bg-blue-50 p-4 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
              <p className="text-sm">
                <strong>Automatic Setup:</strong> Click the button below to automatically set up all required database
                tables. This will create the workflows and workflow_templates tables with proper security policies.
              </p>
            </div>
            <div className="flex justify-center">
              <Button onClick={handleRunSetup} disabled={isRunning} className="gap-2">
                {isRunning ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                    Setting Up...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Run Database Setup
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button onClick={() => setOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
