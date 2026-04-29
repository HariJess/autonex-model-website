import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  NOTIFICATION_CATEGORY_LABELS,
  type NotificationCategory,
  type NotificationPreferences,
} from "@/types/notification";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import { toast } from "sonner";

type CategoryPrefKey = {
  inApp: keyof NotificationPreferences;
  emailImmediate: keyof NotificationPreferences;
  emailDigest: keyof NotificationPreferences;
};

const CATEGORY_PREF_KEYS: Record<NotificationCategory, CategoryPrefKey> = {
  listings: {
    inApp: "listingsInApp",
    emailImmediate: "listingsEmailImmediate",
    emailDigest: "listingsEmailDigest",
  },
  payments: {
    inApp: "paymentsInApp",
    emailImmediate: "paymentsEmailImmediate",
    emailDigest: "paymentsEmailDigest",
  },
  activity: {
    inApp: "activityInApp",
    emailImmediate: "activityEmailImmediate",
    emailDigest: "activityEmailDigest",
  },
  searches: {
    inApp: "searchesInApp",
    emailImmediate: "searchesEmailImmediate",
    emailDigest: "searchesEmailDigest",
  },
  admin: {
    // Pas de préférences user-side pour admin — rangée masquée dans l'UI.
    inApp: "systemInApp",
    emailImmediate: "systemEmailImmediate",
    emailDigest: "systemEmailDigest",
  },
  system: {
    inApp: "systemInApp",
    emailImmediate: "systemEmailImmediate",
    emailDigest: "systemEmailDigest",
  },
};

const USER_FACING_CATEGORIES: NotificationCategory[] = [
  "listings",
  "payments",
  "activity",
  "searches",
  "system",
];

const SettingsNotificationsPage = () => {
  const { preferences, loading, saving, error, update, resetDefaults } = useNotificationPreferences();

  const handleToggle = (key: keyof NotificationPreferences, value: boolean) => {
    void update({ [key]: value } as Partial<NotificationPreferences>);
  };

  const handleReset = async () => {
    await resetDefaults();
    toast.success("Préférences remises par défaut.");
  };

  return (
    <>
      <Helmet>
        <title>Préférences de notifications — AutoNex</title>
      </Helmet>
      <Header />
      <div className="container mx-auto max-w-3xl py-6 md:py-8 px-4">
        <div className="mb-6">
          <h1 className="font-sans text-2xl md:text-3xl font-bold">Préférences de notifications</h1>
          <p className="text-sm text-muted-foreground font-sans mt-1">
            Choisissez les canaux (in-app, email immédiat, email digest) pour chaque catégorie.
          </p>
        </div>

        {loading && (
          <div className="rounded-2xl border border-border bg-card px-4 py-6 text-sm text-muted-foreground">
            Chargement des préférences…
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/5 px-4 py-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {!loading && preferences && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center px-4 py-3 bg-muted/30 text-xs font-sans text-muted-foreground">
                <span>Catégorie</span>
                <span className="text-center w-20">In-app</span>
                <span className="text-center w-20">Email immédiat</span>
                <span className="text-center w-20">Email digest</span>
              </div>
              {USER_FACING_CATEGORIES.map((cat) => {
                const keys = CATEGORY_PREF_KEYS[cat];
                return (
                  <div
                    key={cat}
                    className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center px-4 py-3 border-t border-border first:border-t-0"
                  >
                    <span className="font-sans text-sm text-foreground">
                      {NOTIFICATION_CATEGORY_LABELS[cat]}
                    </span>
                    <div className="flex justify-center w-20">
                      <Switch
                        checked={Boolean(preferences[keys.inApp])}
                        onCheckedChange={(v) => handleToggle(keys.inApp, v)}
                        disabled={saving}
                      />
                    </div>
                    <div className="flex justify-center w-20">
                      <Switch
                        checked={Boolean(preferences[keys.emailImmediate])}
                        onCheckedChange={(v) => handleToggle(keys.emailImmediate, v)}
                        disabled={saving}
                      />
                    </div>
                    <div className="flex justify-center w-20">
                      <Switch
                        checked={Boolean(preferences[keys.emailDigest])}
                        onCheckedChange={(v) => handleToggle(keys.emailDigest, v)}
                        disabled={saving}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <div>
                <p className="font-sans font-semibold text-sm">Digest email</p>
                <p className="text-xs text-muted-foreground font-sans mt-0.5">
                  Regroupement des notifications non critiques en un email récapitulatif.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="font-sans text-xs">Fréquence</Label>
                  <Select
                    value={preferences.digestFrequency}
                    onValueChange={(v) =>
                      void update({ digestFrequency: v as NotificationPreferences["digestFrequency"] })
                    }
                    disabled={saving}
                  >
                    <SelectTrigger className="font-sans">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Quotidien</SelectItem>
                      <SelectItem value="weekly">Hebdomadaire</SelectItem>
                      <SelectItem value="never">Jamais</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="font-sans text-xs">Heure d'envoi (EAT)</Label>
                  <Input
                    type="time"
                    value={preferences.digestTime.slice(0, 5)}
                    onChange={(e) => void update({ digestTime: `${e.target.value}:00` })}
                    disabled={saving}
                    className="font-sans"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-sans text-xs">Max emails / jour</Label>
                  <Input
                    type="number"
                    min={0}
                    max={50}
                    value={preferences.maxEmailsPerDay}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      if (Number.isFinite(n) && n >= 0) {
                        void update({ maxEmailsPerDay: Math.min(50, Math.max(0, Math.floor(n))) });
                      }
                    }}
                    disabled={saving}
                    className="font-sans"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 flex-wrap">
              <Button variant="outline" onClick={() => void handleReset()} disabled={saving}>
                Remettre par défaut
              </Button>
              <Link to="/notifications" className="text-sm font-sans text-primary hover:underline">
                Retour aux notifications
              </Link>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
};

export default SettingsNotificationsPage;
