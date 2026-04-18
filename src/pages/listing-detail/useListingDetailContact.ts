import type { TFunction } from "i18next";
import type { User } from "@supabase/supabase-js";
import type { NavigateFunction } from "react-router-dom";
import { useCallback, useMemo, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { DisplayListing } from "@/types/listing";
import { contactLeadSchema } from "@/lib/validation";
import { buildWhatsAppUrl } from "@/lib/whatsappUrl";
import { getDisplayedPhone } from "@/pages/listing-detail/listingDetailPresentation";
import { listingWhatsAppPrefill } from "@/pages/listing-detail/listingDetailConstants";

type LocationLike = { pathname: string; search: string };

export function useListingDetailContact(params: {
  listing: DisplayListing | undefined;
  user: User | null;
  isAdmin: boolean;
  navigate: NavigateFunction;
  location: LocationLike;
  t: TFunction<"translation", undefined>;
}) {
  const { listing, user, isAdmin, navigate, location, t } = params;

  const [phoneRevealed, setPhoneRevealed] = useState(false);
  const [revealedPhone, setRevealedPhone] = useState<string | null>(null);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [sending, setSending] = useState(false);
  const lastContactSubmitAt = useRef(0);
  const lastWhatsAppAt = useRef(0);
  const contactSectionRef = useRef<HTMLDivElement | null>(null);

  const loginForContact = useCallback(() => {
    toast.error(t("auth.loginRequiredForListingContact", "Connectez-vous pour contacter l’annonceur."));
    navigate("/login", { state: { from: `${location.pathname}${location.search}` } });
  }, [location.pathname, location.search, navigate, t]);

  const handleRevealPhone = useCallback(async () => {
    if (!listing) return;
    if (!user) {
      loginForContact();
      return;
    }
    if (user.id === listing.owner_id || isAdmin) {
      setPhoneRevealed(true);
      setRevealedPhone(listing.owner_phone ?? null);
      return;
    }
    const { error: leadError } = await supabase.from("leads").insert({
      listing_id: listing.id,
      visitor_name: user.id,
      type: "phone_reveal" as const,
    });
    if (leadError) {
      toast.error(t("listing.phoneRevealError", "Impossible d'enregistrer la demande"));
      return;
    }
    const { data: phone, error: phoneErr } = await supabase.rpc("get_listing_owner_phone", {
      p_listing_id: listing.id,
    });
    if (phoneErr) {
      toast.error(t("listing.phoneRevealError", "Impossible d'enregistrer la demande"));
      return;
    }
    setPhoneRevealed(true);
    setRevealedPhone(typeof phone === "string" ? phone : null);
  }, [isAdmin, listing, loginForContact, t, user]);

  const handleContact = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!listing) return;
      if (!user) {
        loginForContact();
        return;
      }
      const now = Date.now();
      if (now - lastContactSubmitAt.current < 4000) {
        toast.error(t("listing.contactTooFast", "Veuillez patienter quelques secondes avant de renvoyer."));
        return;
      }
      const parsed = contactLeadSchema.safeParse({
        name: contactName,
        email: contactEmail,
        phone: contactPhone,
        message: contactMessage,
      });
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message ?? t("common.error"));
        return;
      }
      setSending(true);
      lastContactSubmitAt.current = now;
      try {
        const { error: leadError } = await supabase.from("leads").insert({
          listing_id: listing.id,
          visitor_name: parsed.data.name || null,
          visitor_email: parsed.data.email || null,
          visitor_phone: parsed.data.phone || null,
          message: parsed.data.message || null,
          type: "contact_form" as const,
        });
        if (leadError) {
          toast.error(leadError.message);
        } else {
          toast.success(t("listing.messageSent", "Message envoyé !"));
          setContactName("");
          setContactEmail("");
          setContactPhone("");
          setContactMessage("");
        }
      } catch {
        toast.error(t("listing.contactSendError", "Impossible d'envoyer votre message pour le moment."));
      } finally {
        setSending(false);
      }
    },
    [contactEmail, contactMessage, contactName, contactPhone, listing, loginForContact, t, user],
  );

  const handleWhatsApp = useCallback(async () => {
    if (!listing?.has_whatsapp_contact) return;
    if (!user) {
      loginForContact();
      return;
    }
    const now = Date.now();
    if (now - lastWhatsAppAt.current < 4000) {
      toast.error(t("listing.contactTooFast", "Veuillez patienter quelques secondes avant de renvoyer."));
      return;
    }
    const skipLead = user.id === listing.owner_id || isAdmin;
    if (!skipLead) {
      const { error: leadError } = await supabase.from("leads").insert({
        listing_id: listing.id,
        visitor_name: user.id,
        type: "whatsapp" as const,
      });
      if (leadError) {
        toast.error(t("listing.phoneRevealError", "Impossible d'enregistrer la demande"));
        return;
      }
    }
    const { data: phoneRaw, error: phoneErr } = await supabase.rpc("get_listing_whatsapp_phone", {
      p_listing_id: listing.id,
    });
    if (phoneErr) {
      toast.error(t("listing.phoneRevealError", "Impossible d'enregistrer la demande"));
      return;
    }
    const phone = typeof phoneRaw === "string" ? phoneRaw : null;
    if (!phone?.trim()) {
      toast.error(t("listing.whatsappUnavailable", "Numéro WhatsApp indisponible pour cette annonce."));
      return;
    }
    const url = buildWhatsAppUrl(phone, listingWhatsAppPrefill(listing.title));
    if (!url) {
      toast.error(t("listing.whatsappUnavailable", "Numéro WhatsApp indisponible pour cette annonce."));
      return;
    }
    lastWhatsAppAt.current = now;
    window.open(url, "_blank", "noopener,noreferrer");
  }, [isAdmin, listing, loginForContact, t, user]);

  const displayedPhone = useMemo(
    () =>
      listing ? getDisplayedPhone(phoneRevealed, revealedPhone, listing, t) : t("listing.revealPhone"),
    [listing, phoneRevealed, revealedPhone, t],
  );

  return {
    phoneRevealed,
    contactName,
    setContactName,
    contactEmail,
    setContactEmail,
    contactPhone,
    setContactPhone,
    contactMessage,
    setContactMessage,
    sending,
    contactSectionRef,
    displayedPhone,
    loginForContact,
    handleRevealPhone,
    handleContact,
    handleWhatsApp,
  };
}
