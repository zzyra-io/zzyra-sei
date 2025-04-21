// Generated Supabase types (partial, include only necessary parts)
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[]

export interface Database {
  public: {
    Tables: {
      workflows: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          nodes: Json
          edges: Json
          is_public: boolean
          tags: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          nodes?: Json
          edges?: Json
          is_public?: boolean
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          nodes?: Json
          edges?: Json
          is_public?: boolean
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
      }
      // Add other tables here if needed
    }
    Views: {}
    Functions: {}
    Enums: {}
    CompositeTypes: {}
  }
}
