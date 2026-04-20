import type { Database } from "@/integrations/supabase/types";

export type AgencyStatus = Database["public"]["Enums"]["agency_status"];
export type UserRole = Database["public"]["Enums"]["user_role"];

export type WeekDay = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
export type OpeningHours = Partial<Record<WeekDay, string>>;

export interface SocialLinks {
  facebook?: string | null;
  instagram?: string | null;
  linkedin?: string | null;
  youtube?: string | null;
  tiktok?: string | null;
}

/** Nullable-correct runtime shape for agencies rows. */
export interface Agency {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  cover_image_url: string | null;
  bio: string | null;
  description_long: string | null;
  phone: string | null;
  email: string | null;
  whatsapp_phone: string | null;
  website_url: string | null;
  address: string | null;
  city: string | null;
  region: string | null;
  commercial_contact_name: string | null;
  nif: string | null;
  stat: string | null;
  reg_commerce: string | null;
  opening_hours: OpeningHours;
  social_links: SocialLinks;
  status: AgencyStatus;
  verified: boolean;
  rejection_reason: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  spotlight_until: string | null;
  created_at: string | null;
  updated_at: string;
}

export interface AgencyWithStats {
  id: string;
  name: string;
  slug: string;
  status: AgencyStatus;
  verified: boolean;
  created_at: string | null;
  city: string | null;
  members_count: number;
  listings_count: number;
  active_listings_count: number;
  rejection_reason: string | null;
  logo_url: string | null;
}

export interface AgencyMember {
  id: string;
  full_name: string | null;
  email: string | null;
  role: UserRole;
  created_at: string | null;
  phone: string | null;
}

export interface AgencyDetail {
  agency: Agency;
  members: AgencyMember[];
}

export interface CreateAgencyInput {
  name: string;
  email: string | null;
  phone: string | null;
  commercial_contact_name: string | null;
  address: string | null;
  city: string | null;
  region: string | null;
  nif: string | null;
  stat: string | null;
  reg_commerce: string | null;
  logo_url: string | null;
  bio: string | null;
  website_url: string | null;
  whatsapp_phone: string | null;
}

export interface UpdateAgencyInput extends CreateAgencyInput {
  id: string;
  slug: string;
  cover_image_url: string | null;
  description_long: string | null;
  opening_hours: OpeningHours;
  social_links: SocialLinks;
  verified: boolean;
}

export interface UpdateMyAgencyInput {
  email: string | null;
  phone: string | null;
  whatsapp_phone: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  bio: string | null;
  description_long: string | null;
  website_url: string | null;
  opening_hours: OpeningHours;
  social_links: SocialLinks;
}

export const WEEKDAYS: readonly WeekDay[] = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
];

export const WEEKDAY_LABELS_FR: Record<WeekDay, string> = {
  mon: "Lundi",
  tue: "Mardi",
  wed: "Mercredi",
  thu: "Jeudi",
  fri: "Vendredi",
  sat: "Samedi",
  sun: "Dimanche",
};

export const AGENCY_STATUS_LABELS_FR: Record<AgencyStatus, string> = {
  pending_review: "En attente",
  approved: "Approuvée",
  rejected: "Rejetée",
  suspended: "Suspendue",
};
