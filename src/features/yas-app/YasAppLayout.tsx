import type { ReactNode } from "react";

/**
 * Layout minimal pour la mini-app `/yas-app`.
 *
 * Volontairement *sans* `<Header />` / `<Footer />` du site principal — la
 * page YAS est une expérience condensée mobile-first, intégrée dans une
 * WebView. Le `YasFooterMini` est rendu directement par `YasAppPage`.
 *
 * Le `main` reçoit un `id="main-content"` pour rester compatible avec le
 * skip-link global (sr-only), même si Header n'est pas monté ici.
 */
export function YasAppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-xl px-4 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-5 sm:pt-6"
      >
        {children}
      </main>
    </div>
  );
}
