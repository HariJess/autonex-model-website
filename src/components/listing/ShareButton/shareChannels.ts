import type { ComponentType } from "react";
import { Facebook, Mail, Link as LinkIcon } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";

export type ShareChannel = "whatsapp" | "messenger" | "copy" | "email" | "native";

export interface ShareUrlParams {
  url: string;
  title: string;
  text: string;
  emailSubject: string;
  emailBody: string;
}

export interface ShareChannelConfig {
  id: Exclude<ShareChannel, "native">;
  label: string;
  icon: ComponentType<{ className?: string }>;
  iconBg: string;
  buildUrl: (params: ShareUrlParams) => string;
}

export const SHARE_CHANNELS: ShareChannelConfig[] = [
  {
    id: "whatsapp",
    label: "WhatsApp",
    icon: FaWhatsapp,
    iconBg: "bg-green-500 hover:bg-green-600",
    buildUrl: ({ text }) => `https://wa.me/?text=${encodeURIComponent(text)}`,
  },
  {
    id: "messenger",
    label: "Messenger",
    icon: Facebook,
    iconBg: "bg-blue-600 hover:bg-blue-700",
    buildUrl: ({ url }) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    id: "copy",
    label: "Copier le lien",
    icon: LinkIcon,
    iconBg: "bg-gray-500 hover:bg-gray-600",
    buildUrl: ({ url }) => url,
  },
  {
    id: "email",
    label: "Email",
    icon: Mail,
    iconBg: "bg-orange-500 hover:bg-orange-600",
    buildUrl: ({ emailSubject, emailBody }) =>
      `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`,
  },
];
