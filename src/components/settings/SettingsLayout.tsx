import { useState, type ReactNode } from "react";
import { Menu } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  SETTINGS_SECTIONS,
  type SettingsSectionId,
} from "./settingsSections";
import { DeletionPendingBanner } from "./DeletionPendingBanner";

type SettingsLayoutProps = {
  activeSection: SettingsSectionId;
  onSelectSection: (id: SettingsSectionId) => void;
  children: ReactNode;
};

export function SettingsLayout({ activeSection, onSelectSection, children }: SettingsLayoutProps) {
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const nav = (
    <nav className="space-y-1">
      {SETTINGS_SECTIONS.map((section) => {
        const Icon = section.icon;
        const isActive = section.id === activeSection;
        return (
          <button
            key={section.id}
            type="button"
            onClick={() => {
              onSelectSection(section.id);
              setMobileOpen(false);
            }}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-sans transition-colors",
              isActive
                ? section.danger
                  ? "bg-destructive/10 text-destructive font-medium"
                  : "bg-primary/10 text-primary font-medium"
                : section.danger
                  ? "text-destructive/80 hover:bg-destructive/5"
                  : "text-foreground hover:bg-muted",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            <span>{t(section.labelKey)}</span>
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className="container mx-auto py-6 md:py-10">
      {/* Mobile: top bar with drawer trigger */}
      <div className="mb-4 flex items-center justify-between md:hidden">
        <h1 className="font-sans text-2xl font-bold">{t("account.settings.title", "Paramètres")}</h1>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="font-sans">
              <Menu className="h-4 w-4 mr-2" aria-hidden />
              {t("account.settings.sectionsButton", "Sections")}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-4">
            <p className="mb-3 font-sans text-lg font-bold">{t("account.settings.title", "Paramètres")}</p>
            {nav}
          </SheetContent>
        </Sheet>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6 md:gap-10">
        {/* Desktop sidebar */}
        <aside className="hidden md:block">
          <div className="sticky top-24 rounded-2xl border border-border bg-card p-4">
            <p className="px-3 pt-1 pb-3 font-sans text-lg font-bold">{t("account.settings.title", "Paramètres")}</p>
            {nav}
          </div>
        </aside>
        <main className="min-w-0">
          <DeletionPendingBanner />
          {children}
        </main>
      </div>
    </div>
  );
}
