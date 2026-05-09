import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

/**
 * Footer ultra-minimal pour la mini-app YAS — uniquement liens légaux et
 * baseline. Pas de newsletter, pas de cookie banner (géré globalement et
 * masqué en mode embedded).
 */
export function YasFooterMini() {
  const { t } = useTranslation();
  return (
    <footer className="mt-6 border-t border-border/60 pt-5 text-center font-sans text-[12px] text-muted-foreground">
      <p>{t("yas.footer.tagline", "AutoNex — la marketplace automobile de référence à Madagascar.")}</p>
      <nav className="mt-3 flex flex-wrap items-center justify-center gap-x-1 gap-y-1.5 text-[11px]">
        <Link
          to="/legal/mentions"
          className="inline-flex min-h-11 items-center px-2 hover:underline"
        >
          {t("footer.legal", "Mentions légales")}
        </Link>
        <span aria-hidden>·</span>
        <Link
          to="/legal/confidentialite"
          className="inline-flex min-h-11 items-center px-2 hover:underline"
        >
          {t("footer.privacy", "Politique de confidentialité")}
        </Link>
        <span aria-hidden>·</span>
        <Link
          to="/contact"
          className="inline-flex min-h-11 items-center px-2 hover:underline"
        >
          {t("footer.contact", "Contact")}
        </Link>
      </nav>
      <p className="mt-3 text-[11px] text-muted-foreground/70">
        {t("yas.footer.copyright", "© 2026 APLi SARLU — AutoNex")}
      </p>
    </footer>
  );
}
