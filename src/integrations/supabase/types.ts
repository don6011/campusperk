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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      affiliate_clicks: {
        Row: {
          clicked_at: string
          country: string | null
          deal_id: string
          device_type: string | null
          flag_reason: string | null
          flagged: boolean | null
          id: string
          ip_hint: string | null
          is_premium_user: boolean | null
          is_verified_student: boolean | null
          referrer: string | null
          user_id: string | null
        }
        Insert: {
          clicked_at?: string
          country?: string | null
          deal_id: string
          device_type?: string | null
          flag_reason?: string | null
          flagged?: boolean | null
          id?: string
          ip_hint?: string | null
          is_premium_user?: boolean | null
          is_verified_student?: boolean | null
          referrer?: string | null
          user_id?: string | null
        }
        Update: {
          clicked_at?: string
          country?: string | null
          deal_id?: string
          device_type?: string | null
          flag_reason?: string | null
          flagged?: boolean | null
          id?: string
          ip_hint?: string | null
          is_premium_user?: boolean | null
          is_verified_student?: boolean | null
          referrer?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_clicks_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_conversions: {
        Row: {
          click_id: string | null
          commission_earned: number | null
          conversion_date: string | null
          created_at: string
          deal_id: string
          id: string
          network: string | null
          notes: string | null
          order_value: number | null
          status: Database["public"]["Enums"]["conversion_status"]
        }
        Insert: {
          click_id?: string | null
          commission_earned?: number | null
          conversion_date?: string | null
          created_at?: string
          deal_id: string
          id?: string
          network?: string | null
          notes?: string | null
          order_value?: number | null
          status?: Database["public"]["Enums"]["conversion_status"]
        }
        Update: {
          click_id?: string | null
          commission_earned?: number | null
          conversion_date?: string | null
          created_at?: string
          deal_id?: string
          id?: string
          network?: string | null
          notes?: string | null
          order_value?: number | null
          status?: Database["public"]["Enums"]["conversion_status"]
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_conversions_click_id_fkey"
            columns: ["click_id"]
            isOneToOne: false
            referencedRelation: "affiliate_clicks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_conversions_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_subscriptions: {
        Row: {
          alert_type: string
          categories: string[] | null
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          alert_type?: string
          categories?: string[] | null
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          alert_type?: string
          categories?: string[] | null
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          icon_url: string | null
          id: string
          name: string
          slug: string
          sponsored: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          icon_url?: string | null
          id?: string
          name: string
          slug: string
          sponsored?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          icon_url?: string | null
          id?: string
          name?: string
          slug?: string
          sponsored?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      deals: {
        Row: {
          affiliate_link_url: string | null
          ai_summary: string | null
          category: string | null
          commission_rate: number | null
          created_at: string
          description: string | null
          direct_link_url: string | null
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: string | null
          expires_at: string | null
          featured: boolean
          id: string
          last_checked_at: string | null
          requires_edu_email: boolean
          sponsored: boolean
          status: Database["public"]["Enums"]["deal_status"]
          store_id: string
          title: string
          updated_at: string
        }
        Insert: {
          affiliate_link_url?: string | null
          ai_summary?: string | null
          category?: string | null
          commission_rate?: number | null
          created_at?: string
          description?: string | null
          direct_link_url?: string | null
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value?: string | null
          expires_at?: string | null
          featured?: boolean
          id?: string
          last_checked_at?: string | null
          requires_edu_email?: boolean
          sponsored?: boolean
          status?: Database["public"]["Enums"]["deal_status"]
          store_id: string
          title: string
          updated_at?: string
        }
        Update: {
          affiliate_link_url?: string | null
          ai_summary?: string | null
          category?: string | null
          commission_rate?: number | null
          created_at?: string
          description?: string | null
          direct_link_url?: string | null
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value?: string | null
          expires_at?: string | null
          featured?: boolean
          id?: string
          last_checked_at?: string | null
          requires_edu_email?: boolean
          sponsored?: boolean
          status?: Database["public"]["Enums"]["deal_status"]
          store_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deals_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          deal_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deal_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deal_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string | null
          premium_status: boolean
          student_verified: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          name?: string | null
          premium_status?: boolean
          student_verified?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          premium_status?: boolean
          student_verified?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      stores: {
        Row: {
          categories: string[] | null
          created_at: string
          id: string
          logo_url: string | null
          name: string
          student_discount_available: boolean
          website_url: string | null
        }
        Insert: {
          categories?: string[] | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          student_discount_available?: boolean
          website_url?: string | null
        }
        Update: {
          categories?: string[] | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          student_discount_available?: boolean
          website_url?: string | null
        }
        Relationships: []
      }
      submissions: {
        Row: {
          admin_notes: string | null
          affiliate_network: string | null
          banner_url: string | null
          category: string | null
          commission_rate: number | null
          created_at: string
          deal_info: string | null
          deal_title: string | null
          deal_type: string | null
          deal_url: string | null
          expiration_date: string | null
          id: string
          is_affiliate: boolean | null
          logo_url: string | null
          redemption_steps: string | null
          region: string | null
          screenshot_url: string | null
          status: Database["public"]["Enums"]["submission_status"]
          store_name: string
          submitted_by: string | null
          verification_provider: string | null
        }
        Insert: {
          admin_notes?: string | null
          affiliate_network?: string | null
          banner_url?: string | null
          category?: string | null
          commission_rate?: number | null
          created_at?: string
          deal_info?: string | null
          deal_title?: string | null
          deal_type?: string | null
          deal_url?: string | null
          expiration_date?: string | null
          id?: string
          is_affiliate?: boolean | null
          logo_url?: string | null
          redemption_steps?: string | null
          region?: string | null
          screenshot_url?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          store_name: string
          submitted_by?: string | null
          verification_provider?: string | null
        }
        Update: {
          admin_notes?: string | null
          affiliate_network?: string | null
          banner_url?: string | null
          category?: string | null
          commission_rate?: number | null
          created_at?: string
          deal_info?: string | null
          deal_title?: string | null
          deal_type?: string | null
          deal_url?: string | null
          expiration_date?: string | null
          id?: string
          is_affiliate?: boolean | null
          logo_url?: string | null
          redemption_steps?: string | null
          region?: string | null
          screenshot_url?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          store_name?: string
          submitted_by?: string | null
          verification_provider?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      verification_attempts: {
        Row: {
          attempted_at: string
          email: string
          email_domain: string
          id: string
          ip_hint: string | null
          success: boolean
          user_id: string | null
        }
        Insert: {
          attempted_at?: string
          email: string
          email_domain: string
          id?: string
          ip_hint?: string | null
          success?: boolean
          user_id?: string | null
        }
        Update: {
          attempted_at?: string
          email?: string
          email_domain?: string
          id?: string
          ip_hint?: string | null
          success?: boolean
          user_id?: string | null
        }
        Relationships: []
      }
      verification_audit_log: {
        Row: {
          admin_id: string
          created_at: string
          id: string
          new_status: boolean
          previous_status: boolean
          reason: string
          user_id: string
          verification_method: Database["public"]["Enums"]["verification_method"]
        }
        Insert: {
          admin_id: string
          created_at?: string
          id?: string
          new_status: boolean
          previous_status: boolean
          reason: string
          user_id: string
          verification_method?: Database["public"]["Enums"]["verification_method"]
        }
        Update: {
          admin_id?: string
          created_at?: string
          id?: string
          new_status?: boolean
          previous_status?: boolean
          reason?: string
          user_id?: string
          verification_method?: Database["public"]["Enums"]["verification_method"]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_domain_abuse: {
        Args: {
          p_domain: string
          p_max_accounts?: number
          p_window_hours?: number
        }
        Returns: boolean
      }
      check_verification_rate_limit: {
        Args: {
          p_max_attempts?: number
          p_user_id: string
          p_window_hours?: number
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "user" | "premium_user" | "admin"
      conversion_status: "pending" | "confirmed" | "paid"
      deal_status: "active" | "expired" | "coming_soon"
      discount_type: "percentage" | "fixed" | "free_trial" | "bogo" | "other"
      submission_status: "pending" | "approved" | "rejected"
      verification_method: "edu" | "manual" | "partner"
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
      app_role: ["user", "premium_user", "admin"],
      conversion_status: ["pending", "confirmed", "paid"],
      deal_status: ["active", "expired", "coming_soon"],
      discount_type: ["percentage", "fixed", "free_trial", "bogo", "other"],
      submission_status: ["pending", "approved", "rejected"],
      verification_method: ["edu", "manual", "partner"],
    },
  },
} as const
