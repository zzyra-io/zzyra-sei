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
          email_enabled: boolean | null
          id: string
          in_app_enabled: boolean | null
          notification_type: string
          telegram_enabled: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          discord_enabled?: boolean | null
          email_enabled?: boolean | null
          id?: string
          in_app_enabled?: boolean | null
          notification_type: string
          telegram_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          discord_enabled?: boolean | null
          email_enabled?: boolean | null
          id?: string
          in_app_enabled?: boolean | null
          notification_type?: string
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
          locked_by: string | null
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
          locked_by?: string | null
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
          locked_by?: string | null
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
      claim_workflow_execution: {
        Args: { p_execution_id: string; p_worker_id: string }
        Returns: boolean
      }
      execute_sql: {
        Args: { sql: string }
        Returns: undefined
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
      get_user_notification_preferences: {
        Args: { user_id_param: string }
        Returns: {
          created_at: string | null
          discord_enabled: boolean | null
          email_enabled: boolean | null
          id: string
          in_app_enabled: boolean | null
          notification_type: string
          telegram_enabled: boolean | null
          updated_at: string | null
          user_id: string
        }[]
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
      mark_workflow_execution_failed: {
        Args: { p_execution_id: string; p_error: string; p_details?: Json }
        Returns: undefined
      }
      release_workflow_lock: {
        Args: { p_execution_id: string; p_worker_id: string }
        Returns: boolean
      }
      reset_monthly_execution_count: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      send_test_notification: {
        Args: { user_id_param: string }
        Returns: undefined
      }
      setup_workflow_execution_listener: {
        Args: Record<PropertyKey, never>
        Returns: undefined
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
      upsert_notification_template: {
        Args: {
          notification_type_param: string
          channel_param: string
          subject_param: string
          body_param: string
        }
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
