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
          campus_id: string | null
          clicked_at: string
          country: string | null
          deal_id: string
          device_type: string | null
          flag_reason: string | null
          flagged: boolean | null
          id: string
          ip_hint: string | null
          is_premium_user: boolean | null
          is_sponsored: boolean | null
          is_verified_student: boolean | null
          referral_code: string | null
          referrer: string | null
          scope: string | null
          user_id: string | null
        }
        Insert: {
          blocked_reason?: string | null
          campus_id?: string | null
          clicked_at?: string
          country?: string | null
          deal_id: string
          device_type?: string | null
          flag_reason?: string | null
          flagged?: boolean | null
          id?: string
          ip_hint?: string | null
          is_premium_user?: boolean | null
          is_sponsored?: boolean | null
          is_verified_student?: boolean | null
          referral_code?: string | null
          referrer?: string | null
          scope?: string | null
          user_id?: string | null
        }
        Update: {
          blocked_reason?: string | null
          campus_id?: string | null
          clicked_at?: string
          country?: string | null
          deal_id?: string
          device_type?: string | null
          flag_reason?: string | null
          flagged?: boolean | null
          id?: string
          ip_hint?: string | null
          is_premium_user?: boolean | null
          is_sponsored?: boolean | null
          is_verified_student?: boolean | null
          referral_code?: string | null
          referrer?: string | null
          scope?: string | null
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
      affiliate_networks: {
        Row: {
          api_connected: boolean
          created_at: string
          id: string
          last_sync_at: string | null
          network_key: string
          network_name: string
          notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          api_connected?: boolean
          created_at?: string
          id?: string
          last_sync_at?: string | null
          network_key: string
          network_name: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          api_connected?: boolean
          created_at?: string
          id?: string
          last_sync_at?: string | null
          network_key?: string
          network_name?: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      affiliate_raw_deals: {
        Row: {
          advertiser_id: string | null
          affiliate_url: string | null
          brand: string | null
          category: string | null
          checksum: string | null
          created_at: string
          description: string | null
          external_id: string
          id: string
          image_url: string | null
          network_name: string
          raw_data: Json | null
          source_id: string
          status: string | null
          title: string
        }
        Insert: {
          advertiser_id?: string | null
          affiliate_url?: string | null
          brand?: string | null
          category?: string | null
          checksum?: string | null
          created_at?: string
          description?: string | null
          external_id: string
          id?: string
          image_url?: string | null
          network_name: string
          raw_data?: Json | null
          source_id: string
          status?: string | null
          title: string
        }
        Update: {
          advertiser_id?: string | null
          affiliate_url?: string | null
          brand?: string | null
          category?: string | null
          checksum?: string | null
          created_at?: string
          description?: string | null
          external_id?: string
          id?: string
          image_url?: string | null
          network_name?: string
          raw_data?: Json | null
          source_id?: string
          status?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_raw_deals_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "affiliate_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_revenue: {
        Row: {
          campus_id: string | null
          commission_amount: number
          conversion_date: string
          conversion_id: string | null
          created_at: string
          deal_id: string | null
          id: string
          merchant_id: string | null
          metadata: Json
          network: string
          status: string
          user_id: string | null
        }
        Insert: {
          campus_id?: string | null
          commission_amount?: number
          conversion_date?: string
          conversion_id?: string | null
          created_at?: string
          deal_id?: string | null
          id?: string
          merchant_id?: string | null
          metadata?: Json
          network: string
          status?: string
          user_id?: string | null
        }
        Update: {
          campus_id?: string | null
          commission_amount?: number
          conversion_date?: string
          conversion_id?: string | null
          created_at?: string
          deal_id?: string | null
          id?: string
          merchant_id?: string | null
          metadata?: Json
          network?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_revenue_conversion_id_fkey"
            columns: ["conversion_id"]
            isOneToOne: false
            referencedRelation: "affiliate_conversions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_revenue_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_revenue_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_sources: {
        Row: {
          api_endpoint: string | null
          api_key_secret_name: string | null
          auth_type: string | null
          created_at: string
          credentials_json: Json | null
          feed_url: string | null
          id: string
          last_synced_at: string | null
          network_name: string
          source_name: string | null
          status: string
          updated_at: string
        }
        Insert: {
          api_endpoint?: string | null
          api_key_secret_name?: string | null
          auth_type?: string | null
          created_at?: string
          credentials_json?: Json | null
          feed_url?: string | null
          id?: string
          last_synced_at?: string | null
          network_name: string
          source_name?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          api_endpoint?: string | null
          api_key_secret_name?: string | null
          auth_type?: string | null
          created_at?: string
          credentials_json?: Json | null
          feed_url?: string | null
          id?: string
          last_synced_at?: string | null
          network_name?: string
          source_name?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      affiliate_sync_logs: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          duplicate_deals: number
          failed_imports: number
          id: string
          message: string | null
          network: string | null
          network_id: string | null
          new_deals_imported: number
          raw_result: Json | null
          source_id: string | null
          started_at: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          duplicate_deals?: number
          failed_imports?: number
          id?: string
          message?: string | null
          network?: string | null
          network_id?: string | null
          new_deals_imported?: number
          raw_result?: Json | null
          source_id?: string | null
          started_at?: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          duplicate_deals?: number
          failed_imports?: number
          id?: string
          message?: string | null
          network?: string | null
          network_id?: string | null
          new_deals_imported?: number
          raw_result?: Json | null
          source_id?: string | null
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_sync_logs_network_id_fkey"
            columns: ["network_id"]
            isOneToOne: false
            referencedRelation: "affiliate_networks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_sync_logs_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "affiliate_sources"
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
      ambassador_applications: {
        Row: {
          created_at: string
          email: string
          graduation_year: number | null
          id: string
          motivation_text: string | null
          name: string
          referral_goal: number
          role: string
          social_handle: string | null
          source: string | null
          status: string
          university: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          graduation_year?: number | null
          id?: string
          motivation_text?: string | null
          name: string
          referral_goal?: number
          role?: string
          social_handle?: string | null
          source?: string | null
          status?: string
          university: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          graduation_year?: number | null
          id?: string
          motivation_text?: string | null
          name?: string
          referral_goal?: number
          role?: string
          social_handle?: string | null
          source?: string | null
          status?: string
          university?: string
          user_id?: string | null
        }
        Relationships: []
      }
      ambassador_reward_unlocks: {
        Row: {
          ambassador_id: string
          claimed_at: string | null
          created_at: string
          current_value: number
          id: string
          reward_key: string
          reward_label: string
          status: string
          threshold_type: string
          threshold_value: number
          unlocked_at: string
          user_id: string
        }
        Insert: {
          ambassador_id: string
          claimed_at?: string | null
          created_at?: string
          current_value?: number
          id?: string
          reward_key: string
          reward_label: string
          status?: string
          threshold_type: string
          threshold_value: number
          unlocked_at?: string
          user_id: string
        }
        Update: {
          ambassador_id?: string
          claimed_at?: string | null
          created_at?: string
          current_value?: number
          id?: string
          reward_key?: string
          reward_label?: string
          status?: string
          threshold_type?: string
          threshold_value?: number
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ambassador_reward_unlocks_ambassador_id_fkey"
            columns: ["ambassador_id"]
            isOneToOne: false
            referencedRelation: "ambassadors"
            referencedColumns: ["id"]
          },
        ]
      }
      ambassadors: {
        Row: {
          approved_at: string | null
          created_at: string
          founding_conversion_goal: number
          id: string
          merchant_lead_goal: number
          referral_code: string
          reward_balance_cents: number
          status: string
          tier: string
          university: string
          user_id: string
          verified_referral_goal: number
        }
        Insert: {
          approved_at?: string | null
          created_at?: string
          founding_conversion_goal?: number
          id?: string
          merchant_lead_goal?: number
          referral_code: string
          reward_balance_cents?: number
          status?: string
          tier?: string
          university: string
          user_id: string
          verified_referral_goal?: number
        }
        Update: {
          approved_at?: string | null
          created_at?: string
          founding_conversion_goal?: number
          id?: string
          merchant_lead_goal?: number
          referral_code?: string
          reward_balance_cents?: number
          status?: string
          tier?: string
          university?: string
          user_id?: string
          verified_referral_goal?: number
        }
        Relationships: []
      }
      brand_aliases: {
        Row: {
          created_at: string | null
          id: string
          normalized_brand_name: string
          raw_brand_name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          normalized_brand_name: string
          raw_brand_name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          normalized_brand_name?: string
          raw_brand_name?: string
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
          primary_color: string | null
          secondary_color: string | null
          state: string | null
          state_code: string | null
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
          primary_color?: string | null
          secondary_color?: string | null
          state?: string | null
          state_code?: string | null
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
          primary_color?: string | null
          secondary_color?: string | null
          state?: string | null
          state_code?: string | null
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
      campus_points: {
        Row: {
          action: string
          campus_id: string
          created_at: string
          id: string
          points: number
          user_id: string
          week_start: string
        }
        Insert: {
          action: string
          campus_id: string
          created_at?: string
          id?: string
          points: number
          user_id: string
          week_start?: string
        }
        Update: {
          action?: string
          campus_id?: string
          created_at?: string
          id?: string
          points?: number
          user_id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "campus_points_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campus_domains"
            referencedColumns: ["id"]
          },
        ]
      }
      campus_savings: {
        Row: {
          campus_id: string
          id: string
          total_savings: number
          updated_at: string
          week_end: string
          week_start: string
        }
        Insert: {
          campus_id: string
          id?: string
          total_savings?: number
          updated_at?: string
          week_end: string
          week_start: string
        }
        Update: {
          campus_id?: string
          id?: string
          total_savings?: number
          updated_at?: string
          week_end?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "campus_savings_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campus_domains"
            referencedColumns: ["id"]
          },
        ]
      }
      campuses: {
        Row: {
          city: string | null
          country: string
          created_at: string
          domain: string | null
          id: string
          name: string
          state: string | null
          status: string
        }
        Insert: {
          city?: string | null
          country?: string
          created_at?: string
          domain?: string | null
          id?: string
          name: string
          state?: string | null
          status?: string
        }
        Update: {
          city?: string | null
          country?: string
          created_at?: string
          domain?: string | null
          id?: string
          name?: string
          state?: string | null
          status?: string
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
      daily_notification_counts: {
        Row: {
          count: number
          id: string
          notification_date: string
          user_id: string
        }
        Insert: {
          count?: number
          id?: string
          notification_date?: string
          user_id: string
        }
        Update: {
          count?: number
          id?: string
          notification_date?: string
          user_id?: string
        }
        Relationships: []
      }
      deal_claims: {
        Row: {
          campus_id: string | null
          claimed_at: string
          deal_id: string
          id: string
          user_id: string
        }
        Insert: {
          campus_id?: string | null
          claimed_at?: string
          deal_id: string
          id?: string
          user_id: string
        }
        Update: {
          campus_id?: string | null
          claimed_at?: string
          deal_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_claims_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campus_domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_claims_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_clicks: {
        Row: {
          campus_id: string | null
          clicked_at: string
          deal_id: string
          id: string
          user_id: string | null
        }
        Insert: {
          campus_id?: string | null
          clicked_at?: string
          deal_id: string
          id?: string
          user_id?: string | null
        }
        Update: {
          campus_id?: string | null
          clicked_at?: string
          deal_id?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_clicks_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campus_domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_clicks_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_redemptions: {
        Row: {
          campus_id: string
          created_at: string
          deal_id: string
          id: string
          savings_amount: number
          user_id: string
        }
        Insert: {
          campus_id: string
          created_at?: string
          deal_id: string
          id?: string
          savings_amount?: number
          user_id: string
        }
        Update: {
          campus_id?: string
          created_at?: string
          deal_id?: string
          id?: string
          savings_amount?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_redemptions_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campus_domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_redemptions_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          affiliate_link_url: string | null
          affiliate_network: string | null
          ai_summary: string | null
          category: string | null
          commission_rate: number | null
          commission_type: string
          created_at: string
          deal_scope: Database["public"]["Enums"]["deal_scope"]
          description: string | null
          direct_link_url: string | null
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: string | null
          drop_time: string | null
          drop_window: string | null
          early_access: boolean
          early_access_minutes: number
          eligible_campuses: string[] | null
          eligible_cities: string[] | null
          eligible_regions: string[] | null
          eligible_roles: Database["public"]["Enums"]["campus_role"][] | null
          expires_at: string | null
          featured: boolean
          geo_radius_miles: number | null
          id: string
          is_affiliate: boolean
          is_surprise_drop: boolean
          last_checked_at: string | null
          partner_id: string | null
          partner_offer_id: string | null
          premium_only: boolean
          requires_campus_verification: boolean
          requires_edu_email: boolean
          requires_role_verification: boolean
          sponsor_end_at: string | null
          sponsor_priority: number
          sponsor_source: string | null
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
          affiliate_network?: string | null
          ai_summary?: string | null
          category?: string | null
          commission_rate?: number | null
          commission_type?: string
          created_at?: string
          deal_scope?: Database["public"]["Enums"]["deal_scope"]
          description?: string | null
          direct_link_url?: string | null
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value?: string | null
          drop_time?: string | null
          drop_window?: string | null
          early_access?: boolean
          early_access_minutes?: number
          eligible_campuses?: string[] | null
          eligible_cities?: string[] | null
          eligible_regions?: string[] | null
          eligible_roles?: Database["public"]["Enums"]["campus_role"][] | null
          expires_at?: string | null
          featured?: boolean
          geo_radius_miles?: number | null
          id?: string
          is_affiliate?: boolean
          is_surprise_drop?: boolean
          last_checked_at?: string | null
          partner_id?: string | null
          partner_offer_id?: string | null
          premium_only?: boolean
          requires_campus_verification?: boolean
          requires_edu_email?: boolean
          requires_role_verification?: boolean
          sponsor_end_at?: string | null
          sponsor_priority?: number
          sponsor_source?: string | null
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
          affiliate_network?: string | null
          ai_summary?: string | null
          category?: string | null
          commission_rate?: number | null
          commission_type?: string
          created_at?: string
          deal_scope?: Database["public"]["Enums"]["deal_scope"]
          description?: string | null
          direct_link_url?: string | null
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value?: string | null
          drop_time?: string | null
          drop_window?: string | null
          early_access?: boolean
          early_access_minutes?: number
          eligible_campuses?: string[] | null
          eligible_cities?: string[] | null
          eligible_regions?: string[] | null
          eligible_roles?: Database["public"]["Enums"]["campus_role"][] | null
          expires_at?: string | null
          featured?: boolean
          geo_radius_miles?: number | null
          id?: string
          is_affiliate?: boolean
          is_surprise_drop?: boolean
          last_checked_at?: string | null
          partner_id?: string | null
          partner_offer_id?: string | null
          premium_only?: boolean
          requires_campus_verification?: boolean
          requires_edu_email?: boolean
          requires_role_verification?: boolean
          sponsor_end_at?: string | null
          sponsor_priority?: number
          sponsor_source?: string | null
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
      founding_member_reservations: {
        Row: {
          campus: string | null
          created_at: string
          email: string
          id: string
          name: string | null
          notes: string | null
          price_cents: number
          referral_code: string | null
          source: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          campus?: string | null
          created_at?: string
          email: string
          id?: string
          name?: string | null
          notes?: string | null
          price_cents?: number
          referral_code?: string | null
          source?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          campus?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          notes?: string | null
          price_cents?: number
          referral_code?: string | null
          source?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      group_deal_participants: {
        Row: {
          group_deal_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          group_deal_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          group_deal_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_deal_participants_group_deal_id_fkey"
            columns: ["group_deal_id"]
            isOneToOne: false
            referencedRelation: "group_deals"
            referencedColumns: ["id"]
          },
        ]
      }
      group_deals: {
        Row: {
          campus_id: string | null
          created_at: string
          created_by: string
          current_participants: number
          deal_id: string
          description: string | null
          expires_at: string
          id: string
          required_participants: number
          status: string
          title: string
          unlocked_at: string | null
          updated_at: string
        }
        Insert: {
          campus_id?: string | null
          created_at?: string
          created_by: string
          current_participants?: number
          deal_id: string
          description?: string | null
          expires_at: string
          id?: string
          required_participants?: number
          status?: string
          title: string
          unlocked_at?: string | null
          updated_at?: string
        }
        Update: {
          campus_id?: string | null
          created_at?: string
          created_by?: string
          current_participants?: number
          deal_id?: string
          description?: string | null
          expires_at?: string
          id?: string
          required_participants?: number
          status?: string
          title?: string
          unlocked_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_deals_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campus_domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_deals_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_submissions: {
        Row: {
          admin_notes: string | null
          approved_offer_id: string | null
          approved_partner_id: string | null
          business_name: string
          campus_target: string | null
          category: string | null
          city: string | null
          contact_email: string
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          discount_value: string | null
          expires_at: string | null
          id: string
          monthly_budget_cents: number | null
          offer_description: string | null
          offer_title: string
          proof_url: string | null
          redemption_instructions: string | null
          referral_code: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source: string
          sponsored_interest: boolean
          state: string | null
          status: string
          submitted_by: string | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          admin_notes?: string | null
          approved_offer_id?: string | null
          approved_partner_id?: string | null
          business_name: string
          campus_target?: string | null
          category?: string | null
          city?: string | null
          contact_email: string
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          discount_value?: string | null
          expires_at?: string | null
          id?: string
          monthly_budget_cents?: number | null
          offer_description?: string | null
          offer_title: string
          proof_url?: string | null
          redemption_instructions?: string | null
          referral_code?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string
          sponsored_interest?: boolean
          state?: string | null
          status?: string
          submitted_by?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          admin_notes?: string | null
          approved_offer_id?: string | null
          approved_partner_id?: string | null
          business_name?: string
          campus_target?: string | null
          category?: string | null
          city?: string | null
          contact_email?: string
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          discount_value?: string | null
          expires_at?: string | null
          id?: string
          monthly_budget_cents?: number | null
          offer_description?: string | null
          offer_title?: string
          proof_url?: string | null
          redemption_instructions?: string | null
          referral_code?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string
          sponsored_interest?: boolean
          state?: string | null
          status?: string
          submitted_by?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      normalized_deals: {
        Row: {
          advertiser_id: string | null
          advertiser_name: string | null
          affiliate_url: string | null
          brand: string | null
          brand_name: string | null
          campus_scope: string | null
          category: string | null
          category_primary: string | null
          category_secondary: string | null
          coupon_code: string | null
          created_at: string
          currency: string | null
          deeplink_url: string | null
          description: string | null
          domain: string | null
          estimated_savings_amount: number | null
          estimated_savings_percent: number | null
          expires_at: string | null
          id: string
          image_url: string | null
          is_coupon: boolean | null
          is_local: boolean | null
          is_premium_only: boolean | null
          is_student_relevant: boolean | null
          last_seen_at: string | null
          long_description: string | null
          network_item_id: string | null
          price: number | null
          promoted_deal_id: string | null
          raw_deal_id: string | null
          sale_price: number | null
          short_description: string | null
          source_network: string
          status: string | null
          student_relevance_score: number | null
          title: string
          updated_at: string
          verified: boolean
        }
        Insert: {
          advertiser_id?: string | null
          advertiser_name?: string | null
          affiliate_url?: string | null
          brand?: string | null
          brand_name?: string | null
          campus_scope?: string | null
          category?: string | null
          category_primary?: string | null
          category_secondary?: string | null
          coupon_code?: string | null
          created_at?: string
          currency?: string | null
          deeplink_url?: string | null
          description?: string | null
          domain?: string | null
          estimated_savings_amount?: number | null
          estimated_savings_percent?: number | null
          expires_at?: string | null
          id?: string
          image_url?: string | null
          is_coupon?: boolean | null
          is_local?: boolean | null
          is_premium_only?: boolean | null
          is_student_relevant?: boolean | null
          last_seen_at?: string | null
          long_description?: string | null
          network_item_id?: string | null
          price?: number | null
          promoted_deal_id?: string | null
          raw_deal_id?: string | null
          sale_price?: number | null
          short_description?: string | null
          source_network: string
          status?: string | null
          student_relevance_score?: number | null
          title: string
          updated_at?: string
          verified?: boolean
        }
        Update: {
          advertiser_id?: string | null
          advertiser_name?: string | null
          affiliate_url?: string | null
          brand?: string | null
          brand_name?: string | null
          campus_scope?: string | null
          category?: string | null
          category_primary?: string | null
          category_secondary?: string | null
          coupon_code?: string | null
          created_at?: string
          currency?: string | null
          deeplink_url?: string | null
          description?: string | null
          domain?: string | null
          estimated_savings_amount?: number | null
          estimated_savings_percent?: number | null
          expires_at?: string | null
          id?: string
          image_url?: string | null
          is_coupon?: boolean | null
          is_local?: boolean | null
          is_premium_only?: boolean | null
          is_student_relevant?: boolean | null
          last_seen_at?: string | null
          long_description?: string | null
          network_item_id?: string | null
          price?: number | null
          promoted_deal_id?: string | null
          raw_deal_id?: string | null
          sale_price?: number | null
          short_description?: string | null
          source_network?: string
          status?: string | null
          student_relevance_score?: number | null
          title?: string
          updated_at?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "normalized_deals_promoted_deal_id_fkey"
            columns: ["promoted_deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "normalized_deals_raw_deal_id_fkey"
            columns: ["raw_deal_id"]
            isOneToOne: false
            referencedRelation: "affiliate_raw_deals"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_log: {
        Row: {
          body: string | null
          id: string
          sent_at: string | null
          status: string | null
          title: string | null
          type: string | null
          user_id: string | null
        }
        Insert: {
          body?: string | null
          id?: string
          sent_at?: string | null
          status?: string | null
          title?: string | null
          type?: string | null
          user_id?: string | null
        }
        Update: {
          body?: string | null
          id?: string
          sent_at?: string | null
          status?: string | null
          title?: string | null
          type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          deal_drops: boolean | null
          ending_soon: boolean | null
          frequency: string | null
          local_deals: boolean | null
          quiet_end: string | null
          quiet_hours_enabled: boolean | null
          quiet_start: string | null
          savings_alerts: boolean | null
          trending_deals: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          deal_drops?: boolean | null
          ending_soon?: boolean | null
          frequency?: string | null
          local_deals?: boolean | null
          quiet_end?: string | null
          quiet_hours_enabled?: boolean | null
          quiet_start?: string | null
          savings_alerts?: boolean | null
          trending_deals?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          deal_drops?: boolean | null
          ending_soon?: boolean | null
          frequency?: string | null
          local_deals?: boolean | null
          quiet_end?: string | null
          quiet_hours_enabled?: boolean | null
          quiet_start?: string | null
          savings_alerts?: boolean | null
          trending_deals?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          category: string | null
          created_at: string
          deal_id: string | null
          id: string
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          category?: string | null
          created_at?: string
          deal_id?: string | null
          id?: string
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          category?: string | null
          created_at?: string
          deal_id?: string | null
          id?: string
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_inquiries: {
        Row: {
          business_name: string
          contact_name: string
          created_at: string
          deal_type: string | null
          email: string
          id: string
          notes: string | null
          website: string | null
        }
        Insert: {
          business_name: string
          contact_name: string
          created_at?: string
          deal_type?: string | null
          email: string
          id?: string
          notes?: string | null
          website?: string | null
        }
        Update: {
          business_name?: string
          contact_name?: string
          created_at?: string
          deal_type?: string | null
          email?: string
          id?: string
          notes?: string | null
          website?: string | null
        }
        Relationships: []
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
          state_code: string | null
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
          state_code?: string | null
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
          state_code?: string | null
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
          sponsor_end_at: string | null
          sponsor_notes: string | null
          sponsor_priority: number
          sponsor_start_at: string | null
          sponsor_tier: number | null
          sponsored: boolean
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
          sponsor_end_at?: string | null
          sponsor_notes?: string | null
          sponsor_priority?: number
          sponsor_start_at?: string | null
          sponsor_tier?: number | null
          sponsored?: boolean
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
          sponsor_end_at?: string | null
          sponsor_notes?: string | null
          sponsor_priority?: number
          sponsor_start_at?: string | null
          sponsor_tier?: number | null
          sponsored?: boolean
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
          active_deals: number
          advertiser_id: string | null
          affiliate_network: string | null
          affiliate_network_id: string | null
          approval_status: string
          commission_percent: number | null
          contact_email: string | null
          cookie_duration_days: number | null
          created_at: string
          featured_merchant: boolean
          id: string
          last_sync_at: string | null
          logo_url: string | null
          partner_name: string
          partner_type: Database["public"]["Enums"]["partner_type"]
          status: Database["public"]["Enums"]["partner_status"]
          total_deals: number
          updated_at: string
          website_url: string | null
        }
        Insert: {
          active_deals?: number
          advertiser_id?: string | null
          affiliate_network?: string | null
          affiliate_network_id?: string | null
          approval_status?: string
          commission_percent?: number | null
          contact_email?: string | null
          cookie_duration_days?: number | null
          created_at?: string
          featured_merchant?: boolean
          id?: string
          last_sync_at?: string | null
          logo_url?: string | null
          partner_name: string
          partner_type?: Database["public"]["Enums"]["partner_type"]
          status?: Database["public"]["Enums"]["partner_status"]
          total_deals?: number
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          active_deals?: number
          advertiser_id?: string | null
          affiliate_network?: string | null
          affiliate_network_id?: string | null
          approval_status?: string
          commission_percent?: number | null
          contact_email?: string | null
          cookie_duration_days?: number | null
          created_at?: string
          featured_merchant?: boolean
          id?: string
          last_sync_at?: string | null
          logo_url?: string | null
          partner_name?: string
          partner_type?: Database["public"]["Enums"]["partner_type"]
          status?: Database["public"]["Enums"]["partner_status"]
          total_deals?: number
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partners_affiliate_network_id_fkey"
            columns: ["affiliate_network_id"]
            isOneToOne: false
            referencedRelation: "affiliate_networks"
            referencedColumns: ["id"]
          },
        ]
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
          founding_member_number: number | null
          founding_member_since: string | null
          founding_member_source: string | null
          has_seen_splash: boolean
          id: string
          is_founding_member: boolean
          location_opt_in: boolean
          name: string | null
          premium_status: boolean
          student_verified: boolean
          updated_at: string
          use_campus_location: boolean
          user_city: string | null
          user_state: string | null
          user_state_code: string | null
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
          founding_member_number?: number | null
          founding_member_since?: string | null
          founding_member_source?: string | null
          has_seen_splash?: boolean
          id: string
          is_founding_member?: boolean
          location_opt_in?: boolean
          name?: string | null
          premium_status?: boolean
          student_verified?: boolean
          updated_at?: string
          use_campus_location?: boolean
          user_city?: string | null
          user_state?: string | null
          user_state_code?: string | null
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
          founding_member_number?: number | null
          founding_member_since?: string | null
          founding_member_source?: string | null
          has_seen_splash?: boolean
          id?: string
          is_founding_member?: boolean
          location_opt_in?: boolean
          name?: string | null
          premium_status?: boolean
          student_verified?: boolean
          updated_at?: string
          use_campus_location?: boolean
          user_city?: string | null
          user_state?: string | null
          user_state_code?: string | null
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
      push_devices: {
        Row: {
          created_at: string | null
          device_label: string | null
          fcm_token: string
          id: string
          last_seen: string | null
          platform: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_label?: string | null
          fcm_token: string
          id?: string
          last_seen?: string | null
          platform: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_label?: string | null
          fcm_token?: string
          id?: string
          last_seen?: string | null
          platform?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          ambassador_id: string | null
          conversion_event: string
          founding_converted_at: string | null
          id: string
          premium_converted_at: string | null
          referral_code: string
          referred_user_id: string | null
          reward_status: string
          signup_date: string
          source_path: string | null
          verified: boolean
        }
        Insert: {
          ambassador_id?: string | null
          conversion_event?: string
          founding_converted_at?: string | null
          id?: string
          premium_converted_at?: string | null
          referral_code: string
          referred_user_id?: string | null
          reward_status?: string
          signup_date?: string
          source_path?: string | null
          verified?: boolean
        }
        Update: {
          ambassador_id?: string | null
          conversion_event?: string
          founding_converted_at?: string | null
          id?: string
          premium_converted_at?: string | null
          referral_code?: string
          referred_user_id?: string | null
          reward_status?: string
          signup_date?: string
          source_path?: string | null
          verified?: boolean
        }
        Relationships: []
      }
      sponsored_clicks: {
        Row: {
          campus_id: string | null
          city: string | null
          created_at: string
          id: string
          is_sponsored: boolean
          item_id: string
          item_type: string
          partner_id: string | null
          scope: string | null
          sponsor_priority: number | null
          sponsor_tier: number | null
          state: string | null
          user_id: string | null
        }
        Insert: {
          campus_id?: string | null
          city?: string | null
          created_at?: string
          id?: string
          is_sponsored?: boolean
          item_id: string
          item_type?: string
          partner_id?: string | null
          scope?: string | null
          sponsor_priority?: number | null
          sponsor_tier?: number | null
          state?: string | null
          user_id?: string | null
        }
        Update: {
          campus_id?: string | null
          city?: string | null
          created_at?: string
          id?: string
          is_sponsored?: boolean
          item_id?: string
          item_type?: string
          partner_id?: string | null
          scope?: string | null
          sponsor_priority?: number | null
          sponsor_tier?: number | null
          state?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      sponsored_impressions: {
        Row: {
          campus_id: string | null
          city: string | null
          created_at: string
          deal_id: string | null
          id: string
          is_premium: boolean | null
          is_verified: boolean | null
          item_type: string | null
          offer_id: string | null
          partner_id: string | null
          scope: string | null
          state: string | null
          user_id: string | null
        }
        Insert: {
          campus_id?: string | null
          city?: string | null
          created_at?: string
          deal_id?: string | null
          id?: string
          is_premium?: boolean | null
          is_verified?: boolean | null
          item_type?: string | null
          offer_id?: string | null
          partner_id?: string | null
          scope?: string | null
          state?: string | null
          user_id?: string | null
        }
        Update: {
          campus_id?: string | null
          city?: string | null
          created_at?: string
          deal_id?: string | null
          id?: string
          is_premium?: boolean | null
          is_verified?: boolean | null
          item_type?: string | null
          offer_id?: string | null
          partner_id?: string | null
          scope?: string | null
          state?: string | null
          user_id?: string | null
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
      waitlist_signups: {
        Row: {
          campus: string
          campus_id: string | null
          campus_slug: string
          campus_text: string | null
          created_at: string
          email: string
          email_normalized: string
          email_type: string
          id: string
          referral_code: string
          referred_by: string | null
          role: string
          source: string | null
        }
        Insert: {
          campus: string
          campus_id?: string | null
          campus_slug: string
          campus_text?: string | null
          created_at?: string
          email: string
          email_normalized: string
          email_type?: string
          id?: string
          referral_code: string
          referred_by?: string | null
          role?: string
          source?: string | null
        }
        Update: {
          campus?: string
          campus_id?: string | null
          campus_slug?: string
          campus_text?: string | null
          created_at?: string
          email?: string
          email_normalized?: string
          email_type?: string
          id?: string
          referral_code?: string
          referred_by?: string | null
          role?: string
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_signups_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_decide_verification_request: {
        Args: { p_approve: boolean; p_reason: string; p_request_id: string }
        Returns: undefined
      }
      admin_list_deals: {
        Args: never
        Returns: {
          affiliate_link_url: string | null
          affiliate_network: string | null
          ai_summary: string | null
          category: string | null
          commission_rate: number | null
          commission_type: string
          created_at: string
          deal_scope: Database["public"]["Enums"]["deal_scope"]
          description: string | null
          direct_link_url: string | null
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: string | null
          drop_time: string | null
          drop_window: string | null
          early_access: boolean
          early_access_minutes: number
          eligible_campuses: string[] | null
          eligible_cities: string[] | null
          eligible_regions: string[] | null
          eligible_roles: Database["public"]["Enums"]["campus_role"][] | null
          expires_at: string | null
          featured: boolean
          geo_radius_miles: number | null
          id: string
          is_affiliate: boolean
          is_surprise_drop: boolean
          last_checked_at: string | null
          partner_id: string | null
          partner_offer_id: string | null
          premium_only: boolean
          requires_campus_verification: boolean
          requires_edu_email: boolean
          requires_role_verification: boolean
          sponsor_end_at: string | null
          sponsor_priority: number
          sponsor_source: string | null
          sponsor_start_at: string | null
          sponsor_tier: number | null
          sponsored: boolean
          status: Database["public"]["Enums"]["deal_status"]
          store_id: string
          title: string
          updated_at: string
          visibility: string
        }[]
        SetofOptions: {
          from: "*"
          to: "deals"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_merge_campus_domain: {
        Args: {
          p_source_domain: string
          p_source_id: string
          p_target_domain: string
        }
        Returns: undefined
      }
      admin_set_premium_status: {
        Args: { p_premium: boolean; p_reason: string; p_user_id: string }
        Returns: undefined
      }
      admin_set_student_verification: {
        Args: {
          p_method?: string
          p_reason: string
          p_user_id: string
          p_verified: boolean
        }
        Returns: undefined
      }
      approve_merchant_submission: {
        Args: { p_submission_id: string }
        Returns: Json
      }
      award_campus_points: { Args: { p_action: string }; Returns: undefined }
      check_domain_abuse: {
        Args: {
          p_domain: string
          p_max_accounts?: number
          p_window_hours?: number
        }
        Returns: boolean
      }
      check_user_rate_limit: {
        Args: { p_max: number; p_table: string; p_window: string }
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
      create_founding_member_reservation: {
        Args: {
          p_campus?: string
          p_email: string
          p_name?: string
          p_referral_code?: string
        }
        Returns: string
      }
      ensure_campus_domain: {
        Args: { p_campus_name?: string; p_domain_root: string }
        Returns: string
      }
      get_deal_redirect:
        | { Args: { p_deal_id: string }; Returns: Json }
        | {
            Args: {
              p_deal_id: string
              p_device_type?: string
              p_referral_code?: string
              p_referrer?: string
            }
            Returns: Json
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
      record_ambassador_referral: {
        Args: {
          p_event?: string
          p_referral_code: string
          p_referred_user_id?: string
          p_source_path?: string
        }
        Returns: string
      }
      record_deal_claim: { Args: { p_deal_id: string }; Returns: undefined }
      record_deal_click: { Args: { p_deal_id: string }; Returns: undefined }
      record_sponsored_click: {
        Args: {
          p_item_id: string
          p_item_type?: string
          p_scope?: string
          p_sponsor_priority?: number
          p_sponsor_tier?: number
        }
        Returns: undefined
      }
      record_sponsored_impressions: {
        Args: { p_deal_ids: string[] }
        Returns: undefined
      }
      refresh_ambassador_rewards: {
        Args: { p_ambassador_id: string }
        Returns: undefined
      }
      request_campus_verification: {
        Args: {
          p_domain_root: string
          p_proof_upload_urls?: string[]
          p_role: Database["public"]["Enums"]["campus_role"]
          p_user_message?: string
        }
        Returns: undefined
      }
      self_auto_verify_campus_role: {
        Args: {
          p_domain_root: string
          p_role: Database["public"]["Enums"]["campus_role"]
          p_score?: number
        }
        Returns: undefined
      }
      submit_merchant_deal: {
        Args: {
          p_business_name: string
          p_campus_target?: string
          p_category?: string
          p_city?: string
          p_contact_email: string
          p_contact_name?: string
          p_contact_phone?: string
          p_discount_value?: string
          p_expires_at?: string
          p_monthly_budget_cents?: number
          p_offer_description?: string
          p_offer_title: string
          p_proof_url?: string
          p_redemption_instructions?: string
          p_referral_code?: string
          p_sponsored_interest?: boolean
          p_state?: string
          p_website_url?: string
        }
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
      sponsor_source_type: "manual" | "partner_offer"
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
      sponsor_source_type: ["manual", "partner_offer"],
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
