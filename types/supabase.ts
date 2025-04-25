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
      custom_blocks: {
        Row: {
          category: string | null
          code: string
          created_at: string | null
          created_by: string | null
          description: string | null
          icon: string | null
          id: string
          is_public: boolean | null
          name: string
          updated_at: string | null
          updated_by: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          code: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          updated_at?: string | null
          updated_by?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          code?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string
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
      node_executions: {
        Row: {
          completed_at: string
          duration_ms: number | null
          error: string | null
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
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          last_seen_at: string | null
          monthly_execution_count: number | null
          monthly_execution_quota: number | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_expires_at: string | null
          subscription_status: string | null
          subscription_tier: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          last_seen_at?: string | null
          monthly_execution_count?: number | null
          monthly_execution_quota?: number | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_expires_at?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          last_seen_at?: string | null
          monthly_execution_count?: number | null
          monthly_execution_quota?: number | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_expires_at?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          updated_at?: string | null
        }
        Relationships: []
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
      workflow_executions: {
        Row: {
          completed_at: string | null
          created_at: string | null
          duration_ms: number | null
          error: string | null
          id: string
          idempotency_key: string | null
          logs: Json | null
          result: Json | null
          started_at: string
          status: string
          triggered_by: string | null
          updated_at: string | null
          workflow_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error?: string | null
          id?: string
          idempotency_key?: string | null
          logs?: Json | null
          result?: Json | null
          started_at?: string
          status: string
          triggered_by?: string | null
          updated_at?: string | null
          workflow_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error?: string | null
          id?: string
          idempotency_key?: string | null
          logs?: Json | null
          result?: Json | null
          started_at?: string
          status?: string
          triggered_by?: string | null
          updated_at?: string | null
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
      reset_monthly_execution_count: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
