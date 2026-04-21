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
      admin_audit_log: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          id: string
          metadata: Json
          target_entity_id: string | null
          target_entity_type: string | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          target_entity_id?: string | null
          target_entity_type?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          target_entity_id?: string | null
          target_entity_type?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      agencies: {
        Row: {
          address: string | null
          bio: string | null
          city: string | null
          commercial_contact_name: string | null
          cover_image_url: string | null
          created_at: string | null
          description_long: string | null
          email: string | null
          id: string
          logo_url: string | null
          name: string
          nif: string | null
          opening_hours: Json
          phone: string | null
          reg_commerce: string | null
          region: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          slug: string
          social_links: Json
          spotlight_until: string | null
          stat: string | null
          status: Database["public"]["Enums"]["agency_status"]
          submitted_at: string | null
          updated_at: string
          verified: boolean | null
          website_url: string | null
          whatsapp_phone: string | null
        }
        Insert: {
          address?: string | null
          bio?: string | null
          city?: string | null
          commercial_contact_name?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description_long?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          nif?: string | null
          opening_hours?: Json
          phone?: string | null
          reg_commerce?: string | null
          region?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          slug: string
          social_links?: Json
          spotlight_until?: string | null
          stat?: string | null
          status?: Database["public"]["Enums"]["agency_status"]
          submitted_at?: string | null
          updated_at?: string
          verified?: boolean | null
          website_url?: string | null
          whatsapp_phone?: string | null
        }
        Update: {
          address?: string | null
          bio?: string | null
          city?: string | null
          commercial_contact_name?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description_long?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          nif?: string | null
          opening_hours?: Json
          phone?: string | null
          reg_commerce?: string | null
          region?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          slug?: string
          social_links?: Json
          spotlight_until?: string | null
          stat?: string | null
          status?: Database["public"]["Enums"]["agency_status"]
          submitted_at?: string | null
          updated_at?: string
          verified?: boolean | null
          website_url?: string | null
          whatsapp_phone?: string | null
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
          {
            foreignKeyName: "boosts_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings_vehicle_semantics"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          consent_given: boolean
          created_at: string
          email: string
          email_error: string | null
          email_sent_at: string | null
          full_name: string
          id: string
          message: string
          notes: string | null
          read_at: string | null
          replied_at: string | null
          status: string
          subject: string
          whatsapp_phone: string | null
        }
        Insert: {
          consent_given?: boolean
          created_at?: string
          email: string
          email_error?: string | null
          email_sent_at?: string | null
          full_name: string
          id?: string
          message: string
          notes?: string | null
          read_at?: string | null
          replied_at?: string | null
          status?: string
          subject: string
          whatsapp_phone?: string | null
        }
        Update: {
          consent_given?: boolean
          created_at?: string
          email?: string
          email_error?: string | null
          email_sent_at?: string | null
          full_name?: string
          id?: string
          message?: string
          notes?: string | null
          read_at?: string | null
          replied_at?: string | null
          status?: string
          subject?: string
          whatsapp_phone?: string | null
        }
        Relationships: []
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
      credit_pricing: {
        Row: {
          amount: number
          description: string | null
          key: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount: number
          description?: string | null
          key: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount?: number
          description?: string | null
          key?: string
          updated_at?: string
          updated_by?: string | null
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
            foreignKeyName: "favorites_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings_vehicle_semantics"
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
          {
            foreignKeyName: "leads_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings_vehicle_semantics"
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
          {
            foreignKeyName: "listing_photos_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings_vehicle_semantics"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          listing_id: string
          reason: string
          reporter_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          listing_id: string
          reason: string
          reporter_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          listing_id?: string
          reason?: string
          reporter_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_reports_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_reports_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings_vehicle_semantics"
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
          {
            foreignKeyName: "listing_view_events_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings_vehicle_semantics"
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
          negotiable: boolean
          original_price_mga: number | null
          owner_id: string | null
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
          negotiable?: boolean
          original_price_mga?: number | null
          owner_id?: string | null
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
          negotiable?: boolean
          original_price_mga?: number | null
          owner_id?: string | null
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
      market_listings_clean: {
        Row: {
          body_style: string | null
          city: string | null
          comparable_cluster_key: string | null
          confidence_score: number | null
          created_at: string
          duplicate_of: string | null
          fingerprint: string | null
          fuel_type: string | null
          id: string
          listing_status: string
          mileage_km: number | null
          normalized_generation: string | null
          normalized_make: string | null
          normalized_model: string | null
          normalized_trim: string | null
          outlier_flag: boolean
          parsing_notes: Json
          posted_at: string | null
          price_mga: number | null
          raw_listing_id: string
          seller_type: string | null
          source: string
          source_listing_id: string | null
          source_url: string
          transmission: string | null
          updated_at: string
          year: number | null
        }
        Insert: {
          body_style?: string | null
          city?: string | null
          comparable_cluster_key?: string | null
          confidence_score?: number | null
          created_at?: string
          duplicate_of?: string | null
          fingerprint?: string | null
          fuel_type?: string | null
          id?: string
          listing_status?: string
          mileage_km?: number | null
          normalized_generation?: string | null
          normalized_make?: string | null
          normalized_model?: string | null
          normalized_trim?: string | null
          outlier_flag?: boolean
          parsing_notes?: Json
          posted_at?: string | null
          price_mga?: number | null
          raw_listing_id: string
          seller_type?: string | null
          source: string
          source_listing_id?: string | null
          source_url: string
          transmission?: string | null
          updated_at?: string
          year?: number | null
        }
        Update: {
          body_style?: string | null
          city?: string | null
          comparable_cluster_key?: string | null
          confidence_score?: number | null
          created_at?: string
          duplicate_of?: string | null
          fingerprint?: string | null
          fuel_type?: string | null
          id?: string
          listing_status?: string
          mileage_km?: number | null
          normalized_generation?: string | null
          normalized_make?: string | null
          normalized_model?: string | null
          normalized_trim?: string | null
          outlier_flag?: boolean
          parsing_notes?: Json
          posted_at?: string | null
          price_mga?: number | null
          raw_listing_id?: string
          seller_type?: string | null
          source?: string
          source_listing_id?: string | null
          source_url?: string
          transmission?: string | null
          updated_at?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "market_listings_clean_duplicate_of_fkey"
            columns: ["duplicate_of"]
            isOneToOne: false
            referencedRelation: "market_listings_clean"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_listings_clean_raw_listing_id_fkey"
            columns: ["raw_listing_id"]
            isOneToOne: true
            referencedRelation: "market_listings_raw"
            referencedColumns: ["id"]
          },
        ]
      }
      market_listings_raw: {
        Row: {
          body_style_raw: string | null
          city_raw: string | null
          created_at: string
          currency_raw: string | null
          description_raw: string | null
          fuel_type_raw: string | null
          html_snapshot: string | null
          id: string
          last_seen_at: string
          mileage_raw: string | null
          payload: Json
          phone_raw: string | null
          posted_at_raw: string | null
          price_raw: string | null
          scraped_at: string
          seller_name_raw: string | null
          seller_type_raw: string | null
          source: string
          source_listing_id: string | null
          source_url: string
          title: string | null
          transmission_raw: string | null
          updated_at: string
          year_raw: string | null
        }
        Insert: {
          body_style_raw?: string | null
          city_raw?: string | null
          created_at?: string
          currency_raw?: string | null
          description_raw?: string | null
          fuel_type_raw?: string | null
          html_snapshot?: string | null
          id?: string
          last_seen_at?: string
          mileage_raw?: string | null
          payload?: Json
          phone_raw?: string | null
          posted_at_raw?: string | null
          price_raw?: string | null
          scraped_at?: string
          seller_name_raw?: string | null
          seller_type_raw?: string | null
          source: string
          source_listing_id?: string | null
          source_url: string
          title?: string | null
          transmission_raw?: string | null
          updated_at?: string
          year_raw?: string | null
        }
        Update: {
          body_style_raw?: string | null
          city_raw?: string | null
          created_at?: string
          currency_raw?: string | null
          description_raw?: string | null
          fuel_type_raw?: string | null
          html_snapshot?: string | null
          id?: string
          last_seen_at?: string
          mileage_raw?: string | null
          payload?: Json
          phone_raw?: string | null
          posted_at_raw?: string | null
          price_raw?: string | null
          scraped_at?: string
          seller_name_raw?: string | null
          seller_type_raw?: string | null
          source?: string
          source_listing_id?: string | null
          source_url?: string
          title?: string | null
          transmission_raw?: string | null
          updated_at?: string
          year_raw?: string | null
        }
        Relationships: []
      }
      market_price_stats: {
        Row: {
          avg_mileage_km: number | null
          avg_price_mga: number | null
          avg_year: number | null
          body_style: string | null
          city: string | null
          comparable_cluster_key: string
          confidence_score: number | null
          created_at: string
          fuel_type: string | null
          id: string
          last_calculated_at: string
          make: string
          max_price_mga: number | null
          median_price_mga: number | null
          min_price_mga: number | null
          model: string
          p25_price_mga: number | null
          p75_price_mga: number | null
          price_stddev: number | null
          sample_size: number
          transmission: string | null
          updated_at: string
          year_max: number | null
          year_min: number | null
        }
        Insert: {
          avg_mileage_km?: number | null
          avg_price_mga?: number | null
          avg_year?: number | null
          body_style?: string | null
          city?: string | null
          comparable_cluster_key: string
          confidence_score?: number | null
          created_at?: string
          fuel_type?: string | null
          id?: string
          last_calculated_at?: string
          make: string
          max_price_mga?: number | null
          median_price_mga?: number | null
          min_price_mga?: number | null
          model: string
          p25_price_mga?: number | null
          p75_price_mga?: number | null
          price_stddev?: number | null
          sample_size?: number
          transmission?: string | null
          updated_at?: string
          year_max?: number | null
          year_min?: number | null
        }
        Update: {
          avg_mileage_km?: number | null
          avg_price_mga?: number | null
          avg_year?: number | null
          body_style?: string | null
          city?: string | null
          comparable_cluster_key?: string
          confidence_score?: number | null
          created_at?: string
          fuel_type?: string | null
          id?: string
          last_calculated_at?: string
          make?: string
          max_price_mga?: number | null
          median_price_mga?: number | null
          min_price_mga?: number | null
          model?: string
          p25_price_mga?: number | null
          p75_price_mga?: number | null
          price_stddev?: number | null
          sample_size?: number
          transmission?: string | null
          updated_at?: string
          year_max?: number | null
          year_min?: number | null
        }
        Relationships: []
      }
      moderation_blacklist_terms: {
        Row: {
          created_at: string
          created_by: string | null
          term: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          term: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          term?: string
        }
        Relationships: []
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
      phone_reveal_events: {
        Row: {
          created_at: string
          id: string
          kind: string
          listing_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          listing_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          listing_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "phone_reveal_events_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phone_reveal_events_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings_vehicle_semantics"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          agency_id: string | null
          anonymized_at: string | null
          created_at: string | null
          credits_balance: number | null
          deletion_email_error: string | null
          deletion_email_sent_at: string | null
          deletion_requested_at: string | null
          deletion_scheduled_for: string | null
          full_name: string | null
          id: string
          is_anonymized: boolean
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          seller_type: string | null
          suspended: boolean
          suspended_at: string | null
          suspended_by: string | null
          suspended_reason: string | null
          whatsapp_phone: string | null
        }
        Insert: {
          agency_id?: string | null
          anonymized_at?: string | null
          created_at?: string | null
          credits_balance?: number | null
          deletion_email_error?: string | null
          deletion_email_sent_at?: string | null
          deletion_requested_at?: string | null
          deletion_scheduled_for?: string | null
          full_name?: string | null
          id: string
          is_anonymized?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          seller_type?: string | null
          suspended?: boolean
          suspended_at?: string | null
          suspended_by?: string | null
          suspended_reason?: string | null
          whatsapp_phone?: string | null
        }
        Update: {
          agency_id?: string | null
          anonymized_at?: string | null
          created_at?: string | null
          credits_balance?: number | null
          deletion_email_error?: string | null
          deletion_email_sent_at?: string | null
          deletion_requested_at?: string | null
          deletion_scheduled_for?: string | null
          full_name?: string | null
          id?: string
          is_anonymized?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          seller_type?: string | null
          suspended?: boolean
          suspended_at?: string | null
          suspended_by?: string | null
          suspended_reason?: string | null
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
      promo_code_redemptions: {
        Row: {
          id: string
          promo_code_id: string
          redeemed_at: string
          transaction_id: string
          user_id: string | null
        }
        Insert: {
          id?: string
          promo_code_id: string
          redeemed_at?: string
          transaction_id: string
          user_id?: string | null
        }
        Update: {
          id?: string
          promo_code_id?: string
          redeemed_at?: string
          transaction_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promo_code_redemptions_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_code_redemptions_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          active: boolean
          applicable_pack_ids: string[] | null
          bonus_credits: number | null
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          expires_at: string | null
          id: string
          max_redemptions: number | null
          one_per_user: boolean
          percentage_off: number | null
          times_redeemed: number
          type: Database["public"]["Enums"]["promo_code_type"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active?: boolean
          applicable_pack_ids?: string[] | null
          bonus_credits?: number | null
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          max_redemptions?: number | null
          one_per_user?: boolean
          percentage_off?: number | null
          times_redeemed?: number
          type: Database["public"]["Enums"]["promo_code_type"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active?: boolean
          applicable_pack_ids?: string[] | null
          bonus_credits?: number | null
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          max_redemptions?: number | null
          one_per_user?: boolean
          percentage_off?: number | null
          times_redeemed?: number
          type?: Database["public"]["Enums"]["promo_code_type"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
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
          promo_bonus_credits: number
          promo_code_id: string | null
          promo_discount_mga: number
          provider: string | null
          provider_checkout_url: string | null
          provider_expires_at: string | null
          provider_initiated_at: string | null
          provider_payment_id: string | null
          provider_response: Json | null
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
          promo_bonus_credits?: number
          promo_code_id?: string | null
          promo_discount_mga?: number
          provider?: string | null
          provider_checkout_url?: string | null
          provider_expires_at?: string | null
          provider_initiated_at?: string | null
          provider_payment_id?: string | null
          provider_response?: Json | null
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
          promo_bonus_credits?: number
          promo_code_id?: string | null
          promo_discount_mga?: number
          provider?: string | null
          provider_checkout_url?: string | null
          provider_expires_at?: string | null
          provider_initiated_at?: string | null
          provider_payment_id?: string | null
          provider_response?: Json | null
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
            foreignKeyName: "transactions_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings_vehicle_semantics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
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
      vehicle_generations: {
        Row: {
          created_at: string
          end_year: number | null
          id: string
          model_id: string
          name: string
          start_year: number | null
        }
        Insert: {
          created_at?: string
          end_year?: number | null
          id?: string
          model_id: string
          name: string
          start_year?: number | null
        }
        Update: {
          created_at?: string
          end_year?: number | null
          id?: string
          model_id?: string
          name?: string
          start_year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_generations_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "vehicle_models"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_listing_price_history: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          price: number
          source: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          price: number
          source?: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          price?: number
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_listing_price_history_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_listing_price_history_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings_vehicle_semantics"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_makes: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
        }
        Relationships: []
      }
      vehicle_models: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          make_id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          make_id: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          make_id?: string
          name?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_models_make_id_fkey"
            columns: ["make_id"]
            isOneToOne: false
            referencedRelation: "vehicle_makes"
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
      vehicle_trims: {
        Row: {
          body_type: string | null
          created_at: string
          drivetrain: string | null
          engine_label: string | null
          fuel_type: string | null
          generation_id: string
          id: string
          name: string
          transmission_type: string | null
        }
        Insert: {
          body_type?: string | null
          created_at?: string
          drivetrain?: string | null
          engine_label?: string | null
          fuel_type?: string | null
          generation_id: string
          id?: string
          name: string
          transmission_type?: string | null
        }
        Update: {
          body_type?: string | null
          created_at?: string
          drivetrain?: string | null
          engine_label?: string | null
          fuel_type?: string | null
          generation_id?: string
          id?: string
          name?: string
          transmission_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_trims_generation_id_fkey"
            columns: ["generation_id"]
            isOneToOne: false
            referencedRelation: "vehicle_generations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      listings_vehicle_semantics: {
        Row: {
          doors_effective: number | null
          doors_native: number | null
          id: string | null
          legacy_bathrooms_doors: number | null
          legacy_surface_km: number | null
          legacy_toilets_seats: number | null
          mileage_km_effective: number | null
          mileage_km_native: number | null
          seats_effective: number | null
          seats_native: number | null
          trim_version_index: number | null
        }
        Insert: {
          doors_effective?: never
          doors_native?: number | null
          id?: string | null
          legacy_bathrooms_doors?: number | null
          legacy_surface_km?: number | null
          legacy_toilets_seats?: number | null
          mileage_km_effective?: never
          mileage_km_native?: number | null
          seats_effective?: never
          seats_native?: number | null
          trim_version_index?: number | null
        }
        Update: {
          doors_effective?: never
          doors_native?: number | null
          id?: string | null
          legacy_bathrooms_doors?: number | null
          legacy_surface_km?: number | null
          legacy_toilets_seats?: number | null
          mileage_km_effective?: never
          mileage_km_native?: number | null
          seats_effective?: never
          seats_native?: number | null
          trim_version_index?: number | null
        }
        Relationships: []
      }
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
      admin_agency_detail: { Args: { p_id: string }; Returns: Json }
      admin_approve_agency: {
        Args: { p_id: string; p_verified: boolean }
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
      admin_change_user_role: {
        Args: {
          p_new_role: Database["public"]["Enums"]["user_role"]
          p_user_id: string
        }
        Returns: undefined
      }
      admin_create_agency: {
        Args: {
          p_address: string
          p_bio: string
          p_city: string
          p_commercial_contact_name: string
          p_email: string
          p_logo_url: string
          p_name: string
          p_nif: string
          p_phone: string
          p_reg_commerce: string
          p_region: string
          p_stat: string
          p_website_url: string
          p_whatsapp_phone: string
        }
        Returns: string
      }
      admin_create_promo_code: {
        Args: {
          p_applicable_pack_ids: string[]
          p_bonus_credits: number
          p_code: string
          p_description: string
          p_expires_at: string
          p_max_redemptions: number
          p_one_per_user: boolean
          p_percentage_off: number
          p_type: Database["public"]["Enums"]["promo_code_type"]
        }
        Returns: string
      }
      admin_delete_promo_code: { Args: { p_id: string }; Returns: undefined }
      admin_delete_user: {
        Args: { p_confirmation_email: string; p_user_id: string }
        Returns: undefined
      }
      admin_dismiss_listing_reports: {
        Args: { p_listing_id: string }
        Returns: Json
      }
      admin_grant_credits: {
        Args: { p_amount: number; p_reason: string; p_user_id: string }
        Returns: string
      }
      admin_link_user_to_agency: {
        Args: { p_agency_id: string; p_user_id: string }
        Returns: undefined
      }
      admin_list_agencies_with_stats: {
        Args: never
        Returns: {
          active_listings_count: number
          city: string
          created_at: string
          id: string
          listings_count: number
          logo_url: string
          members_count: number
          name: string
          rejection_reason: string
          slug: string
          status: Database["public"]["Enums"]["agency_status"]
          verified: boolean
        }[]
      }
      admin_list_promo_redemptions: {
        Args: { p_promo_code_id: string }
        Returns: {
          amount_mga: number
          redeemed_at: string
          redemption_id: string
          transaction_id: string
          user_email: string
          user_full_name: string
          user_id: string
        }[]
      }
      admin_moderation_queue: {
        Args: { p_filter?: string }
        Returns: {
          created_at: string
          last_report_at: string
          listing_id: string
          owner_email: string
          owner_id: string
          price_mga: number
          reports_count: number
          reports_reasons: string[]
          status: Database["public"]["Enums"]["listing_status"]
          title: string
          updated_at: string
          ville: string
        }[]
      }
      admin_reject_agency: {
        Args: { p_id: string; p_reason: string }
        Returns: undefined
      }
      admin_reject_credit_transaction: {
        Args: { p_reason: string; p_transaction_id: string }
        Returns: Json
      }
      admin_reject_listing_moderation: {
        Args: { p_listing_id: string; p_reason: string }
        Returns: Json
      }
      admin_suspend_agency: {
        Args: { p_id: string; p_reason: string }
        Returns: undefined
      }
      admin_suspend_user: {
        Args: { p_reason: string; p_user_id: string }
        Returns: undefined
      }
      admin_unlink_user_from_agency: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      admin_unsuspend_agency: { Args: { p_id: string }; Returns: undefined }
      admin_unsuspend_user: { Args: { p_user_id: string }; Returns: undefined }
      admin_update_agency: {
        Args: {
          p_address: string
          p_bio: string
          p_city: string
          p_commercial_contact_name: string
          p_cover_image_url: string
          p_description_long: string
          p_email: string
          p_id: string
          p_logo_url: string
          p_name: string
          p_nif: string
          p_opening_hours: Json
          p_phone: string
          p_reg_commerce: string
          p_region: string
          p_slug: string
          p_social_links: Json
          p_stat: string
          p_verified: boolean
          p_website_url: string
          p_whatsapp_phone: string
        }
        Returns: undefined
      }
      admin_update_credit_pack: {
        Args: {
          p_credits_amount: number
          p_id: string
          p_name: string
          p_price_mga: number
          p_sort_order: number
        }
        Returns: undefined
      }
      admin_update_credit_pricing: {
        Args: { p_amount: number; p_description: string; p_key: string }
        Returns: undefined
      }
      admin_update_promo_code: {
        Args: {
          p_active: boolean
          p_applicable_pack_ids: string[]
          p_description: string
          p_expires_at: string
          p_id: string
          p_max_redemptions: number
          p_one_per_user: boolean
        }
        Returns: undefined
      }
      admin_user_overview: {
        Args: { p_user_id: string }
        Returns: {
          agency_id: string
          created_at: string
          credits_balance: number
          email: string
          full_name: string
          last_sign_in_at: string
          phone: string
          role: Database["public"]["Enums"]["user_role"]
          seller_type: string
          suspended: boolean
          suspended_at: string
          suspended_by: string
          suspended_reason: string
          user_id: string
          whatsapp_phone: string
        }[]
      }
      admin_validate_listing_reports: {
        Args: { p_listing_id: string; p_rejection_reason: string }
        Returns: Json
      }
      anonymize_user_profile: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      can_publish_listing: {
        Args: { p_user_id: string }
        Returns: {
          allowed: boolean
          reason: string
          remaining: number
          reset_at: string
        }[]
      }
      cancel_account_deletion: {
        Args: never
        Returns: {
          success: boolean
          was_scheduled_for: string
        }[]
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
      create_listing_report: {
        Args: { p_details?: string; p_listing_id: string; p_reason: string }
        Returns: Json
      }
      create_transaction_with_promo: {
        Args: {
          p_amount_mga: number
          p_credit_pack_id: string
          p_method: string
          p_payment_proof_url: string
          p_promo_code: string
          p_reference: string
        }
        Returns: string
      }
      execute_scheduled_deletions: {
        Args: never
        Returns: {
          anonymized_count: number
          processed_user_ids: string[]
        }[]
      }
      export_user_data: { Args: never; Returns: Json }
      generate_agency_slug: { Args: { p_name: string }; Returns: string }
      get_active_listing_counts_by_ville: {
        Args: { p_villes: string[] }
        Returns: {
          count: number
          ville: string
        }[]
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
      get_pricing: {
        Args: never
        Returns: {
          amount: number
          description: string
          key: string
        }[]
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
      is_verified_dealer: { Args: { p_user_id: string }; Returns: boolean }
      list_agency_agent_ids: {
        Args: { p_agency_id: string }
        Returns: string[]
      }
      list_my_favorites: {
        Args: never
        Returns: {
          agency_logo_url: string
          agency_name: string
          agency_slug: string
          agency_verified: boolean
          fav_created_at: string
          fav_listing_id: string
          lst_active_boost_types: string[]
          lst_arrondissement: string
          lst_availability_status: string
          lst_bathrooms: number
          lst_body_style: string
          lst_created_at: string
          lst_description: string
          lst_doors: number
          lst_drivetrain: string
          lst_engine_displacement_l: number
          lst_exterior_color: string
          lst_features: Json
          lst_fuel: string
          lst_id: string
          lst_interior_color: string
          lst_internal_ref: string
          lst_is_electric: boolean
          lst_is_hybrid: boolean
          lst_is_new_program: boolean
          lst_lat: number
          lst_lng: number
          lst_make: string
          lst_mileage_km: number
          lst_model: string
          lst_negotiable: boolean
          lst_original_price_mga: number
          lst_owner_id: string
          lst_pending_boost_types: Json
          lst_photos_urls: string[]
          lst_price_eur: number
          lst_price_mga: number
          lst_quartier: string
          lst_quartier_libre: string
          lst_region: string
          lst_rejection_reason: string
          lst_rental_mode: string
          lst_rooms: number
          lst_seats: number
          lst_seller_type: string
          lst_status: Database["public"]["Enums"]["listing_status"]
          lst_surface: number
          lst_title: string
          lst_toilets: number
          lst_transaction: Database["public"]["Enums"]["transaction_type"]
          lst_transmission_gearbox: string
          lst_type: Database["public"]["Enums"]["listing_type"]
          lst_vehicle_condition: string
          lst_video_url: string
          lst_views_count: number
          lst_ville: string
          lst_virtual_tour_url: string
          lst_whatsapp_phone: string
          lst_year: number
          owner_full_name: string
        }[]
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
      log_admin_action: {
        Args: {
          p_action: string
          p_metadata?: Json
          p_target_entity_id?: string
          p_target_entity_type?: string
          p_target_user_id?: string
        }
        Returns: string
      }
      pricing_for: { Args: { p_key: string }; Returns: number }
      publish_listing_with_credits: {
        Args: { p_listing_id: string }
        Returns: Json
      }
      purchase_listing_boosts: {
        Args: { p_boost_types: string[]; p_listing_id: string }
        Returns: Json
      }
      raise_listing_validation_error: {
        Args: { p_errors: Json }
        Returns: undefined
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
      redeem_promo_code: {
        Args: {
          p_code: string
          p_credit_pack_id: string
          p_transaction_id: string
        }
        Returns: undefined
      }
      request_account_deletion: {
        Args: never
        Returns: {
          already_requested: boolean
          deletion_scheduled_for: string
          listings_unpublished_count: number
          success: boolean
        }[]
      }
      service_approve_provider_transaction: {
        Args: {
          p_provider_payment_id: string
          p_provider_response: Json
          p_transaction_id: string
        }
        Returns: Json
      }
      service_reject_provider_transaction: {
        Args: {
          p_provider_response?: Json
          p_reason: string
          p_transaction_id: string
        }
        Returns: Json
      }
      submit_contact_message: {
        Args: {
          p_consent_given: boolean
          p_email: string
          p_full_name: string
          p_message: string
          p_subject: string
          p_whatsapp_phone?: string
        }
        Returns: Json
      }
      toggle_favorite: {
        Args: { p_listing_id: string }
        Returns: {
          fav_created_at: string
          fav_is_favorite: boolean
          fav_listing_id: string
          fav_user_id: string
        }[]
      }
      update_my_agency: {
        Args: {
          p_bio: string
          p_cover_image_url: string
          p_description_long: string
          p_email: string
          p_logo_url: string
          p_opening_hours: Json
          p_phone: string
          p_social_links: Json
          p_website_url: string
          p_whatsapp_phone: string
        }
        Returns: undefined
      }
      validate_listing_content: {
        Args: {
          p_description: string
          p_price_mga: number
          p_title: string
          p_whatsapp_phone: string
        }
        Returns: {
          errors: Json
          valid: boolean
        }[]
      }
      validate_promo_code: {
        Args: { p_code: string; p_credit_pack_id: string }
        Returns: {
          bonus_credits: number
          discount_mga: number
          error_code: string
          final_credits: number
          final_price_mga: number
          promo_code_id: string
          type: Database["public"]["Enums"]["promo_code_type"]
          valid: boolean
        }[]
      }
    }
    Enums: {
      agency_status: "pending_review" | "approved" | "rejected" | "suspended"
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
        | "hidden_pending_review"
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
        | "vanilla_pay"
      payment_status:
        | "pending"
        | "success"
        | "failed"
        | "under_review"
        | "approved"
        | "rejected"
        | "cancelled"
      promo_code_type: "percentage" | "bonus_credits"
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
  public: {
    Enums: {
      agency_status: ["pending_review", "approved", "rejected", "suspended"],
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
        "hidden_pending_review",
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
        "vanilla_pay",
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
      promo_code_type: ["percentage", "bonus_credits"],
      transaction_type: ["vente", "location", "location_vacances"],
      user_role: ["particulier", "agence", "promoteur", "admin"],
    },
  },
} as const
