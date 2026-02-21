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
          blocked_reason: string | null
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
          blocked_reason?: string | null
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
          blocked_reason?: string | null
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
      campus_domains: {
        Row: {
          campus_name: string | null
          city: string | null
          country: string | null
          created_at: string
          domain_root: string
          id: string
          is_approved: boolean
          is_blocked: boolean
          latitude: number | null
          longitude: number | null
          state: string | null
          updated_at: string
          verification_confidence: number
        }
        Insert: {
          campus_name?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          domain_root: string
          id?: string
          is_approved?: boolean
          is_blocked?: boolean
          latitude?: number | null
          longitude?: number | null
          state?: string | null
          updated_at?: string
          verification_confidence?: number
        }
        Update: {
          campus_name?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          domain_root?: string
          id?: string
          is_approved?: boolean
          is_blocked?: boolean
          latitude?: number | null
          longitude?: number | null
          state?: string | null
          updated_at?: string
          verification_confidence?: number
        }
        Relationships: []
      }
      campus_locations: {
        Row: {
          address: string | null
          campus_id: string
          city: string | null
          created_at: string
          id: string
          is_primary: boolean
          latitude: number | null
          location_name: string
          longitude: number | null
          state: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          campus_id: string
          city?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          latitude?: number | null
          location_name?: string
          longitude?: number | null
          state?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          campus_id?: string
          city?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          latitude?: number | null
          location_name?: string
          longitude?: number | null
          state?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campus_locations_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campus_domains"
            referencedColumns: ["id"]
          },
        ]
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
          deal_scope: Database["public"]["Enums"]["deal_scope"]
          description: string | null
          direct_link_url: string | null
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: string | null
          early_access: boolean
          eligible_campuses: string[] | null
          eligible_cities: string[] | null
          eligible_regions: string[] | null
          eligible_roles: Database["public"]["Enums"]["campus_role"][] | null
          expires_at: string | null
          featured: boolean
          geo_radius_miles: number | null
          id: string
          last_checked_at: string | null
          partner_id: string | null
          partner_offer_id: string | null
          requires_campus_verification: boolean
          requires_edu_email: boolean
          requires_role_verification: boolean
          sponsor_end_at: string | null
          sponsor_start_at: string | null
          sponsor_tier: number | null
          sponsored: boolean
          status: Database["public"]["Enums"]["deal_status"]
          store_id: string
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          affiliate_link_url?: string | null
          ai_summary?: string | null
          category?: string | null
          commission_rate?: number | null
          created_at?: string
          deal_scope?: Database["public"]["Enums"]["deal_scope"]
          description?: string | null
          direct_link_url?: string | null
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value?: string | null
          early_access?: boolean
          eligible_campuses?: string[] | null
          eligible_cities?: string[] | null
          eligible_regions?: string[] | null
          eligible_roles?: Database["public"]["Enums"]["campus_role"][] | null
          expires_at?: string | null
          featured?: boolean
          geo_radius_miles?: number | null
          id?: string
          last_checked_at?: string | null
          partner_id?: string | null
          partner_offer_id?: string | null
          requires_campus_verification?: boolean
          requires_edu_email?: boolean
          requires_role_verification?: boolean
          sponsor_end_at?: string | null
          sponsor_start_at?: string | null
          sponsor_tier?: number | null
          sponsored?: boolean
          status?: Database["public"]["Enums"]["deal_status"]
          store_id: string
          title: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          affiliate_link_url?: string | null
          ai_summary?: string | null
          category?: string | null
          commission_rate?: number | null
          created_at?: string
          deal_scope?: Database["public"]["Enums"]["deal_scope"]
          description?: string | null
          direct_link_url?: string | null
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value?: string | null
          early_access?: boolean
          eligible_campuses?: string[] | null
          eligible_cities?: string[] | null
          eligible_regions?: string[] | null
          eligible_roles?: Database["public"]["Enums"]["campus_role"][] | null
          expires_at?: string | null
          featured?: boolean
          geo_radius_miles?: number | null
          id?: string
          last_checked_at?: string | null
          partner_id?: string | null
          partner_offer_id?: string | null
          requires_campus_verification?: boolean
          requires_edu_email?: boolean
          requires_role_verification?: boolean
          sponsor_end_at?: string | null
          sponsor_start_at?: string | null
          sponsor_tier?: number | null
          sponsored?: boolean
          status?: Database["public"]["Enums"]["deal_status"]
          store_id?: string
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "deals_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_partner_offer_id_fkey"
            columns: ["partner_offer_id"]
            isOneToOne: false
            referencedRelation: "partner_offers"
            referencedColumns: ["id"]
          },
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
      partner_locations: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          id: string
          is_active: boolean
          latitude: number | null
          location_name: string | null
          longitude: number | null
          partner_id: string
          radius_miles: number
          state: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          partner_id: string
          radius_miles?: number
          state?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          partner_id?: string
          radius_miles?: number
          state?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_locations_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_offers: {
        Row: {
          created_at: string
          deal_type: Database["public"]["Enums"]["discount_type"]
          discount_value: string | null
          eligible_roles: Database["public"]["Enums"]["campus_role"][] | null
          end_at: string | null
          id: string
          offer_description: string | null
          offer_title: string
          partner_id: string
          redemption_instructions: string | null
          requires_campus_verification: boolean
          start_at: string | null
          status: Database["public"]["Enums"]["offer_status"]
          terms: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deal_type?: Database["public"]["Enums"]["discount_type"]
          discount_value?: string | null
          eligible_roles?: Database["public"]["Enums"]["campus_role"][] | null
          end_at?: string | null
          id?: string
          offer_description?: string | null
          offer_title: string
          partner_id: string
          redemption_instructions?: string | null
          requires_campus_verification?: boolean
          start_at?: string | null
          status?: Database["public"]["Enums"]["offer_status"]
          terms?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deal_type?: Database["public"]["Enums"]["discount_type"]
          discount_value?: string | null
          eligible_roles?: Database["public"]["Enums"]["campus_role"][] | null
          end_at?: string | null
          id?: string
          offer_description?: string | null
          offer_title?: string
          partner_id?: string
          redemption_instructions?: string | null
          requires_campus_verification?: boolean
          start_at?: string | null
          status?: Database["public"]["Enums"]["offer_status"]
          terms?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_offers_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          contact_email: string | null
          created_at: string
          id: string
          logo_url: string | null
          partner_name: string
          partner_type: Database["public"]["Enums"]["partner_type"]
          status: Database["public"]["Enums"]["partner_status"]
          updated_at: string
          website_url: string | null
        }
        Insert: {
          contact_email?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          partner_name: string
          partner_type?: Database["public"]["Enums"]["partner_type"]
          status?: Database["public"]["Enums"]["partner_status"]
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          contact_email?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          partner_name?: string
          partner_type?: Database["public"]["Enums"]["partner_type"]
          status?: Database["public"]["Enums"]["partner_status"]
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      paywall_views: {
        Row: {
          created_at: string
          deal_id: string
          id: string
          source_page: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          deal_id: string
          id?: string
          source_page: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          deal_id?: string
          id?: string
          source_page?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          campus_city: string | null
          campus_domain: string | null
          campus_id: string | null
          campus_name: string | null
          campus_role: Database["public"]["Enums"]["campus_role"] | null
          campus_role_status: Database["public"]["Enums"]["campus_role_status"]
          campus_state: string | null
          campus_verification_method:
            | Database["public"]["Enums"]["campus_verification_method"]
            | null
          campus_verified: boolean
          created_at: string
          email: string | null
          id: string
          location_opt_in: boolean
          name: string | null
          premium_status: boolean
          student_verified: boolean
          updated_at: string
          user_city: string | null
          user_state: string | null
          verification_notes: string | null
          verification_strength_score: number
        }
        Insert: {
          campus_city?: string | null
          campus_domain?: string | null
          campus_id?: string | null
          campus_name?: string | null
          campus_role?: Database["public"]["Enums"]["campus_role"] | null
          campus_role_status?: Database["public"]["Enums"]["campus_role_status"]
          campus_state?: string | null
          campus_verification_method?:
            | Database["public"]["Enums"]["campus_verification_method"]
            | null
          campus_verified?: boolean
          created_at?: string
          email?: string | null
          id: string
          location_opt_in?: boolean
          name?: string | null
          premium_status?: boolean
          student_verified?: boolean
          updated_at?: string
          user_city?: string | null
          user_state?: string | null
          verification_notes?: string | null
          verification_strength_score?: number
        }
        Update: {
          campus_city?: string | null
          campus_domain?: string | null
          campus_id?: string | null
          campus_name?: string | null
          campus_role?: Database["public"]["Enums"]["campus_role"] | null
          campus_role_status?: Database["public"]["Enums"]["campus_role_status"]
          campus_state?: string | null
          campus_verification_method?:
            | Database["public"]["Enums"]["campus_verification_method"]
            | null
          campus_verified?: boolean
          created_at?: string
          email?: string | null
          id?: string
          location_opt_in?: boolean
          name?: string | null
          premium_status?: boolean
          student_verified?: boolean
          updated_at?: string
          user_city?: string | null
          user_state?: string | null
          verification_notes?: string | null
          verification_strength_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "profiles_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campus_domains"
            referencedColumns: ["id"]
          },
        ]
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
          action_type:
            | Database["public"]["Enums"]["verification_action_type"]
            | null
          admin_id: string
          campus_verification_method:
            | Database["public"]["Enums"]["campus_verification_method"]
            | null
          created_at: string
          id: string
          new_campus_status:
            | Database["public"]["Enums"]["campus_role_status"]
            | null
          new_role: Database["public"]["Enums"]["campus_role"] | null
          new_status: boolean
          previous_campus_status:
            | Database["public"]["Enums"]["campus_role_status"]
            | null
          previous_role: Database["public"]["Enums"]["campus_role"] | null
          previous_status: boolean
          reason: string
          user_id: string
          verification_method: Database["public"]["Enums"]["verification_method"]
        }
        Insert: {
          action_type?:
            | Database["public"]["Enums"]["verification_action_type"]
            | null
          admin_id: string
          campus_verification_method?:
            | Database["public"]["Enums"]["campus_verification_method"]
            | null
          created_at?: string
          id?: string
          new_campus_status?:
            | Database["public"]["Enums"]["campus_role_status"]
            | null
          new_role?: Database["public"]["Enums"]["campus_role"] | null
          new_status: boolean
          previous_campus_status?:
            | Database["public"]["Enums"]["campus_role_status"]
            | null
          previous_role?: Database["public"]["Enums"]["campus_role"] | null
          previous_status: boolean
          reason: string
          user_id: string
          verification_method?: Database["public"]["Enums"]["verification_method"]
        }
        Update: {
          action_type?:
            | Database["public"]["Enums"]["verification_action_type"]
            | null
          admin_id?: string
          campus_verification_method?:
            | Database["public"]["Enums"]["campus_verification_method"]
            | null
          created_at?: string
          id?: string
          new_campus_status?:
            | Database["public"]["Enums"]["campus_role_status"]
            | null
          new_role?: Database["public"]["Enums"]["campus_role"] | null
          new_status?: boolean
          previous_campus_status?:
            | Database["public"]["Enums"]["campus_role_status"]
            | null
          previous_role?: Database["public"]["Enums"]["campus_role"] | null
          previous_status?: boolean
          reason?: string
          user_id?: string
          verification_method?: Database["public"]["Enums"]["verification_method"]
        }
        Relationships: []
      }
      verification_requests: {
        Row: {
          admin_decision_reason: string | null
          admin_id: string | null
          campus_role_requested: Database["public"]["Enums"]["campus_role"]
          created_at: string
          email_domain: string
          id: string
          proof_upload_urls: string[] | null
          reviewed_at: string | null
          status: Database["public"]["Enums"]["campus_role_status"]
          user_id: string
          user_message: string | null
        }
        Insert: {
          admin_decision_reason?: string | null
          admin_id?: string | null
          campus_role_requested: Database["public"]["Enums"]["campus_role"]
          created_at?: string
          email_domain: string
          id?: string
          proof_upload_urls?: string[] | null
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["campus_role_status"]
          user_id: string
          user_message?: string | null
        }
        Update: {
          admin_decision_reason?: string | null
          admin_id?: string | null
          campus_role_requested?: Database["public"]["Enums"]["campus_role"]
          created_at?: string
          email_domain?: string
          id?: string
          proof_upload_urls?: string[] | null
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["campus_role_status"]
          user_id?: string
          user_message?: string | null
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
      check_verification_request_rate_limit: {
        Args: {
          p_max_requests?: number
          p_user_id: string
          p_window_hours?: number
        }
        Returns: boolean
      }
      compute_verification_score: {
        Args: {
          p_admin_verified?: boolean
          p_domain_approved?: boolean
          p_has_edu?: boolean
          p_has_proof?: boolean
        }
        Returns: number
      }
      ensure_campus_domain: {
        Args: { p_campus_name?: string; p_domain_root: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      normalize_campus_domain: {
        Args: { email_address: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "user" | "premium_user" | "admin"
      campus_role: "student" | "faculty" | "staff" | "alumni"
      campus_role_status: "unselected" | "pending" | "verified" | "rejected"
      campus_verification_method:
        | "edu_email"
        | "manual_admin"
        | "partner_provider"
      conversion_status: "pending" | "confirmed" | "paid"
      deal_scope: "national" | "regional" | "local"
      deal_status: "active" | "expired" | "coming_soon"
      discount_type: "percentage" | "fixed" | "free_trial" | "bogo" | "other"
      offer_status: "pending" | "active" | "expired"
      partner_status: "lead" | "active" | "paused"
      partner_type:
        | "local_business"
        | "regional_chain"
        | "national_brand"
        | "affiliate_network"
      submission_status: "pending" | "approved" | "rejected"
      verification_action_type:
        | "role_selected"
        | "verification_requested"
        | "verification_approved"
        | "verification_rejected"
        | "verification_revoked"
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
      campus_role: ["student", "faculty", "staff", "alumni"],
      campus_role_status: ["unselected", "pending", "verified", "rejected"],
      campus_verification_method: [
        "edu_email",
        "manual_admin",
        "partner_provider",
      ],
      conversion_status: ["pending", "confirmed", "paid"],
      deal_scope: ["national", "regional", "local"],
      deal_status: ["active", "expired", "coming_soon"],
      discount_type: ["percentage", "fixed", "free_trial", "bogo", "other"],
      offer_status: ["pending", "active", "expired"],
      partner_status: ["lead", "active", "paused"],
      partner_type: [
        "local_business",
        "regional_chain",
        "national_brand",
        "affiliate_network",
      ],
      submission_status: ["pending", "approved", "rejected"],
      verification_action_type: [
        "role_selected",
        "verification_requested",
        "verification_approved",
        "verification_rejected",
        "verification_revoked",
      ],
      verification_method: ["edu", "manual", "partner"],
    },
  },
} as const
