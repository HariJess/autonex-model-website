import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Loader2,
  Upload,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/features/credits/lib/creditFormatting";
import { useAuth } from "@/contexts/AuthContext";
import { useCreditsBalance } from "@/hooks/useCreditsBalance";
import {
  useUploadVerificationFile,
  validateVerificationFile,
  type VerificationDocType,
} from "@/hooks/verification/useUploadVerificationFile";
import { useSubmitVerification } from "@/hooks/verification/useSubmitVerification";
import { VERIFIED_SELLER_YEAR_CREDIT_COST } from "@/config/monetization";
import type { MyVerificationRow } from "@/hooks/verification/useMyVerification";

const DRAFT_KEY_PREFIX = "autonex.verificationDraft.";

type StepId = "intro" | "cin_front" | "cin_back" | "selfie" | "metadata";

const STEP_ORDER: StepId[] = ["intro", "cin_front", "cin_back", "selfie", "metadata"];

type DraftPaths = {
  cin_front: string | null;
  cin_back: string | null;
  selfie: string | null;
};

type DraftMetadata = {
  full_name: string;
  cin_number: string;
  date_of_birth: string;
};

type VerificationFlowProps = {
  /** Si la précédente verification est rejetée, on affiche un bandeau d'avertissement. */
  lastRejection?: MyVerificationRow | null;
};

function loadDraft(sessionId: string): { paths: DraftPaths; metadata: DraftMetadata } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY_PREFIX + sessionId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { paths?: DraftPaths; metadata?: DraftMetadata };
    return {
      paths: {
        cin_front: parsed.paths?.cin_front ?? null,
        cin_back: parsed.paths?.cin_back ?? null,
        selfie: parsed.paths?.selfie ?? null,
      },
      metadata: {
        full_name: parsed.metadata?.full_name ?? "",
        cin_number: parsed.metadata?.cin_number ?? "",
        date_of_birth: parsed.metadata?.date_of_birth ?? "",
      },
    };
  } catch {
    return null;
  }
}

function saveDraft(sessionId: string, paths: DraftPaths, metadata: DraftMetadata): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      DRAFT_KEY_PREFIX + sessionId,
      JSON.stringify({ paths, metadata }),
    );
  } catch {
    /* quota exceeded — ignore */
  }
}

function clearDraft(sessionId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(DRAFT_KEY_PREFIX + sessionId);
  } catch {
    /* ignore */
  }
}

/**
 * Generates / retrieves a stable session UUID persisted in localStorage so a
 * page refresh does NOT reset the draft. Cleared on successful submit.
 */
function useSessionId(): string {
  const ref = useRef<string | null>(null);
  if (ref.current === null) {
    if (typeof window !== "undefined") {
      const existing = window.localStorage.getItem("autonex.verificationSessionId");
      if (existing) {
        ref.current = existing;
      } else {
        const newId =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
        window.localStorage.setItem("autonex.verificationSessionId", newId);
        ref.current = newId;
      }
    } else {
      ref.current = `ssr-${Date.now()}`;
    }
  }
  return ref.current;
}

