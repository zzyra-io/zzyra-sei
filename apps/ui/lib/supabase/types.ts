export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      audit_logs: {
        Row: {
          id: string
          table_name: string
          row_id: string | null
          action: string
          changed_data: Json
          user_id: string | null
          timestamp: string
        }
        Insert: {
          id?: string
          table_name: string
          row_id?: string | null
          action: string
          changed_data: Json
          user_id?: string | null
          timestamp?: string
        }
        Update: {
          id?: string
          table_name?: string
          row_id?: string | null
          action?: string
          changed_data?: Json
          user_id?: string | null
          timestamp?: string
        }
      }
      pricing_tiers: {
        Row: {
          id: string
          name: string
          description: string | null
          price_monthly: number
          price_yearly: number
          workflow_limit: number
          execution_limit: number
          features: Record<string, unknown>
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          price_monthly: number
          price_yearly: number
          workflow_limit: number
          execution_limit: number
          features?: Record<string, unknown>
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          price_monthly?: number
          price_yearly?: number
          workflow_limit?: number
          execution_limit?: number
          features?: Record<string, unknown>
          created_at?: string
          updated_at?: string
        }
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          tier_id: string
          status: 'active' | 'canceled' | 'past_due' | 'incomplete'
          stripe_subscription_id: string | null
          stripe_customer_id: string | null
          current_period_start: string
          current_period_end: string
          cancel_at: string | null
          canceled_at: string | null
          created_at: string
          updated_at: string
          pricing_tiers?: Database['public']['Tables']['pricing_tiers']['Row']
        }
        Insert: {
          id?: string
          user_id: string
          tier_id: string
          status: 'active' | 'canceled' | 'past_due' | 'incomplete'
          stripe_subscription_id?: string | null
          stripe_customer_id?: string | null
          current_period_start: string
          current_period_end: string
          cancel_at?: string | null
          canceled_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          tier_id?: string
          status?: 'active' | 'canceled' | 'past_due' | 'incomplete'
          stripe_subscription_id?: string | null
          stripe_customer_id?: string | null
          current_period_start?: string
          current_period_end?: string
          cancel_at?: string | null
          canceled_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      usage_logs: {
        Row: {
          id: string
          subscription_id: string
          resource_type: 'workflow_execution' | 'storage' | 'api_calls'
          quantity: number
          created_at: string
        }
        Insert: {
          id?: string
          subscription_id: string
          resource_type: 'workflow_execution' | 'storage' | 'api_calls'
          quantity: number
          created_at?: string
        }
        Update: {
          id?: string
          subscription_id?: string
          resource_type?: 'workflow_execution' | 'storage' | 'api_calls'
          quantity?: number
          created_at?: string
        }
      }
      subscription_invoices: {
        Row: {
          id: string
          subscription_id: string
          stripe_invoice_id: string | null
          amount: number
          status: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void'
          billing_reason: string
          invoice_pdf: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          subscription_id: string
          stripe_invoice_id?: string | null
          amount: number
          status: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void'
          billing_reason: string
          invoice_pdf?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          subscription_id?: string
          stripe_invoice_id?: string | null
          amount?: number
          status?: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void'
          billing_reason?: string
          invoice_pdf?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      workflows: {
        Row: {
          id: string
          name: string
          description: string | null
          definition: Json
          edges: Json
          version: number
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          definition: Json
          edges: Json
          version?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          definition?: Json
          edges?: Json
          version?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      workflow_executions: {
        Row: {
          id: string
          workflow_id: string
          status: string
          input: Json
          output: Json | null
          error: string | null
          started_at: string
          completed_at: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workflow_id: string
          status: string
          input: Json
          output?: Json | null
          error?: string | null
          started_at?: string
          completed_at?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workflow_id?: string
          status?: string
          input?: Json
          output?: Json | null
          error?: string | null
          started_at?: string
          completed_at?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      node_executions: {
        Row: {
          id: string
          execution_id: string
          node_id: string
          status: string
          input: Json
          output: Json | null
          error: string | null
          started_at: string
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          execution_id: string
          node_id: string
          status: string
          input: Json
          output?: Json | null
          error?: string | null
          started_at?: string
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          execution_id?: string
          node_id?: string
          status?: string
          input?: Json
          output?: Json | null
          error?: string | null
          started_at?: string
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

// Helper types
export type PricingTier = Database['public']['Tables']['pricing_tiers']['Row']
export type Subscription = Database['public']['Tables']['subscriptions']['Row']
export type UsageLog = Database['public']['Tables']['usage_logs']['Row']
