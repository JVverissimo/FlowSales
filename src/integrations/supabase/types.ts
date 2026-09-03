export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_completions: {
        Row: {
          activity_index: number
          activity_name: string | null
          activity_type: string
          cadence_id: string | null
          completed_at: string
          created_at: string
          day_number: number
          id: string
          lead_id: string
          notes: string | null
          phase_index: number
          status: string
          user_id: string
        }
        Insert: {
          activity_index: number
          activity_name?: string | null
          activity_type: string
          cadence_id?: string | null
          completed_at?: string
          created_at?: string
          day_number: number
          id?: string
          lead_id: string
          notes?: string | null
          phase_index?: number
          status?: string
          user_id: string
        }
        Update: {
          activity_index?: number
          activity_name?: string | null
          activity_type?: string
          cadence_id?: string | null
          completed_at?: string
          created_at?: string
          day_number?: number
          id?: string
          lead_id?: string
          notes?: string | null
          phase_index?: number
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      activity_library: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          instructions: string | null
          name: string
          preferred_network: string | null
          shift: string | null
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          instructions?: string | null
          name: string
          preferred_network?: string | null
          shift?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          instructions?: string | null
          name?: string
          preferred_network?: string | null
          shift?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          cadence_id: string | null
          channel: string | null
          closed: boolean
          closed_at: string | null
          company: string | null
          confirmed: boolean
          contract_value: number | null
          created_at: string
          id: string
          lead_id: string
          not_sold: boolean
          not_sold_reason: string | null
          outcome_at: string | null
          outcome_by: string | null
          outcome_notes: string | null
          scheduled_at: string
          sdr_id: string
          sdr_notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          cadence_id?: string | null
          channel?: string | null
          closed?: boolean
          closed_at?: string | null
          company?: string | null
          confirmed?: boolean
          contract_value?: number | null
          created_at?: string
          id?: string
          lead_id: string
          not_sold?: boolean
          not_sold_reason?: string | null
          outcome_at?: string | null
          outcome_by?: string | null
          outcome_notes?: string | null
          scheduled_at: string
          sdr_id: string
          sdr_notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          cadence_id?: string | null
          channel?: string | null
          closed?: boolean
          closed_at?: string | null
          company?: string | null
          confirmed?: boolean
          contract_value?: number | null
          created_at?: string
          id?: string
          lead_id?: string
          not_sold?: boolean
          not_sold_reason?: string | null
          outcome_at?: string | null
          outcome_by?: string | null
          outcome_notes?: string | null
          scheduled_at?: string
          sdr_id?: string
          sdr_notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      business_hours: {
        Row: {
          created_at: string
          end_time: string
          id: string
          singleton: boolean
          start_time: string
          updated_at: string
          updated_by: string | null
          workdays: number[]
        }
        Insert: {
          created_at?: string
          end_time?: string
          id?: string
          singleton?: boolean
          start_time?: string
          updated_at?: string
          updated_by?: string | null
          workdays?: number[]
        }
        Update: {
          created_at?: string
          end_time?: string
          id?: string
          singleton?: boolean
          start_time?: string
          updated_at?: string
          updated_by?: string | null
          workdays?: number[]
        }
        Relationships: []
      }
      cadences: {
        Row: {
          channel: string | null
          created_at: string
          days: Json
          default_shift: string | null
          description: string | null
          focus: string
          id: string
          inactivity_days: number | null
          linked_to_crm: boolean
          loss_reason: string | null
          name: string
          participants: Json
          phases: Json
          priority: string
          status: string
          updated_at: string
        }
        Insert: {
          channel?: string | null
          created_at?: string
          days?: Json
          default_shift?: string | null
          description?: string | null
          focus?: string
          id?: string
          inactivity_days?: number | null
          linked_to_crm?: boolean
          loss_reason?: string | null
          name: string
          participants?: Json
          phases?: Json
          priority?: string
          status?: string
          updated_at?: string
        }
        Update: {
          channel?: string | null
          created_at?: string
          days?: Json
          default_shift?: string | null
          description?: string | null
          focus?: string
          id?: string
          inactivity_days?: number | null
          linked_to_crm?: boolean
          loss_reason?: string | null
          name?: string
          participants?: Json
          phases?: Json
          priority?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      channel_commission_configs: {
        Row: {
          bonus_threshold: number
          bonus_value: number
          channel: string
          closing_value: number
          company: string
          created_at: string
          id: string
          meeting_value: number
          updated_at: string
        }
        Insert: {
          bonus_threshold?: number
          bonus_value?: number
          channel: string
          closing_value?: number
          company: string
          created_at?: string
          id?: string
          meeting_value?: number
          updated_at?: string
        }
        Update: {
          bonus_threshold?: number
          bonus_value?: number
          channel?: string
          closing_value?: number
          company?: string
          created_at?: string
          id?: string
          meeting_value?: number
          updated_at?: string
        }
        Relationships: []
      }
      lead_phase_history: {
        Row: {
          cadence_id: string
          created_at: string
          entered_at: string
          exited_at: string | null
          id: string
          lead_id: string
          moved_by: string | null
          phase_id: string | null
          phase_index: number
          phase_name: string | null
        }
        Insert: {
          cadence_id: string
          created_at?: string
          entered_at?: string
          exited_at?: string | null
          id?: string
          lead_id: string
          moved_by?: string | null
          phase_id?: string | null
          phase_index: number
          phase_name?: string | null
        }
        Update: {
          cadence_id?: string
          created_at?: string
          entered_at?: string
          exited_at?: string | null
          id?: string
          lead_id?: string
          moved_by?: string | null
          phase_id?: string | null
          phase_index?: number
          phase_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_phase_history_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          cadence_id: string | null
          channel: string | null
          company: string
          company_target: string | null
          created_at: string
          data_entrada: string | null
          email: string | null
          faturamento: string | null
          fonte: string | null
          id: string
          loss_reason: string | null
          name: string
          notes: string | null
          origem_importacao: string | null
          owner_id: string | null
          phase_index: number
          phone: string | null
          role: string | null
          segmento: string | null
          source: string | null
          status: string
          step_index: number
          updated_at: string
        }
        Insert: {
          cadence_id?: string | null
          channel?: string | null
          company?: string
          company_target?: string | null
          created_at?: string
          data_entrada?: string | null
          email?: string | null
          faturamento?: string | null
          fonte?: string | null
          id?: string
          loss_reason?: string | null
          name: string
          notes?: string | null
          origem_importacao?: string | null
          owner_id?: string | null
          phase_index?: number
          phone?: string | null
          role?: string | null
          segmento?: string | null
          source?: string | null
          status?: string
          step_index?: number
          updated_at?: string
        }
        Update: {
          cadence_id?: string | null
          channel?: string | null
          company?: string
          company_target?: string | null
          created_at?: string
          data_entrada?: string | null
          email?: string | null
          faturamento?: string | null
          fonte?: string | null
          id?: string
          loss_reason?: string | null
          name?: string
          notes?: string | null
          origem_importacao?: string | null
          owner_id?: string | null
          phase_index?: number
          phone?: string | null
          role?: string | null
          segmento?: string | null
          source?: string | null
          status?: string
          step_index?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          nome: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          nome: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sdr_companies: {
        Row: {
          company: string
          created_at: string
          id: string
          sdr_id: string
        }
        Insert: {
          company: string
          created_at?: string
          id?: string
          sdr_id: string
        }
        Update: {
          company?: string
          created_at?: string
          id?: string
          sdr_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "gestor" | "sdr"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["gestor", "sdr"],
    },
  },
} as const