export function VerificationFlow({ lastRejection }: VerificationFlowProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: balance = 0, isPending: balanceLoading } = useCreditsBalance();
  const upload = useUploadVerificationFile();
  const submit = useSubmitVerification();

  const sessionId = useSessionId();
  const [stepIdx, setStepIdx] = useState(0);
  const [consent, setConsent] = useState(false);
  const [paths, setPaths] = useState<DraftPaths>({
    cin_front: null,
    cin_back: null,
    selfie: null,
  });
  const [metadata, setMetadata] = useState<DraftMetadata>({
    full_name: "",
    cin_number: "",
    date_of_birth: "",
  });

  // Load draft on mount
  useEffect(() => {
    const draft = loadDraft(sessionId);
    if (draft) {
      setPaths(draft.paths);
      setMetadata(draft.metadata);
    }
  }, [sessionId]);

  // Persist draft on every change
  useEffect(() => {
    saveDraft(sessionId, paths, metadata);
  }, [sessionId, paths, metadata]);

  const cost = VERIFIED_SELLER_YEAR_CREDIT_COST;
  const canAfford = !balanceLoading && balance >= cost;
  const currentStep = STEP_ORDER[stepIdx];

  const handleFileSelect = async (docType: VerificationDocType, file: File | null) => {
    if (!file || !user) return;
    const validationKey = validateVerificationFile(file);
    if (validationKey) {
      toast.error(t(validationKey));
      return;
    }
    try {
      // HOTFIX : userId n'est plus passé en param — le hook le dérive de
      // supabase.auth.getSession() pour garantir le JWT attaché à la requête.
      const { path } = await upload.mutateAsync({
        file,
        sessionId,
        docType,
      });
      setPaths((prev) => ({ ...prev, [docType]: path }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "verification.errors.uploadFailed";
      toast.error(t(message));
    }
  };

  const handleSubmit = async () => {
    if (!paths.cin_front || !paths.cin_back || !paths.selfie) {
      toast.error(t("verification.errors.uploadFailed"));
      return;
    }
    if (metadata.full_name.trim().length < 3) {
      toast.error(t("verification.errors.invalidFullName"));
      return;
    }
    if (metadata.cin_number.trim().length < 6) {
      toast.error(t("verification.errors.invalidCinNumber"));
      return;
    }

    try {
      await submit.mutateAsync({
        cin_front_path: paths.cin_front,
        cin_back_path: paths.cin_back,
        selfie_path: paths.selfie,
        full_name: metadata.full_name,
        cin_number: metadata.cin_number,
        date_of_birth: metadata.date_of_birth || null,
      });
      clearDraft(sessionId);
      // Re-mount avec fresh sessionId au prochain re-submit
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("autonex.verificationSessionId");
      }
      navigate("/dashboard");
    } catch {
      // toast déjà géré par useSubmitVerification.onError
    }
  };

  const goNext = () => setStepIdx((i) => Math.min(i + 1, STEP_ORDER.length - 1));
  const goPrev = () => setStepIdx((i) => Math.max(i - 1, 0));

  const introCanProceed = consent && canAfford;
  const submitting = submit.isPending;

  return (
    <div className="space-y-4" data-testid="verification-flow">
      {lastRejection && lastRejection.rejection_reason && (
        <Card className="rounded-xl border-orange-200 bg-orange-50/50 dark:border-orange-900/40 dark:bg-orange-950/20">
          <CardContent className="py-3">
            <p className="font-sans text-sm text-orange-900 dark:text-orange-200">
              <span className="font-medium">
                {t("verification.flow.previousRejection", "Précédente demande refusée :")}
              </span>{" "}
              {lastRejection.rejection_reason}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Progress indicator */}
      <div className="flex items-center gap-1.5" aria-label="Progression" data-testid="verification-flow-progress">
        {STEP_ORDER.map((s, i) => (
          <span
            key={s}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              i <= stepIdx ? "bg-primary" : "bg-muted",
            )}
            aria-hidden="true"
          />
        ))}
      </div>

      <Card className="rounded-2xl">
        <CardContent className="py-6 space-y-4">
          {currentStep === "intro" && (
            <IntroStep
              cost={cost}
              balance={balance}
              balanceLoading={balanceLoading}
              consent={consent}
              onConsentChange={setConsent}
            />
          )}

          {(currentStep === "cin_front" || currentStep === "cin_back" || currentStep === "selfie") && (
            <UploadStep
              docType={currentStep}
              currentPath={paths[currentStep]}
              isUploading={upload.isPending}
              onFileSelect={handleFileSelect}
            />
          )}

          {currentStep === "metadata" && (
            <MetadataStep
              metadata={metadata}
              onMetadataChange={setMetadata}
              paths={paths}
            />
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={goPrev}
              disabled={stepIdx === 0 || submitting}
              data-testid="verification-flow-prev"
              className="font-sans gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              {t("verification.steps.nav.previous", "Précédent")}
            </Button>

            {currentStep !== "metadata" ? (
              <Button
                type="button"
                onClick={goNext}
                disabled={
                  (currentStep === "intro" && !introCanProceed) ||
                  (currentStep === "cin_front" && !paths.cin_front) ||
                  (currentStep === "cin_back" && !paths.cin_back) ||
                  (currentStep === "selfie" && !paths.selfie)
                }
                data-testid="verification-flow-next"
                className="font-sans gap-1.5"
              >
                {currentStep === "intro"
                  ? t("verification.intro.startCta", "Commencer")
                  : t("verification.steps.nav.next", "Suivant")}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={
                  submitting ||
                  !paths.cin_front ||
                  !paths.cin_back ||
                  !paths.selfie ||
                  metadata.full_name.trim().length < 3 ||
                  metadata.cin_number.trim().length < 6
                }
                aria-busy={submitting}
                data-testid="verification-flow-submit"
                className="font-sans gap-1.5"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    {t("verification.steps.recap.submitting", "Envoi en cours...")}
                  </>
                ) : (
                  t("verification.steps.recap.confirmCta", "Soumettre ma demande")
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Step 1 : Intro + RGPD ──────────────────────────────────────────────

type IntroStepProps = {
  cost: number;
  balance: number;
  balanceLoading: boolean;
  consent: boolean;
  onConsentChange: (v: boolean) => void;
};

function IntroStep({ cost, balance, balanceLoading, consent, onConsentChange }: IntroStepProps) {
  const { t } = useTranslation();
  const insufficient = !balanceLoading && balance < cost;

  return (
    <div className="space-y-4" data-testid="verification-step-intro">
      <div className="flex items-start gap-3">
        <BadgeCheck className="h-7 w-7 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" aria-hidden="true" />
        <div className="space-y-1">
          <p className="font-sans text-base font-semibold text-foreground">
            {t("verification.title", "Vendeur vérifié")}
          </p>
          <p className="font-sans text-sm text-muted-foreground leading-relaxed">
            {t("verification.subtitle", "Renforcez la confiance de vos acheteurs")}
          </p>
        </div>
      </div>

      <section>
        <p className="font-sans text-sm font-medium text-foreground">
          {t("verification.intro.benefits.title", "Les avantages")}
        </p>
        <ul className="mt-1.5 space-y-1 font-sans text-sm text-muted-foreground">
          <li>• {t("verification.intro.benefits.b1", "Badge ✓ Vérifié sur toutes vos annonces")}</li>
          <li>• {t("verification.intro.benefits.b2", "Visibilité accrue dans les résultats")}</li>
          <li>• {t("verification.intro.benefits.b3", "Confiance accrue des acheteurs")}</li>
        </ul>
      </section>

      <section>
        <p className="font-sans text-sm font-medium text-foreground">
          {t("verification.intro.requirements.title", "Documents requis")}
        </p>
        <ul className="mt-1.5 space-y-1 font-sans text-sm text-muted-foreground">
          <li>• {t("verification.intro.requirements.r1", "Carte d'identité (recto)")}</li>
          <li>• {t("verification.intro.requirements.r2", "Carte d'identité (verso)")}</li>
          <li>• {t("verification.intro.requirements.r3", "Selfie tenant votre CIN")}</li>
        </ul>
      </section>

      <section className="rounded-lg border border-border bg-muted/30 p-3">
        <p className="font-sans text-xs font-medium text-foreground">
          {t("verification.intro.privacy.title", "Confidentialité")}
        </p>
        <p className="mt-1 font-sans text-xs text-muted-foreground leading-relaxed">
          {t(
            "verification.intro.privacy.body",
            "Vos documents sont chiffrés et utilisés uniquement pour la vérification. Conservés 90 jours en cas de rejet, supprimés à l'expiration du badge.",
          )}
        </p>
        <label className="mt-2 flex items-start gap-2 cursor-pointer">
          <Checkbox
            checked={consent}
            onCheckedChange={(v) => onConsentChange(v === true)}
            data-testid="verification-flow-consent"
          />
          <span className="font-sans text-xs text-foreground leading-relaxed">
            {t(
              "verification.intro.privacy.consentLabel",
              "J'accepte la politique de confidentialité",
            )}
          </span>
        </label>
      </section>

      <div className="rounded-lg border border-border bg-muted/30 p-3 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="font-sans text-xs text-muted-foreground">
            {t("verification.intro.cost", "Coût")}
          </p>
          <p
            className={cn(
              "font-sans text-sm font-semibold",
              insufficient ? "text-destructive" : "text-foreground",
            )}
            data-testid="verification-flow-cost"
          >
            {t("boostModal.cardCostValue", "{{amount}} cr.", {
              amount: formatNumber(cost),
            })}
          </p>
        </div>
        <div className="text-right">
          <p className="font-sans text-xs text-muted-foreground">
            {t("verification.intro.balanceLabel", "Solde")}
          </p>
          <p className="font-sans text-sm text-foreground">
            {balanceLoading ? "…" : formatNumber(balance)}
          </p>
        </div>
      </div>

      {insufficient && (
        <p className="font-sans text-xs text-destructive">
          {t("verification.errors.insufficientCredits", "Crédits insuffisants pour la vérification")}
        </p>
      )}
    </div>
  );
}

// ─── Step 2-4 : Upload doc ──────────────────────────────────────────────

type UploadStepProps = {
  docType: VerificationDocType;
  currentPath: string | null;
  isUploading: boolean;
  onFileSelect: (docType: VerificationDocType, file: File | null) => void;
};

function UploadStep({ docType, currentPath, isUploading, onFileSelect }: UploadStepProps) {
  const { t } = useTranslation();

  const titleKey = `verification.steps.${docType === "cin_front" ? "cinFront" : docType === "cin_back" ? "cinBack" : "selfie"}.title`;
  const titleFallback =
    docType === "cin_front"
      ? "Carte d'identité — Recto"
      : docType === "cin_back"
        ? "Carte d'identité — Verso"
        : "Selfie avec votre CIN";

  return (
    <div className="space-y-3" data-testid={`verification-step-${docType}`}>
      <p className="font-sans text-base font-semibold text-foreground">
        {t(titleKey, titleFallback)}
      </p>
      {docType === "selfie" && (
        <p className="font-sans text-xs text-muted-foreground leading-relaxed">
          {t(
            "verification.steps.selfie.tip",
            "Tenez votre CIN à côté de votre visage. Les deux doivent être nets et bien éclairés.",
          )}
        </p>
      )}

      <label
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 cursor-pointer transition-colors",
          currentPath
            ? "border-emerald-300 bg-emerald-50/30 dark:border-emerald-800/50 dark:bg-emerald-950/10"
            : "border-border hover:border-primary hover:bg-muted/30",
          isUploading && "opacity-60 cursor-not-allowed",
        )}
      >
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="sr-only"
          disabled={isUploading}
          data-testid={`verification-flow-input-${docType}`}
          onChange={(e) => onFileSelect(docType, e.target.files?.[0] ?? null)}
        />
        {isUploading ? (
          <>
            <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
            <span className="font-sans text-sm text-foreground">
              {t("verification.steps.upload.uploading", "Upload en cours...")}
            </span>
          </>
        ) : currentPath ? (
          <>
            <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            <span className="font-sans text-sm font-medium text-emerald-900 dark:text-emerald-200">
              {t("verification.steps.upload.uploaded", "✓ Document uploadé")}
            </span>
            <span className="font-sans text-xs text-muted-foreground">
              {t("verification.steps.upload.replaceHint", "Cliquez pour remplacer")}
            </span>
          </>
        ) : (
          <>
            <Upload className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
            <span className="font-sans text-sm font-medium text-foreground">
              {t("verification.steps.upload.dropzone", "Glissez votre fichier ici ou cliquez")}
            </span>
            <span className="font-sans text-xs text-muted-foreground">
              {t("verification.steps.upload.formats", "JPG, PNG, WEBP ou PDF — max 10 Mo")}
            </span>
          </>
        )}
      </label>
    </div>
  );
}

// ─── Step 5 : Metadata + recap ──────────────────────────────────────────

type MetadataStepProps = {
  metadata: DraftMetadata;
  onMetadataChange: (m: DraftMetadata) => void;
  paths: DraftPaths;
};

function MetadataStep({ metadata, onMetadataChange, paths }: MetadataStepProps) {
  const { t } = useTranslation();
  const allUploaded = useMemo(
    () => Boolean(paths.cin_front && paths.cin_back && paths.selfie),
    [paths],
  );

  return (
    <div className="space-y-4" data-testid="verification-step-metadata">
      <p className="font-sans text-base font-semibold text-foreground">
        {t("verification.steps.metadata.title", "Vos informations")}
      </p>

      <div className="space-y-3">
        <div>
          <Label htmlFor="verif-full-name" className="font-sans text-sm">
            {t("verification.steps.metadata.fullName.label", "Nom complet (comme sur la CIN)")}
          </Label>
          <Input
            id="verif-full-name"
            type="text"
            value={metadata.full_name}
            onChange={(e) => onMetadataChange({ ...metadata, full_name: e.target.value })}
            data-testid="verification-flow-full-name"
            className="mt-1 font-sans"
            autoComplete="name"
          />
        </div>
        <div>
          <Label htmlFor="verif-cin-number" className="font-sans text-sm">
            {t("verification.steps.metadata.cinNumber.label", "Numéro de CIN")}
          </Label>
          <Input
            id="verif-cin-number"
            type="text"
            value={metadata.cin_number}
            onChange={(e) => onMetadataChange({ ...metadata, cin_number: e.target.value })}
            data-testid="verification-flow-cin-number"
            className="mt-1 font-sans"
            autoComplete="off"
          />
        </div>
        <div>
          <Label htmlFor="verif-dob" className="font-sans text-sm">
            {t("verification.steps.metadata.dateOfBirth.label", "Date de naissance (optionnel)")}
          </Label>
          <Input
            id="verif-dob"
            type="date"
            value={metadata.date_of_birth}
            onChange={(e) => onMetadataChange({ ...metadata, date_of_birth: e.target.value })}
            data-testid="verification-flow-dob"
            className="mt-1 font-sans"
            autoComplete="bday"
          />
        </div>
      </div>

      <section className="rounded-lg border border-border bg-muted/30 p-3">
        <p className="font-sans text-sm font-medium text-foreground">
          {t("verification.steps.recap.title", "Récapitulatif")}
        </p>
        <ul className="mt-1.5 space-y-1 font-sans text-xs text-muted-foreground">
          <li className={paths.cin_front ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"}>
            {paths.cin_front ? "✓" : "✗"} {t("verification.intro.requirements.r1")}
          </li>
          <li className={paths.cin_back ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"}>
            {paths.cin_back ? "✓" : "✗"} {t("verification.intro.requirements.r2")}
          </li>
          <li className={paths.selfie ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"}>
            {paths.selfie ? "✓" : "✗"} {t("verification.intro.requirements.r3")}
          </li>
        </ul>
        {!allUploaded && (
          <p className="mt-2 font-sans text-xs text-destructive">
            {t(
              "verification.steps.recap.missingDocs",
              "Documents manquants. Revenez aux étapes précédentes.",
            )}
          </p>
        )}
      </section>
    </div>
  );
}
