import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

/**
 * Layout minimal pour la mini-app `/yas-app`.
 *
 * Volontairement *sans* `<Header />` / `<Footer />` du site principal — la
 * page YAS est une expérience condensée mobile-first, intégrée dans une
 * WebView. Le `YasFooterMini` est rendu directement par `YasAppPage`.
 *
 * Le `main` reçoit un `id="main-content"` et un skip-link sr-only juste
 * avant : sur les routes `/yas-app`, `<Header />` n'est pas monté (gating
 * `if (isEmbedded) return null`), donc le skip-link global du Header ne
 * s'affiche pas. Ce skip-link local restaure la conformité a11y WCAG 2.4.1
 * (Plan 3/4 — A11Y #1).
 */
export function YasAppLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen min-h-[100dvh] bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:shadow-lg focus:ring-2 focus:ring-ring"
      >
        {t("a11y.skipToContent", "Aller au contenu principal")}
      </a>
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-xl px-[max(1rem,env(safe-area-inset-left))] pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-5 sm:pt-6"
      >
        {children}
      </main>
    </div>
  );
}
