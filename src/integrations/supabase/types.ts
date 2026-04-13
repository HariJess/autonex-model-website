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
      search_analytics_events: {
        Row: {
          id: string
          created_at: string
          session_id: string | null
          ville: string | null
          quartiers: string[] | null
          quartier_libre: string | null
          transaction_type: string | null
          property_types: string[] | null
          price_min: number | null
          price_max: number | null
          surface_min: number | null
          surface_max: number | null
          rooms: number[] | null
          bathrooms: number[] | null
          equipments: string[] | null
          exact_result_count: number
          had_zero_exact: boolean
          showed_similar_fallback: boolean
          showed_also_like: boolean
          path: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          session_id?: string | null
          ville?: string | null
          quartiers?: string[] | null
          quartier_libre?: string | null
          transaction_type?: string | null
          property_types?: string[] | null
          price_min?: number | null
          price_max?: number | null
          surface_min?: number | null
          surface_max?: number | null
          rooms?: number[] | null
          bathrooms?: number[] | null
          equipments?: string[] | null
          exact_result_count?: number
          had_zero_exact?: boolean
          showed_similar_fallback?: boolean
          showed_also_like?: boolean
          path?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          session_id?: string | null
          ville?: string | null
          quartiers?: string[] | null
          quartier_libre?: string | null
          transaction_type?: string | null
          property_types?: string[] | null
          price_min?: number | null
          price_max?: number | null
          surface_min?: number | null
          surface_max?: number | null
          rooms?: number[] | null
          bathrooms?: number[] | null
          equipments?: string[] | null
          exact_result_count?: number
          had_zero_exact?: boolean
          showed_similar_fallback?: boolean
          showed_also_like?: boolean
          path?: string | null
        }
        Relationships: []
      }
      listings: {
        Row: {
          arrondissement: string | null
          bathrooms: number | null
          created_at: string | null
          description: string | null
          draft_step: number
          expires_at: string | null
          features: Json | null
          id: string
          internal_ref: string | null
          is_new_program: boolean | null
          lat: number | null
          lng: number | null
          owner_id: string
          pending_boost_types: Json | null
          publication_credits_charged: number | null
          price_eur: number | null
          price_mga: number
          quartier: string | null
          quartier_libre: string | null
          region: string | null
          rejection_reason: string | null
          rooms: number | null
          search_vector: unknown
          status: Database["public"]["Enums"]["listing_status"] | null
          surface: number | null
          title: string
          toilets: number | null
          transaction: Database["public"]["Enums"]["transaction_type"]
          type: Database["public"]["Enums"]["listing_type"]
          updated_at: string | null
          video_url: string | null
          views_count: number | null
          virtual_tour_url: string | null
          ville: string | null
        }
        Insert: {
          arrondissement?: string | null
          bathrooms?: number | null
          created_at?: string | null
          description?: string | null
          draft_step?: number
          expires_at?: string | null
          features?: Json | null
          id?: string
          internal_ref?: string | null
          is_new_program?: boolean | null
          lat?: number | null
          lng?: number | null
          owner_id: string
          pending_boost_types?: Json | null
          price_eur?: number | null
          price_mga?: number
          publication_credits_charged?: number | null
          quartier?: string | null
          quartier_libre?: string | null
          region?: string | null
          rejection_reason?: string | null
          rooms?: number | null
          search_vector?: unknown
          status?: Database["public"]["Enums"]["listing_status"] | null
          surface?: number | null
          title: string
          toilets?: number | null
          transaction?: Database["public"]["Enums"]["transaction_type"]
          type?: Database["public"]["Enums"]["listing_type"]
          updated_at?: string | null
          video_url?: string | null
          views_count?: number | null
          virtual_tour_url?: string | null
          ville?: string | null
        }
        Update: {
          arrondissement?: string | null
          bathrooms?: number | null
          created_at?: string | null
          description?: string | null
          draft_step?: number
          expires_at?: string | null
          features?: Json | null
          id?: string
          internal_ref?: string | null
          is_new_program?: boolean | null
          lat?: number | null
          lng?: number | null
          owner_id?: string
          pending_boost_types?: Json | null
          price_eur?: number | null
          price_mga?: number
          publication_credits_charged?: number | null
          quartier?: string | null
          quartier_libre?: string | null
          region?: string | null
          rejection_reason?: string | null
          rooms?: number | null
          search_vector?: unknown
          status?: Database["public"]["Enums"]["listing_status"] | null
          surface?: number | null
          title?: string
          toilets?: number | null
          transaction?: Database["public"]["Enums"]["transaction_type"]
          type?: Database["public"]["Enums"]["listing_type"]
          updated_at?: string | null
          video_url?: string | null
          views_count?: number | null
          virtual_tour_url?: string | null
          ville?: string | null
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
      profiles: {
        Row: {
          agency_id: string | null
          created_at: string | null
          credits_balance: number | null
          full_name: string | null
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          agency_id?: string | null
          created_at?: string | null
          credits_balance?: number | null
          full_name?: string | null
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          agency_id?: string | null
          created_at?: string | null
          credits_balance?: number | null
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
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
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
          p_ref_id?: string | null
          p_ref_type?: string | null
          p_user_id: string
        }
        Returns: boolean
      }
      immonex_is_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
      increment_views: { Args: { listing_uuid: string }; Returns: undefined }
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
        | "pending_payment_verification"
        | "pending_review"
        | "rejected"
        | "archived"
      listing_type:
        | "appartement"
        | "villa"
        | "maison"
        | "terrain"
        | "local_commercial"
        | "bureau"
      payment_method: "mvola" | "orange_money" | "airtel_money" | "stripe" | "bank_transfer"
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
  public: {
    Enums: {
      boost_type: ["top", "featured", "newsletter", "urgent", "daily_bump", "agency_spotlight"],
      lead_type: ["contact_form", "phone_reveal", "whatsapp"],
      listing_status: [
        "draft",
        "active",
        "paused",
        "expired",
        "pending_payment",
        "pending_payment_verification",
        "pending_review",
        "rejected",
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
      payment_method: ["mvola", "orange_money", "airtel_money", "stripe", "bank_transfer"],
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
