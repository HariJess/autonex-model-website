import { useCallback, useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import {
  DEFAULT_SETTINGS_SECTION,
  parseSectionFromHash,
  type SettingsSectionId,
} from "@/components/settings/settingsSections";
import { ProfilSection } from "@/components/settings/sections/ProfilSection";
import { SecuriteSection } from "@/components/settings/sections/SecuriteSection";
import { NotificationsSection } from "@/components/settings/sections/NotificationsSection";
import { ZoneDangerSection } from "@/components/settings/sections/ZoneDangerSection";

/**
 * Hash-driven single-page settings container. The URL hash is the source of
 * truth for the active section so the browser back/forward buttons and
 * deep-links (e.g. /settings#zone-danger) just work without a router change.
 */
export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SettingsSectionId>(() =>
    typeof window === "undefined"
      ? DEFAULT_SETTINGS_SECTION
      : parseSectionFromHash(window.location.hash),
  );

  useEffect(() => {
    const onHashChange = () => setActiveSection(parseSectionFromHash(window.location.hash));
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const handleSelectSection = useCallback((id: SettingsSectionId) => {
    if (typeof window !== "undefined") {
      // pushState updates the URL hash + fires hashchange listener naturally
      // via history API (capture via popstate/hashchange; here we also update
      // state synchronously for an immediate render).
      window.history.replaceState(null, "", `#${id}`);
    }
    setActiveSection(id);
  }, []);

  return (
    <>
      <Helmet>
        <title>Paramètres — AutoNex</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <Header />
      <SettingsLayout activeSection={activeSection} onSelectSection={handleSelectSection}>
        <section role="region" aria-labelledby={`section-${activeSection}-heading`}>
          {activeSection === "profil" && <ProfilSection />}
          {activeSection === "securite" && <SecuriteSection />}
          {activeSection === "notifications" && <NotificationsSection />}
          {activeSection === "zone-danger" && <ZoneDangerSection />}
        </section>
      </SettingsLayout>
      <Footer />
    </>
  );
}
