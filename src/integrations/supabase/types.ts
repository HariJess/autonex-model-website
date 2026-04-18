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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      agencies: {
        Row: {
          address: string | null
          bio: string | null
          commercial_contact_name: string | null
          created_at: string | null
          email: string | null
          id: string
          logo_url: string | null
          name: string
          nif: string | null
          phone: string | null
          reg_commerce: string | null
          slug: string
          spotlight_until: string | null
          stat: string | null
          verified: boolean | null
        }
        Insert: {
          address?: string | null
          bio?: string | null
          commercial_contact_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          nif?: string | null
          phone?: string | null
          reg_commerce?: string | null
          slug: string
          spotlight_until?: string | null
          stat?: string | null
          verified?: boolean | null
        }
        Update: {
          address?: string | null
          bio?: string | null
          commercial_contact_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          nif?: string | null
          phone?: string | null
          reg_commerce?: string | null
          slug?: string
          spotlight_until?: string | null
          stat?: string | null
          verified?: boolean | null
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_id: string | null
          category: string | null
          content: string | null
          cover_url: string | null
          excerpt: string | null
          id: string
          published_at: string | null
          slug: string
          title: string
        }
        Insert: {
          author_id?: string | null
          category?: string | null
          content?: string | null
          cover_url?: string | null
          excerpt?: string | null
          id?: string
          published_at?: string | null
          slug: string
          title: string
        }
        Update: {
          author_id?: string | null
          category?: string | null
          content?: string | null
          cover_url?: string | null
          excerpt?: string | null
          id?: string
          published_at?: string | null
          slug?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      boosts: {
        Row: {
          ends_at: string | null
          id: string
          listing_id: string
          starts_at: string | null
          type: Database["public"]["Enums"]["boost_type"]
        }
        Insert: {
          ends_at?: string | null
          id?: string
          listing_id: string
          starts_at?: string | null
          type: Database["public"]["Enums"]["boost_type"]
        }
        Update: {
          ends_at?: string | null
          id?: string
          listing_id?: string
          starts_at?: string | null
          type?: Database["public"]["Enums"]["boost_type"]
        }
        Relationships: [
          {
            foreignKeyName: "boosts_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_packs: {
        Row: {
          credits_amount: number
          id: string
          name: string
          price_mga: number
          sort_order: number | null
        }
        Insert: {
          credits_amount: number
          id: string
          name: string
          price_mga: number
          sort_order?: number | null
        }
        Update: {
          credits_amount?: number
          id?: string
          name?: string
          price_mga?: number
          sort_order?: number | null
        }
        Relationships: []
      }
      credits_ledger: {
        Row: {
          created_at: string | null
          delta: number
          id: string
          meta: Json | null
          reason: string | null
          ref_id: string | null
          ref_type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          delta: number
          id?: string
          meta?: Json | null
          reason?: string | null
          ref_id?: string | null
          ref_type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          delta?: number
          id?: string
          meta?: Json | null
          reason?: string | null
          ref_id?: string | null
          ref_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credits_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string | null
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          created_at: string | null
          id: string
          listing_id: string
          message: string | null
          type: Database["public"]["Enums"]["lead_type"] | null
          visitor_email: string | null
          visitor_name: string | null
          visitor_phone: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          listing_id: string
          message?: string | null
          type?: Database["public"]["Enums"]["lead_type"] | null
          visitor_email?: string | null
          visitor_name?: string | null
          visitor_phone?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          listing_id?: string
          message?: string | null
          type?: Database["public"]["Enums"]["lead_type"] | null
          visitor_email?: string | null
          visitor_name?: string | null
          visitor_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_photos: {
        Row: {
          id: string
          listing_id: string
          position: number | null
          url: string
        }
        Insert: {
          id?: string
          listing_id: string
          position?: number | null
          url: string
        }
        Update: {
          id?: string
          listing_id?: string
          position?: number | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_photos_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_view_events: {
        Row: {
          listing_id: string
          session_id: string
          viewed_at: string
        }
        Insert: {
          listing_id: string
          session_id: string
          viewed_at?: string
        }
        Update: {
          listing_id?: string
          session_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_view_events_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          arrondissement: string | null
          availability_status: string | null
          bathrooms: number | null
          body_style: string | null
          created_at: string | null
          description: string | null
          doors: number | null
          draft_step: number
          drivetrain: string | null
          engine_displacement_l: number | null
          expires_at: string | null
          exterior_color: string | null
          features: Json | null
          fuel: string | null
          id: string
          interior_color: string | null
          internal_ref: string | null
          is_electric: boolean | null
          is_hybrid: boolean | null
          is_new_program: boolean | null
          lat: number | null
          lng: number | null
          make: string | null
          mileage_km: number | null
          model: string | null
          owner_id: string
          original_price_mga: number | null
          pending_boost_types: Json | null
          price_eur: number | null
          price_mga: number
          publication_credits_charged: number | null
          quartier: string | null
          quartier_libre: string | null
          region: string | null
          rejection_reason: string | null
          rental_mode: string | null
          rooms: number | null
          search_vector: unknown
          seats: number | null
          seller_type: string | null
          status: Database["public"]["Enums"]["listing_status"] | null
          surface: number | null
          title: string
          toilets: number | null
          transaction: Database["public"]["Enums"]["transaction_type"]
          transmission_gearbox: string | null
          type: Database["public"]["Enums"]["listing_type"]
          updated_at: string
          vehicle_condition: string | null
          video_url: string | null
          views_count: number | null
          ville: string | null
          virtual_tour_url: string | null
          whatsapp_phone: string | null
          year: number | null
        }
        Insert: {
          arrondissement?: string | null
          availability_status?: string | null
          bathrooms?: number | null
          body_style?: string | null
          created_at?: string | null
          description?: string | null
          doors?: number | null
          draft_step?: number
          drivetrain?: string | null
          engine_displacement_l?: number | null
          expires_at?: string | null
          exterior_color?: string | null
          features?: Json | null
          fuel?: string | null
          id?: string
          interior_color?: string | null
          internal_ref?: string | null
          is_electric?: boolean | null
          is_hybrid?: boolean | null
          is_new_program?: boolean | null
          lat?: number | null
          lng?: number | null
          make?: string | null
          mileage_km?: number | null
          model?: string | null
          owner_id: string
          original_price_mga?: number | null
          pending_boost_types?: Json | null
          price_eur?: number | null
          price_mga?: number
          publication_credits_charged?: number | null
          quartier?: string | null
          quartier_libre?: string | null
          region?: string | null
          rejection_reason?: string | null
          rental_mode?: string | null
          rooms?: number | null
          search_vector?: unknown
          seats?: number | null
          seller_type?: string | null
          status?: Database["public"]["Enums"]["listing_status"] | null
          surface?: number | null
          title: string
          toilets?: number | null
          transaction?: Database["public"]["Enums"]["transaction_type"]
          transmission_gearbox?: string | null
          type?: Database["public"]["Enums"]["listing_type"]
          updated_at?: string
          vehicle_condition?: string | null
          video_url?: string | null
          views_count?: number | null
          ville?: string | null
          virtual_tour_url?: string | null
          whatsapp_phone?: string | null
          year?: number | null
        }
        Update: {
          arrondissement?: string | null
          availability_status?: string | null
          bathrooms?: number | null
          body_style?: string | null
          created_at?: string | null
          description?: string | null
          doors?: number | null
          draft_step?: number
          drivetrain?: string | null
          engine_displacement_l?: number | null
          expires_at?: string | null
          exterior_color?: string | null
          features?: Json | null
          fuel?: string | null
          id?: string
          interior_color?: string | null
          internal_ref?: string | null
          is_electric?: boolean | null
          is_hybrid?: boolean | null
          is_new_program?: boolean | null
          lat?: number | null
          lng?: number | null
          make?: string | null
          mileage_km?: number | null
          model?: string | null
          owner_id?: string
          original_price_mga?: number | null
          pending_boost_types?: Json | null
          price_eur?: number | null
          price_mga?: number
          publication_credits_charged?: number | null
          quartier?: string | null
          quartier_libre?: string | null
          region?: string | null
          rejection_reason?: string | null
          rental_mode?: string | null
          rooms?: number | null
          search_vector?: unknown
          seats?: number | null
          seller_type?: string | null
          status?: Database["public"]["Enums"]["listing_status"] | null
          surface?: number | null
          title?: string
          toilets?: number | null
          transaction?: Database["public"]["Enums"]["transaction_type"]
          transmission_gearbox?: string | null
          type?: Database["public"]["Enums"]["listing_type"]
          updated_at?: string
          vehicle_condition?: string | null
          video_url?: string | null
          views_count?: number | null
          ville?: string | null
          virtual_tour_url?: string | null
          whatsapp_phone?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "listings_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      packs: {
        Row: {
          duration_days: number | null
          features: Json | null
          id: string
          listings_quota: number | null
          name: string
          price_mga: number | null
        }
        Insert: {
          duration_days?: number | null
          features?: Json | null
          id?: string
          listings_quota?: number | null
          name: string
          price_mga?: number | null
        }
        Update: {
          duration_days?: number | null
          features?: Json | null
          id?: string
          listings_quota?: number | null
          name?: string
          price_mga?: number | null
        }
        Relationships: []
      }
      partner_ad_campaigns: {
        Row: {
          advertiser_name: string
          created_at: string
          created_by: string | null
          cta_label: string | null
          destination_url: string | null
          ends_at: string | null
          id: string
          image_url: string
          internal_description: string | null
          internal_title: string
          is_active: boolean
          media_type: string
          placement_key: string
          priority: number
          starts_at: string
          updated_at: string
        }
        Insert: {
          advertiser_name: string
          created_at?: string
          created_by?: string | null
          cta_label?: string | null
          destination_url?: string | null
          ends_at?: string | null
          id?: string
          image_url: string
          internal_description?: string | null
          internal_title: string
          is_active?: boolean
          media_type?: string
          placement_key: string
          priority?: number
          starts_at?: string
          updated_at?: string
        }
        Update: {
          advertiser_name?: string
          created_at?: string
          created_by?: string | null
          cta_label?: string | null
          destination_url?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string
          internal_description?: string | null
          internal_title?: string
          is_active?: boolean
          media_type?: string
          placement_key?: string
          priority?: number
          starts_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_ad_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          agency_id: string | null
          created_at: string | null
          credits_balance: number | null
          full_name: string | null
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          seller_type: string | null
          whatsapp_phone: string | null
        }
        Insert: {
          agency_id?: string | null
          created_at?: string | null
          credits_balance?: number | null
          full_name?: string | null
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          seller_type?: string | null
          whatsapp_phone?: string | null
        }
        Update: {
          agency_id?: string | null
          created_at?: string | null
          credits_balance?: number | null
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          seller_type?: string | null
          whatsapp_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      search_analytics_events: {
        Row: {
          bathrooms: number[] | null
          created_at: string
          equipments: string[] | null
          exact_result_count: number
          had_zero_exact: boolean
          id: string
          path: string | null
          price_max: number | null
          price_min: number | null
          property_types: string[] | null
          quartier_libre: string | null
          quartiers: string[] | null
          rooms: number[] | null
          session_id: string | null
          showed_also_like: boolean
          showed_similar_fallback: boolean
          surface_max: number | null
          surface_min: number | null
          transaction_type: string | null
          ville: string | null
        }
        Insert: {
          bathrooms?: number[] | null
          created_at?: string
          equipments?: string[] | null
          exact_result_count?: number
          had_zero_exact?: boolean
          id?: string
          path?: string | null
          price_max?: number | null
          price_min?: number | null
          property_types?: string[] | null
          quartier_libre?: string | null
          quartiers?: string[] | null
          rooms?: number[] | null
          session_id?: string | null
          showed_also_like?: boolean
          showed_similar_fallback?: boolean
          surface_max?: number | null
          surface_min?: number | null
          transaction_type?: string | null
          ville?: string | null
        }
        Update: {
          bathrooms?: number[] | null
          created_at?: string
          equipments?: string[] | null
          exact_result_count?: number
          had_zero_exact?: boolean
          id?: string
          path?: string | null
          price_max?: number | null
          price_min?: number | null
          property_types?: string[] | null
          quartier_libre?: string | null
          quartiers?: string[] | null
          rooms?: number[] | null
          session_id?: string | null
          showed_also_like?: boolean
          showed_similar_fallback?: boolean
          surface_max?: number | null
          surface_min?: number | null
          transaction_type?: string | null
          ville?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          admin_note: string | null
          amount_mga: number
          created_at: string | null
          credit_pack_id: string | null
          credits_granted_at: string | null
          id: string
          listing_id: string | null
          method: Database["public"]["Enums"]["payment_method"] | null
          payment_proof_url: string | null
          reference: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["payment_status"] | null
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount_mga: number
          created_at?: string | null
          credit_pack_id?: string | null
          credits_granted_at?: string | null
          id?: string
          listing_id?: string | null
          method?: Database["public"]["Enums"]["payment_method"] | null
          payment_proof_url?: string | null
          reference?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount_mga?: number
          created_at?: string | null
          credit_pack_id?: string | null
          credits_granted_at?: string | null
          id?: string
          listing_id?: string | null
          method?: Database["public"]["Enums"]["payment_method"] | null
          payment_proof_url?: string | null
          reference?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_catalog_aliases: {
        Row: {
          alias: string
          alias_normalized: string
          canonical_id: string
          created_at: string
          entity_type: string
          id: string
          source: string
        }
        Insert: {
          alias: string
          alias_normalized: string
          canonical_id: string
          created_at?: string
          entity_type: string
          id?: string
          source?: string
        }
        Update: {
          alias?: string
          alias_normalized?: string
          canonical_id?: string
          created_at?: string
          entity_type?: string
          id?: string
          source?: string
        }
        Relationships: []
      }
      vehicle_catalog_makes: {
        Row: {
          created_at: string
          external_make_id: string | null
          external_source: string
          id: string
          is_active: boolean
          name: string
          normalized_name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          external_make_id?: string | null
          external_source?: string
          id?: string
          is_active?: boolean
          name: string
          normalized_name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          external_make_id?: string | null
          external_source?: string
          id?: string
          is_active?: boolean
          name?: string
          normalized_name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      vehicle_catalog_models: {
        Row: {
          body_type_hint: string | null
          created_at: string
          external_model_id: string | null
          external_source: string
          id: string
          is_active: boolean
          make_id: string
          name: string
          normalized_name: string
          slug: string
          sort_order: number
          updated_at: string
          year_end: number | null
          year_start: number | null
        }
        Insert: {
          body_type_hint?: string | null
          created_at?: string
          external_model_id?: string | null
          external_source?: string
          id?: string
          is_active?: boolean
          make_id: string
          name: string
          normalized_name: string
          slug: string
          sort_order?: number
          updated_at?: string
          year_end?: number | null
          year_start?: number | null
        }
        Update: {
          body_type_hint?: string | null
          created_at?: string
          external_model_id?: string | null
          external_source?: string
          id?: string
          is_active?: boolean
          make_id?: string
          name?: string
          normalized_name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
          year_end?: number | null
          year_start?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_catalog_models_make_id_fkey"
            columns: ["make_id"]
            isOneToOne: false
            referencedRelation: "vehicle_catalog_makes"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_estimation_events: {
        Row: {
          created_at: string
          estimation_request_id: string
          event_type: string
          id: string
          metadata: Json
        }
        Insert: {
          created_at?: string
          estimation_request_id: string
          event_type: string
          id?: string
          metadata?: Json
        }
        Update: {
          created_at?: string
          estimation_request_id?: string
          event_type?: string
          id?: string
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_estimation_events_estimation_request_id_fkey"
            columns: ["estimation_request_id"]
            isOneToOne: false
            referencedRelation: "vehicle_estimation_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_estimation_requests: {
        Row: {
          accident_declared: boolean
          body_type: string
          city: string
          condition_label: string
          created_at: string
          fuel_type: string
          id: string
          maintenance_level: string
          make_id: string | null
          make_name_snapshot: string
          mileage: number
          model_id: string | null
          model_name_snapshot: string
          owner_count_label: string
          raw_payload: Json
          submission_secret: string
          transmission_type: string
          usage_type: string
          user_id: string | null
          year: number
        }
        Insert: {
          accident_declared?: boolean
          body_type: string
          city: string
          condition_label: string
          created_at?: string
          fuel_type: string
          id?: string
          maintenance_level: string
          make_id?: string | null
          make_name_snapshot: string
          mileage: number
          model_id?: string | null
          model_name_snapshot: string
          owner_count_label: string
          raw_payload?: Json
          submission_secret?: string
          transmission_type: string
          usage_type: string
          user_id?: string | null
          year: number
        }
        Update: {
          accident_declared?: boolean
          body_type?: string
          city?: string
          condition_label?: string
          created_at?: string
          fuel_type?: string
          id?: string
          maintenance_level?: string
          make_id?: string | null
          make_name_snapshot?: string
          mileage?: number
          model_id?: string | null
          model_name_snapshot?: string
          owner_count_label?: string
          raw_payload?: Json
          submission_secret?: string
          transmission_type?: string
          usage_type?: string
          user_id?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_estimation_requests_make_id_fkey"
            columns: ["make_id"]
            isOneToOne: false
            referencedRelation: "vehicle_makes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_estimation_requests_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "vehicle_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_estimation_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_estimation_results: {
        Row: {
          adjusted_price: number
          calculation_payload: Json
          comparables_used_count: number
          confidence_label: string
          confidence_score: number
          created_at: string
          estimation_request_id: string
          high_range_price: number
          id: string
          low_range_price: number
          market_base_price: number
          negative_factors: Json
          positive_factors: Json
          quick_sale_price: number
          recommended_listing_price: number
        }
        Insert: {
          adjusted_price: number
          calculation_payload?: Json
          comparables_used_count?: number
          confidence_label: string
          confidence_score: number
          created_at?: string
          estimation_request_id: string
          high_range_price: number
          id?: string
          low_range_price: number
          market_base_price: number
          negative_factors?: Json
          positive_factors?: Json
          quick_sale_price: number
          recommended_listing_price: number
        }
        Update: {
          adjusted_price?: number
          calculation_payload?: Json
          comparables_used_count?: number
          confidence_label?: string
          confidence_score?: number
          created_at?: string
          estimation_request_id?: string
          high_range_price?: number
          id?: string
          low_range_price?: number
          market_base_price?: number
          negative_factors?: Json
          positive_factors?: Json
          quick_sale_price?: number
          recommended_listing_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_estimation_results_estimation_request_id_fkey"
            columns: ["estimation_request_id"]
            isOneToOne: false
            referencedRelation: "vehicle_estimation_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_price_reference_profiles: {
        Row: {
          annual_depreciation_rate: number
          baseline_price_mga: number
          baseline_year: number
          body_type: string
          created_at: string
          expected_km_per_year: number
          fuel_type: string | null
          id: string
          is_active: boolean
          make_name: string
          model_name: string
          popularity_score: number | null
          transmission_type: string | null
        }
        Insert: {
          annual_depreciation_rate?: number
          baseline_price_mga: number
          baseline_year: number
          body_type: string
          created_at?: string
          expected_km_per_year?: number
          fuel_type?: string | null
          id?: string
          is_active?: boolean
          make_name: string
          model_name: string
          popularity_score?: number | null
          transmission_type?: string | null
        }
        Update: {
          annual_depreciation_rate?: number
          baseline_price_mga?: number
          baseline_year?: number
          body_type?: string
          created_at?: string
          expected_km_per_year?: number
          fuel_type?: string | null
          id?: string
          is_active?: boolean
          make_name?: string
          model_name?: string
          popularity_score?: number | null
          transmission_type?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_credits: {
        Args: {
          p_amount: number
          p_reason: string
          p_ref_id?: string
          p_ref_type?: string
          p_user_id: string
        }
        Returns: undefined
      }
      admin_approve_credit_transaction: {
        Args: { p_transaction_id: string }
        Returns: Json
      }
      admin_approve_listing_moderation: {
        Args: { p_listing_id: string }
        Returns: Json
      }
      admin_reject_credit_transaction: {
        Args: { p_reason: string; p_transaction_id: string }
        Returns: Json
      }
      admin_reject_listing_moderation: {
        Args: { p_listing_id: string; p_reason: string }
        Returns: Json
      }
      consume_credits: {
        Args: {
          p_amount: number
          p_reason: string
          p_ref_id?: string
          p_ref_type?: string
          p_user_id: string
        }
        Returns: boolean
      }
      get_active_partner_campaign: {
        Args: { p_placement_key: string }
        Returns: {
          advertiser_name: string
          cta_label: string
          destination_url: string
          id: string
          image_url: string
          media_type: string
          placement_key: string
        }[]
      }
      get_listing_owner_phone: {
        Args: { p_listing_id: string }
        Returns: string
      }
      get_listing_whatsapp_phone: {
        Args: { p_listing_id: string }
        Returns: string
      }
      get_profile_for_listing_display: {
        Args: { p_owner_id: string }
        Returns: {
          agency_id: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
        }[]
      }
      immonex_is_admin: { Args: never; Returns: boolean }
      increment_views: { Args: { listing_uuid: string }; Returns: undefined }
      increment_views_public: {
        Args: { p_listing_id: string; p_session_id?: string }
        Returns: undefined
      }
      list_agency_agent_ids: {
        Args: { p_agency_id: string }
        Returns: string[]
      }
      listing_has_whatsapp_contact: {
        Args: { p_listing_id: string }
        Returns: boolean
      }
      listing_search_vector: {
        Args: {
          p_body_style: string
          p_city: string
          p_description: string
          p_fuel: string
          p_make: string
          p_model: string
          p_title: string
        }
        Returns: unknown
      }
      record_vehicle_estimation_event: {
        Args: {
          p_estimation_request_id: string
          p_event_type: string
          p_metadata?: Json
          p_submission_secret: string
        }
        Returns: undefined
      }
      record_vehicle_estimation_result: {
        Args: {
          p_adjusted_price: number
          p_calculation_payload: Json
          p_comparables_used_count: number
          p_confidence_label: string
          p_confidence_score: number
          p_estimation_request_id: string
          p_high_range_price: number
          p_low_range_price: number
          p_market_base_price: number
          p_negative_factors: Json
          p_positive_factors: Json
          p_quick_sale_price: number
          p_recommended_listing_price: number
          p_submission_secret: string
        }
        Returns: string
      }
      purchase_listing_boosts: {
        Args: { p_boost_types: string[]; p_listing_id: string }
        Returns: Json
      }
      publish_listing_with_credits: {
        Args: { p_listing_id: string }
        Returns: Json
      }
    }
    Enums: {
      boost_type:
        | "top"
        | "featured"
        | "newsletter"
        | "urgent"
        | "daily_bump"
        | "agency_spotlight"
      lead_type: "contact_form" | "phone_reveal" | "whatsapp"
      listing_status:
        | "draft"
        | "active"
        | "paused"
        | "expired"
        | "pending_payment"
        | "pending_review"
        | "rejected"
        | "pending_payment_verification"
        | "archived"
      listing_type:
        | "appartement"
        | "villa"
        | "maison"
        | "terrain"
        | "local_commercial"
        | "bureau"
      payment_method:
        | "mvola"
        | "orange_money"
        | "airtel_money"
        | "stripe"
        | "bank_transfer"
      payment_status:
        | "pending"
        | "success"
        | "failed"
        | "under_review"
        | "approved"
        | "rejected"
        | "cancelled"
      transaction_type: "vente" | "location" | "location_vacances"
      user_role: "particulier" | "agence" | "promoteur" | "admin"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      boost_type: [
        "top",
        "featured",
        "newsletter",
        "urgent",
        "daily_bump",
        "agency_spotlight",
      ],
      lead_type: ["contact_form", "phone_reveal", "whatsapp"],
      listing_status: [
        "draft",
        "active",
        "paused",
        "expired",
        "pending_payment",
        "pending_review",
        "rejected",
        "pending_payment_verification",
        "archived",
      ],
      listing_type: [
        "appartement",
        "villa",
        "maison",
        "terrain",
        "local_commercial",
        "bureau",
      ],
      payment_method: [
        "mvola",
        "orange_money",
        "airtel_money",
        "stripe",
        "bank_transfer",
      ],
      payment_status: [
        "pending",
        "success",
        "failed",
        "under_review",
        "approved",
        "rejected",
        "cancelled",
      ],
      transaction_type: ["vente", "location", "location_vacances"],
      user_role: ["particulier", "agence", "promoteur", "admin"],
    },
  },
} as const
