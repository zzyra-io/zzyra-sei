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
      ai_blockchain_operations: {
        Row: {
          blockchain: string | null
          created_at: string
          error: string | null
          execution_id: string
          id: string
          node_id: string
          operation_type: string
          prompt: string | null
          result: Json | null
          status: string
          user_id: string
        }
        Insert: {
          blockchain?: string | null
          created_at?: string
          error?: string | null
          execution_id: string
          id?: string
          node_id: string
          operation_type: string
          prompt?: string | null
          result?: Json | null
          status: string
          user_id: string
        }
        Update: {
          blockchain?: string | null
          created_at?: string
          error?: string | null
          execution_id?: string
          id?: string
          node_id?: string
          operation_type?: string
          prompt?: string | null
          result?: Json | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          changed_data: Json | null
          id: string
          row_id: string | null
          table_name: string
          timestamp: string
          user_id: string | null
        }
        Insert: {
          action: string
          changed_data?: Json | null
          id?: string
          row_id?: string | null
          table_name: string
          timestamp?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          changed_data?: Json | null
          id?: string
          row_id?: string | null
          table_name?: string
          timestamp?: string
          user_id?: string | null
        }
        Relationships: []
      }
      block_execution_logs: {
        Row: {
          created_at: string | null
          execution_id: string
          id: string
          level: string
          message: string
          node_id: string
          timestamp: string | null
        }
        Insert: {
          created_at?: string | null
          execution_id: string
          id?: string
          level: string
          message: string
          node_id: string
          timestamp?: string | null
        }
        Update: {
          created_at?: string | null
          execution_id?: string
          id?: string
          level?: string
          message?: string
          node_id?: string
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "block_execution_logs_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "block_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      block_executions: {
        Row: {
          block_type: string
          completed_at: string | null
          created_at: string | null
          error: string | null
          execution_time_ms: number | null
          id: string
          inputs: Json | null
          node_id: string
          outputs: Json | null
          started_at: string | null
          status: string
          workflow_execution_id: string
        }
        Insert: {
          block_type: string
          completed_at?: string | null
          created_at?: string | null
          error?: string | null
          execution_time_ms?: number | null
          id?: string
          inputs?: Json | null
          node_id: string
          outputs?: Json | null
          started_at?: string | null
          status?: string
          workflow_execution_id: string
        }
        Update: {
          block_type?: string
          completed_at?: string | null
          created_at?: string | null
          error?: string | null
          execution_time_ms?: number | null
          id?: string
          inputs?: Json | null
          node_id?: string
          outputs?: Json | null
          started_at?: string | null
          status?: string
          workflow_execution_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "block_executions_workflow_execution_id_fkey"
            columns: ["workflow_execution_id"]
            isOneToOne: false
            referencedRelation: "workflow_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      block_library: {
        Row: {
          block_data: Json | null
          block_type: string
          category: string | null
          configuration: Json
          created_at: string | null
          description: string
          execution_code: string | null
          id: string
          is_public: boolean | null
          is_verified: boolean | null
          name: string
          rating: number | null
          tags: string[] | null
          updated_at: string | null
          usage_count: number | null
          user_id: string
          version: string | null
        }
        Insert: {
          block_data?: Json | null
          block_type: string
          category?: string | null
          configuration?: Json
          created_at?: string | null
          description: string
          execution_code?: string | null
          id?: string
          is_public?: boolean | null
          is_verified?: boolean | null
          name: string
          rating?: number | null
          tags?: string[] | null
          updated_at?: string | null
          usage_count?: number | null
          user_id: string
          version?: string | null
        }
        Update: {
          block_data?: Json | null
          block_type?: string
          category?: string | null
          configuration?: Json
          created_at?: string | null
          description?: string
          execution_code?: string | null
          id?: string
          is_public?: boolean | null
          is_verified?: boolean | null
          name?: string
          rating?: number | null
          tags?: string[] | null
          updated_at?: string | null
          usage_count?: number | null
          user_id?: string
          version?: string | null
        }
        Relationships: []
      }
      block_library_ratings: {
        Row: {
          block_id: string
          comment: string | null
          created_at: string | null
          id: string
          rating: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          block_id: string
          comment?: string | null
          created_at?: string | null
          id?: string
          rating: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          block_id?: string
          comment?: string | null
          created_at?: string | null
          id?: string
          rating?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "block_library_ratings_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "block_library"
            referencedColumns: ["id"]
          },
        ]
      }
      blockchain_transactions: {
        Row: {
          block_number: number | null
          chain_id: number
          created_at: string
          data: Json | null
          effective_gas_price: string | null
          error: string | null
          execution_id: string
          gas_limit: string | null
          gas_used: string | null
          hash: string | null
          id: string
          max_fee_per_gas: string | null
          max_priority_fee_per_gas: string | null
          node_id: string
          nonce: number | null
          status: string
          to_address: string
          updated_at: string
          user_id: string | null
          value: string
          wallet_address: string
        }
        Insert: {
          block_number?: number | null
          chain_id: number
          created_at?: string
          data?: Json | null
          effective_gas_price?: string | null
          error?: string | null
          execution_id: string
          gas_limit?: string | null
          gas_used?: string | null
          hash?: string | null
          id?: string
          max_fee_per_gas?: string | null
          max_priority_fee_per_gas?: string | null
          node_id: string
          nonce?: number | null
          status: string
          to_address: string
          updated_at?: string
          user_id?: string | null
          value: string
          wallet_address: string
        }
        Update: {
          block_number?: number | null
          chain_id?: number
          created_at?: string
          data?: Json | null
          effective_gas_price?: string | null
          error?: string | null
          execution_id?: string
          gas_limit?: string | null
          gas_used?: string | null
          hash?: string | null
          id?: string
          max_fee_per_gas?: string | null
          max_priority_fee_per_gas?: string | null
          node_id?: string
          nonce?: number | null
          status?: string
          to_address?: string
          updated_at?: string
          user_id?: string | null
          value?: string
          wallet_address?: string
        }
        Relationships: []
      }
      circuit_breaker_state: {
        Row: {
          circuit_id: string
          created_at: string
          failure_count: number
          id: string
          last_failure_time: string | null
          last_half_open_time: string | null
          last_success_time: string | null
          state: string
          success_count: number
          updated_at: string
        }
        Insert: {
          circuit_id: string
          created_at?: string
          failure_count?: number
          id?: string
          last_failure_time?: string | null
          last_half_open_time?: string | null
          last_success_time?: string | null
          state?: string
          success_count?: number
          updated_at?: string
        }
        Update: {
          circuit_id?: string
          created_at?: string
          failure_count?: number
          id?: string
          last_failure_time?: string | null
          last_half_open_time?: string | null
          last_success_time?: string | null
          state?: string
          success_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      custom_blocks: {
        Row: {
          block_data: Json | null
          block_type: string | null
          category: string
          code: string
          created_at: string | null
          created_by: string | null
          description: string | null
          icon: string | null
          id: string
          is_public: boolean | null
          is_verified: boolean | null
          logic: string
          logic_type: string
          name: string
          rating: number | null
          tags: Json
          updated_at: string | null
          updated_by: string | null
          usage_count: number | null
          user_id: string
          version: string | null
        }
        Insert: {
          block_data?: Json | null
          block_type?: string | null
          category: string
          code: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_public?: boolean | null
          is_verified?: boolean | null
          logic: string
          logic_type?: string
          name: string
          rating?: number | null
          tags?: Json
          updated_at?: string | null
          updated_by?: string | null
          usage_count?: number | null
          user_id: string
          version?: string | null
        }
        Update: {
          block_data?: Json | null
          block_type?: string | null
          category?: string
          code?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_public?: boolean | null
          is_verified?: boolean | null
          logic?: string
          logic_type?: string
          name?: string
          rating?: number | null
          tags?: Json
          updated_at?: string | null
          updated_by?: string | null
          usage_count?: number | null
          user_id?: string
          version?: string | null
        }
        Relationships: []
      }
      execution_logs: {
        Row: {
          data: Json | null
          execution_id: string
          id: string
          level: string
          message: string
          node_id: string
          timestamp: string
        }
        Insert: {
          data?: Json | null
          execution_id: string
          id?: string
          level: string
          message: string
          node_id: string
          timestamp?: string
        }
        Update: {
          data?: Json | null
          execution_id?: string
          id?: string
          level?: string
          message?: string
          node_id?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "execution_logs_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "workflow_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      execution_node_status: {
        Row: {
          execution_id: string
          id: number
          node_id: string
          status: string
          updated_at: string
        }
        Insert: {
          execution_id: string
          id?: number
          node_id: string
          status: string
          updated_at?: string
        }
        Update: {
          execution_id?: string
          id?: number
          node_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "execution_node_status_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "workflow_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      execution_queue: {
        Row: {
          created_at: string
          error: string | null
          execution_id: string
          id: string
          locked_by: string | null
          locked_until: string | null
          max_retries: number
          payload: Json | null
          priority: number
          retry_count: number
          scheduled_for: string
          status: string
          updated_at: string
          user_id: string | null
          workflow_id: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          execution_id: string
          id?: string
          locked_by?: string | null
          locked_until?: string | null
          max_retries?: number
          payload?: Json | null
          priority?: number
          retry_count?: number
          scheduled_for?: string
          status: string
          updated_at?: string
          user_id?: string | null
          workflow_id: string
        }
        Update: {
          created_at?: string
          error?: string | null
          execution_id?: string
          id?: string
          locked_by?: string | null
          locked_until?: string | null
          max_retries?: number
          payload?: Json | null
          priority?: number
          retry_count?: number
          scheduled_for?: string
          status?: string
          updated_at?: string
          user_id?: string | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "execution_queue_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "workflow_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "execution_queue_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      node_executions: {
        Row: {
          completed_at: string
          duration_ms: number | null
          error: string | null
          error_details: Json | null
          execution_id: string
          finished_at: string | null
          id: string
          logs: Json | null
          node_id: string
          output: Json | null
          output_data: Json | null
          retry_count: number | null
          started_at: string
          status: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string
          duration_ms?: number | null
          error?: string | null
          error_details?: Json | null
          execution_id: string
          finished_at?: string | null
          id?: string
          logs?: Json | null
          node_id: string
          output?: Json | null
          output_data?: Json | null
          retry_count?: number | null
          started_at?: string
          status: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string
          duration_ms?: number | null
          error?: string | null
          error_details?: Json | null
          execution_id?: string
          finished_at?: string | null
          id?: string
          logs?: Json | null
          node_id?: string
          output?: Json | null
          output_data?: Json | null
          retry_count?: number | null
          started_at?: string
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "node_executions_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "workflow_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      node_inputs: {
        Row: {
          created_at: string | null
          execution_id: string
          id: string
          input_data: Json | null
          node_id: string
        }
        Insert: {
          created_at?: string | null
          execution_id: string
          id?: string
          input_data?: Json | null
          node_id: string
        }
        Update: {
          created_at?: string | null
          execution_id?: string
          id?: string
          input_data?: Json | null
          node_id?: string
        }
        Relationships: []
      }
      node_logs: {
        Row: {
          data: Json | null
          execution_id: string | null
          id: string
          level: string | null
          message: string
          node_id: string
          timestamp: string
        }
        Insert: {
          data?: Json | null
          execution_id?: string | null
          id?: string
          level?: string | null
          message: string
          node_id: string
          timestamp?: string
        }
        Update: {
          data?: Json | null
          execution_id?: string | null
          id?: string
          level?: string | null
          message?: string
          node_id?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "node_logs_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "workflow_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      node_outputs: {
        Row: {
          created_at: string | null
          execution_id: string
          id: string
          node_id: string
          output_data: Json | null
        }
        Insert: {
          created_at?: string | null
          execution_id: string
          id?: string
          node_id: string
          output_data?: Json | null
        }
        Update: {
          created_at?: string | null
          execution_id?: string
          id?: string
          node_id?: string
          output_data?: Json | null
        }
        Relationships: []
      }
      notification_logs: {
        Row: {
          channel: string
          content: Json
          created_at: string | null
          error_message: string | null
          id: string
          notification_type: string
          status: string
          user_id: string
        }
        Insert: {
          channel: string
          content: Json
          created_at?: string | null
          error_message?: string | null
          id?: string
          notification_type: string
          status: string
          user_id: string
        }
        Update: {
          channel?: string
          content?: Json
          created_at?: string | null
          error_message?: string | null
          id?: string
          notification_type?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string | null
          discord_enabled: boolean | null
          discord_webhook_url: string | null
          email_enabled: boolean | null
          id: string
          in_app_enabled: boolean | null
          notification_type: string
          telegram_chat_id: string | null
          telegram_enabled: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          discord_enabled?: boolean | null
          discord_webhook_url?: string | null
          email_enabled?: boolean | null
          id?: string
          in_app_enabled?: boolean | null
          notification_type: string
          telegram_chat_id?: string | null
          telegram_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          discord_enabled?: boolean | null
          discord_webhook_url?: string | null
          email_enabled?: boolean | null
          id?: string
          in_app_enabled?: boolean | null
          notification_type?: string
          telegram_chat_id?: string | null
          telegram_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notification_templates: {
        Row: {
          body: string
          channel: string
          created_at: string | null
          id: string
          notification_type: string
          subject: string | null
          updated_at: string | null
        }
        Insert: {
          body: string
          channel: string
          created_at?: string | null
          id?: string
          notification_type: string
          subject?: string | null
          updated_at?: string | null
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string | null
          id?: string
          notification_type?: string
          subject?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          data: Json | null
          id: string
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: string
          message: string
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      pricing_tiers: {
        Row: {
          created_at: string
          description: string | null
          execution_limit: number
          features: Json
          id: string
          name: string
          price_monthly: number
          price_yearly: number
          updated_at: string
          workflow_limit: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          execution_limit: number
          features?: Json
          id?: string
          name: string
          price_monthly: number
          price_yearly: number
          updated_at?: string
          workflow_limit: number
        }
        Update: {
          created_at?: string
          description?: string | null
          execution_limit?: number
          features?: Json
          id?: string
          name?: string
          price_monthly?: number
          price_yearly?: number
          updated_at?: string
          workflow_limit?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          discord_webhook_url: string | null
          email: string | null
          full_name: string | null
          id: string
          last_seen_at: string | null
          monthly_execution_count: number | null
          monthly_execution_quota: number | null
          monthly_executions_used: number
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_expires_at: string | null
          subscription_status: string | null
          subscription_tier: string | null
          telegram_chat_id: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          discord_webhook_url?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          last_seen_at?: string | null
          monthly_execution_count?: number | null
          monthly_execution_quota?: number | null
          monthly_executions_used?: number
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_expires_at?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          telegram_chat_id?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          discord_webhook_url?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          last_seen_at?: string | null
          monthly_execution_count?: number | null
          monthly_execution_quota?: number | null
          monthly_executions_used?: number
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_expires_at?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          telegram_chat_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      subscription_invoices: {
        Row: {
          amount: number
          billing_reason: string
          created_at: string
          id: string
          invoice_pdf: string | null
          status: string
          stripe_invoice_id: string | null
          subscription_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          billing_reason: string
          created_at?: string
          id?: string
          invoice_pdf?: string | null
          status: string
          stripe_invoice_id?: string | null
          subscription_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          billing_reason?: string
          created_at?: string
          id?: string
          invoice_pdf?: string | null
          status?: string
          stripe_invoice_id?: string | null
          subscription_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at: string | null
          canceled_at: string | null
          created_at: string
          current_period_end: string
          current_period_start: string
          id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tier_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at?: string | null
          canceled_at?: string | null
          created_at?: string
          current_period_end: string
          current_period_start: string
          id?: string
          status: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at?: string | null
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "pricing_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          joined_at: string | null
          role: string
          team_id: string
          user_id: string
        }
        Insert: {
          joined_at?: string | null
          role: string
          team_id: string
          user_id: string
        }
        Update: {
          joined_at?: string | null
          role?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      transaction_attempts: {
        Row: {
          attempt_no: number
          error: string | null
          execution_id: string
          gas_used: number | null
          id: string
          node_id: string
          status: string
          tried_at: string
          tx_hash: string | null
        }
        Insert: {
          attempt_no: number
          error?: string | null
          execution_id: string
          gas_used?: number | null
          id: string
          node_id: string
          status: string
          tried_at?: string
          tx_hash?: string | null
        }
        Update: {
          attempt_no?: number
          error?: string | null
          execution_id?: string
          gas_used?: number | null
          id?: string
          node_id?: string
          status?: string
          tried_at?: string
          tx_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transaction_attempts_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "workflow_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_logs: {
        Row: {
          created_at: string
          id: string
          quantity: number
          resource_type: string
          subscription_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          quantity: number
          resource_type: string
          subscription_id: string
        }
        Update: {
          created_at?: string
          id?: string
          quantity?: number
          resource_type?: string
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_logs_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_wallets: {
        Row: {
          chain_id: string
          chain_type: string | null
          created_at: string
          id: string
          metadata: Json | null
          updated_at: string
          user_id: string
          wallet_address: string
          wallet_type: string | null
        }
        Insert: {
          chain_id: string
          chain_type?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          updated_at?: string
          user_id: string
          wallet_address: string
          wallet_type?: string | null
        }
        Update: {
          chain_id?: string
          chain_type?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          updated_at?: string
          user_id?: string
          wallet_address?: string
          wallet_type?: string | null
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: string
          created_at: string | null
          from_address: string
          id: string
          status: string
          to_address: string
          tx_hash: string
          tx_type: string
          updated_at: string | null
          user_id: string
          wallet_id: string
        }
        Insert: {
          amount: string
          created_at?: string | null
          from_address: string
          id?: string
          status: string
          to_address: string
          tx_hash: string
          tx_type: string
          updated_at?: string | null
          user_id: string
          wallet_id: string
        }
        Update: {
          amount?: string
          created_at?: string | null
          from_address?: string
          id?: string
          status?: string
          to_address?: string
          tx_hash?: string
          tx_type?: string
          updated_at?: string | null
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_executions: {
        Row: {
          completed_at: string | null
          created_at: string | null
          duration_ms: number | null
          error: string | null
          id: string
          locked_by: string | null
          logs: Json | null
          result: Json | null
          retry_count: number | null
          started_at: string
          status: Database["public"]["Enums"]["workflow_status"]
          triggered_by: string | null
          updated_at: string | null
          user_id: string
          workflow_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error?: string | null
          id?: string
          locked_by?: string | null
          logs?: Json | null
          result?: Json | null
          retry_count?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["workflow_status"]
          triggered_by?: string | null
          updated_at?: string | null
          user_id: string
          workflow_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error?: string | null
          id?: string
          locked_by?: string | null
          logs?: Json | null
          result?: Json | null
          retry_count?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["workflow_status"]
          triggered_by?: string | null
          updated_at?: string | null
          user_id?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_executions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_pauses: {
        Row: {
          context: Json
          created_by: string
          execution_id: string
          id: string
          node_id: string
          paused_at: string
          resume_data: Json | null
          resumed_at: string | null
        }
        Insert: {
          context: Json
          created_by: string
          execution_id: string
          id: string
          node_id: string
          paused_at?: string
          resume_data?: Json | null
          resumed_at?: string | null
        }
        Update: {
          context?: Json
          created_by?: string
          execution_id?: string
          id?: string
          node_id?: string
          paused_at?: string
          resume_data?: Json | null
          resumed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_pauses_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "workflow_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_templates: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          edges: Json | null
          id: string
          name: string
          nodes: Json | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          edges?: Json | null
          id?: string
          name: string
          nodes?: Json | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          edges?: Json | null
          id?: string
          name?: string
          nodes?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      workflows: {
        Row: {
          created_at: string | null
          created_by: string | null
          definition: Json
          description: string | null
          edges: Json | null
          id: string
          is_public: boolean | null
          name: string
          nodes: Json | null
          tags: string[] | null
          updated_at: string | null
          user_id: string
          version: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          definition?: Json
          description?: string | null
          edges?: Json | null
          id?: string
          is_public?: boolean | null
          name: string
          nodes?: Json | null
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string
          version?: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          definition?: Json
          description?: string | null
          edges?: Json | null
          id?: string
          is_public?: boolean | null
          name?: string
          nodes?: Json | null
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string
          version?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_subscription_limits: {
        Args: { p_user_id: string; p_resource_type: string; p_quantity: number }
        Returns: boolean
      }
      claim_next_execution_job: {
        Args: { worker_id: string; batch_size?: number }
        Returns: {
          created_at: string
          error: string | null
          execution_id: string
          id: string
          locked_by: string | null
          locked_until: string | null
          max_retries: number
          payload: Json | null
          priority: number
          retry_count: number
          scheduled_for: string
          status: string
          updated_at: string
          user_id: string | null
          workflow_id: string
        }[]
      }
      execute_sql: {
        Args: { sql: string }
        Returns: undefined
      }
      get_active_workflows_count: {
        Args: { time_period?: number }
        Returns: number
      }
      get_execution_duration_stats: {
        Args: { workflow_id: string; since_date: string }
        Returns: {
          avg: number
          min: number
          max: number
        }[]
      }
      get_node_execution_stats: {
        Args: { workflow_id: string; since_date: string }
        Returns: {
          node_id: string
          execution_count: number
          avg_duration: number
          failure_rate: number
        }[]
      }
      get_user_id_from_email: {
        Args: { email_address: string }
        Returns: string
      }
      get_user_notification_preferences: {
        Args: { user_id_param: string }
        Returns: {
          created_at: string | null
          discord_enabled: boolean | null
          discord_webhook_url: string | null
          email_enabled: boolean | null
          id: string
          in_app_enabled: boolean | null
          notification_type: string
          telegram_chat_id: string | null
          telegram_enabled: boolean | null
          updated_at: string | null
          user_id: string
        }[]
      }
      get_wallets_by_identifier: {
        Args: { user_identifier: string }
        Returns: {
          chain_id: string
          chain_type: string | null
          created_at: string
          id: string
          metadata: Json | null
          updated_at: string
          user_id: string
          wallet_address: string
          wallet_type: string | null
        }[]
      }
      increment_block_usage_count: {
        Args: { block_id: string }
        Returns: undefined
      }
      insert_execution_queue_job: {
        Args: {
          p_execution_id: string
          p_workflow_id: string
          p_user_id: string
          p_status: string
          p_priority: number
          p_payload: Json
          p_scheduled_for: string
        }
        Returns: {
          created_at: string
          error: string | null
          execution_id: string
          id: string
          locked_by: string | null
          locked_until: string | null
          max_retries: number
          payload: Json | null
          priority: number
          retry_count: number
          scheduled_for: string
          status: string
          updated_at: string
          user_id: string | null
          workflow_id: string
        }
      }
      reset_monthly_execution_count: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      safe_insert_wallet: {
        Args: {
          user_identifier: string
          wallet_addr: string
          wallet_type_val: string
          chain_type_val: string
          chain_id_val: string
          metadata_val?: Json
        }
        Returns: Json
      }
      update_user_notification_channels: {
        Args: {
          user_id_param: string
          telegram_chat_id_param: string
          discord_webhook_url_param: string
        }
        Returns: undefined
      }
      upsert_notification_preference: {
        Args: {
          user_id_param: string
          notification_type_param: string
          email_enabled_param: boolean
          in_app_enabled_param: boolean
          telegram_enabled_param: boolean
          discord_enabled_param: boolean
        }
        Returns: undefined
      }
    }
    Enums: {
      block_status: "pending" | "running" | "completed" | "failed"
      log_level: "info" | "error" | "warn"
      workflow_status: "pending" | "running" | "completed" | "failed" | "paused"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      block_status: ["pending", "running", "completed", "failed"],
      log_level: ["info", "error", "warn"],
      workflow_status: ["pending", "running", "completed", "failed", "paused"],
    },
  },
} as const
