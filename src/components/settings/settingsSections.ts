import { AlertTriangle, Bell, Lock, User, type LucideIcon } from "lucide-react";

/**
 * Declarative source of truth for the /settings navigation. Both the layout
 * sidebar and the page router read from this so adding a fifth section
 * becomes a one-liner. Keep IDs in sync with the URL hash fragments.
 */
export type SettingsSectionId = "profil" | "securite" | "notifications" | "zone-danger";

export type SettingsSectionDef = {
  id: SettingsSectionId;
  label: string;
  hash: `#${SettingsSectionId}`;
  icon: LucideIcon;
  danger?: boolean;
};

export const SETTINGS_SECTIONS: readonly SettingsSectionDef[] = [
  { id: "profil", label: "Profil", hash: "#profil", icon: User },
  { id: "securite", label: "Sécurité", hash: "#securite", icon: Lock },
  { id: "notifications", label: "Notifications", hash: "#notifications", icon: Bell },
  { id: "zone-danger", label: "Zone de danger", hash: "#zone-danger", icon: AlertTriangle, danger: true },
] as const;

export const DEFAULT_SETTINGS_SECTION: SettingsSectionId = "profil";

export function parseSectionFromHash(hash: string): SettingsSectionId {
  const stripped = hash.replace(/^#/, "");
  const match = SETTINGS_SECTIONS.find((s) => s.id === stripped);
  return match ? match.id : DEFAULT_SETTINGS_SECTION;
}
