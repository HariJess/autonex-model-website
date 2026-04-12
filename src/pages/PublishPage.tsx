import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LocationPicker from "@/components/LocationPicker";
import PublishLocationMap from "@/components/PublishLocationMap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Check, Upload, AlertCircle, Coins, Shield, Sparkles } from "lucide-react";
import { LISTING_TYPE_LABELS, type ListingType, type TransactionType } from "@/types/listing";
import { getRegionForVille, getSuggestedListingCoordinates } from "@/data/madagascar-locations";
import { LISTING_EQUIPMENT_OPTIONS } from "@/data/listing-equipment";
import { isValidListingCoordinates } from "@/lib/mapCoordinates";
import {
  listingTypesForTransaction,
  isTerrainRentalForbidden,
  assertValidTransactionType,
} from "@/lib/listingRules";
import {
  LISTING_PUBLISH_CREDIT_COST,
  BOOST_CREDIT_COSTS,
  BOOST_ORDER,
  BOOST_LABELS_FR,
  totalPublicationCredits,
  AGENCY_SPOTLIGHT_CREDIT_COST,
  formatAriary,
  type PurchasableBoostType,
} from "@/config/monetization";
import { mergeCanonicalCreditPacks, type CreditPackRow } from "@/lib/creditPacks";
import { consumeCredits } from "@/lib/creditsApi";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

const TYPES_WITH_ROOMS: ListingType[] = ["appartement", "villa", "maison"];

const MANUAL_PAYMENT_METHODS = [
  { id: "bank_transfer" as const, name: "Virement bancaire" },
  { id: "mvola" as const, name: "MVola" },
  { id: "orange_money" as const, name: "Orange Money" },
  { id: "airtel_money" as const, name: "Airtel Money" },
];

const PublishPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [stepErrors, setStepErrors] = useState<string[]>([]);

  const steps = [
    t("publish.stepMain", "Informations principales"),
    t("publish.stepDetails", "Détails du bien"),
    t("publish.stepMedia", "Médias"),
    t("publish.stepVisibility", "Visibilité & envoi"),
  ];

  const [transaction, setTransaction] = useState<TransactionType | "">("");
  const [listingType, setListingType] = useState<ListingType | "">("");
  const [isNewProgram, setIsNewProgram] = useState(false);
  const [internalRef, setInternalRef] = useState("");
  const [ville, setVille] = useState("");
  const [arrondissement, setArrondissement] = useState("");
  const [quartier, setQuartier] = useState("");
  const [quartierLibre, setQuartierLibre] = useState("");
  const [pinLat, setPinLat] = useState<number | null>(null);
  const [pinLng, setPinLng] = useState<number | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceMga, setPriceMga] = useState("");
  const [surface, setSurface] = useState("");
  const [rooms, setRooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [toilets, setToilets] = useState("");
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);

  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState("");
  const [virtualTourUrl, setVirtualTourUrl] = useState("");

  const [selectedBoosts, setSelectedBoosts] = useState<PurchasableBoostType[]>([]);
  const [agencySpotlight, setAgencySpotlight] = useState(false);
  const [creditPackPurchase, setCreditPackPurchase] = useState("");
  const [purchasePaymentMethod, setPurchasePaymentMethod] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [purchaseSubmitting, setPurchaseSubmitting] = useState(false);

  const showRooms = listingType === "" || TYPES_WITH_ROOMS.includes(listingType as ListingType);
  const typeOptions = listingTypesForTransaction(transaction);

  const { data: creditPacks = [] } = useQuery({
    queryKey: ["credit-packs"],
    queryFn: async (): Promise<CreditPackRow[]> => {
      const { data, error } = await supabase.from("credit_packs").select("*").order("sort_order", { ascending: true });
      if (error) return mergeCanonicalCreditPacks(null);
      return mergeCanonicalCreditPacks(data as CreditPackRow[]);
    },
  });

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  useEffect(() => {
    if (!profile?.agency_id) setAgencySpotlight(false);
  }, [profile?.agency_id]);

  useEffect(() => {
    if (!ville) {
      setPinLat(null);
      setPinLng(null);
      return;
    }
    const s = getSuggestedListingCoordinates(ville, arrondissement || undefined, quartier || undefined);
    if (s) {
      setPinLat(s.lat);
      setPinLng(s.lng);
    }
  }, [ville, arrondissement, quartier]);

  useEffect(() => {
    return () => {
      photoPreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [photoPreviews]);

  useEffect(() => {
    if (listingType && !TYPES_WITH_ROOMS.includes(listingType as ListingType)) {
      setRooms("");
      setBathrooms("");
      setToilets("");
    }
  }, [listingType]);

  const creditsBalance = profile?.credits_balance ?? 0;
  const agencySpotlightActive = Boolean(profile?.agency_id && agencySpotlight);
  const totalCost = totalPublicationCredits(selectedBoosts, { agencySpotlight: agencySpotlightActive });
  const canPublishWithCredits = creditsBalance >= totalCost;

  const toggleFeature = (f: string) => {
    setSelectedFeatures((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));
  };

  const toggleBoost = (b: PurchasableBoostType) => {
    setSelectedBoosts((prev) => (prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]));
  };

  const setAsCover = (index: number) => {
    if (index <= 0) return;
    setPhotos((p) => {
      const n = [...p];
      const [x] = n.splice(index, 1);
      n.unshift(x);
      return n;
    });
    setPhotoPreviews((p) => {
      const n = [...p];
      const [x] = n.splice(index, 1);
      n.unshift(x);
      return n;
    });
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).slice(0, 10);
      photoPreviews.forEach((url) => URL.revokeObjectURL(url));
      setPhotos(files);
      setPhotoPreviews(files.map((f) => URL.createObjectURL(f)));
    }
  };

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(photoPreviews[index]);
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const validateStep = (s: number): string[] => {
    const errors: string[] = [];
    switch (s) {
      case 0:
        if (!transaction || !assertValidTransactionType(transaction)) errors.push(t("publish.transactionRequired", "Type de transaction requis"));
        if (!listingType) errors.push(t("publish.typeRequired", "Type de bien requis"));
        if (transaction && listingType && isTerrainRentalForbidden(transaction, listingType)) {
          errors.push(t("publish.terrainNoRent", "Un terrain ne peut pas être proposé à la location."));
        }
        if (!ville) errors.push(t("publish.villeRequired", "Ville requise"));
        if (pinLat == null || pinLng == null || !isValidListingCoordinates(pinLat, pinLng)) {
          errors.push(t("publish.mapRequired", "Position sur la carte requise"));
        }
        break;
      case 1:
        if (!title.trim() || title.trim().length < 8) errors.push(t("publish.titleRequired", "Titre requis (min. 8 caractères)"));
        if (description.trim().length < 40) errors.push(t("publish.descFrenchRequired", "Description en français requise (min. 40 caractères)"));
        if (!priceMga || Number(priceMga) <= 0) errors.push(t("publish.priceRequired", "Prix valide requis"));
        if (surface && Number(surface) < 0) errors.push(t("publish.surfaceInvalid", "Surface invalide"));
        break;
      case 2:
        if (photos.length < 1) errors.push(t("publish.photoRequired", "Au moins une photo (photo principale) est requise"));
        break;
      default:
        break;
    }
    return errors;
  };

  const handleNext = () => {
    const errors = validateStep(step);
    setStepErrors(errors);
    if (errors.length > 0) {
      toast.error(errors[0]);
      return;
    }
    setStep((x) => x + 1);
  };

  const handlePublish = async () => {
    const errors = validateStep(0).concat(validateStep(1)).concat(validateStep(2));
    setStepErrors(errors);
    if (errors.length > 0) {
      toast.error(errors[0]);
      setStep(0);
      return;
    }
    if (!user || !transaction || !listingType) {
      toast.error(t("publish.loginRequired", "Vous devez être connecté"));
      return;
    }
    if (!canPublishWithCredits) {
      toast.error(t("publish.insufficientCredits", "Crédits insuffisants — achetez un pack ou choisissez moins d’options boost."));
      return;
    }

    setPublishing(true);
    try {
      const region = getRegionForVille(ville);
      const priceNum = Number(priceMga) || 0;
      let finalLat: number | null = null;
      let finalLng: number | null = null;
      if (pinLat != null && pinLng != null && isValidListingCoordinates(pinLat, pinLng)) {
        finalLat = Number(pinLat.toFixed(7));
        finalLng = Number(pinLng.toFixed(7));
      } else {
        const fallback = getSuggestedListingCoordinates(ville, arrondissement || undefined, quartier || undefined);
        if (fallback) {
          finalLat = Number(fallback.lat.toFixed(7));
          finalLng = Number(fallback.lng.toFixed(7));
        }
      }

      const { data: listing, error: listingError } = await supabase
        .from("listings")
        .insert({
          owner_id: user.id,
          title: title.trim(),
          description: description.trim(),
          type: listingType,
          transaction,
          price_mga: priceNum,
          price_eur: Math.round((priceNum / 5050) * 100) / 100,
          surface: Number(surface) || null,
          rooms: showRooms ? (Number(rooms) || null) : null,
          bathrooms: showRooms ? (Number(bathrooms) || null) : null,
          toilets: showRooms && toilets ? Number(toilets) : null,
          ville,
          arrondissement: arrondissement || null,
          quartier: quartier || null,
          quartier_libre: quartierLibre || null,
          region,
          lat: finalLat,
          lng: finalLng,
          internal_ref: internalRef.trim() || null,
          is_new_program: isNewProgram,
          video_url: videoUrl.trim() || null,
          virtual_tour_url: virtualTourUrl.trim() || null,
          features: selectedFeatures as unknown as Json,
          status: "pending_review",
          publication_credits_charged: totalCost,
          pending_boost_types: [
            ...selectedBoosts,
            ...(agencySpotlightActive ? (["agency_spotlight"] as const) : []),
          ] as unknown as Json,
          expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (listingError) throw new Error(listingError.message);
      if (!listing) throw new Error("Annonce");

      const { ok, error: creditErr } = await consumeCredits(totalCost, "listing_publish", {
        refType: "listing_publish",
        refId: listing.id,
      });
      if (!ok) {
        await supabase.from("listings").delete().eq("id", listing.id);
        throw new Error(creditErr ?? "Crédits insuffisants");
      }
      await refreshProfile();

      if (photos.length > 0 && listing) {
        for (let i = 0; i < photos.length; i++) {
          const file = photos[i];
          const ext = file.name.split(".").pop() ?? "jpg";
          const path = `${listing.id}/${i}-${Date.now()}.${ext}`;
          const { error: uploadError } = await supabase.storage.from("listing-photos").upload(path, file);
          if (!uploadError) {
            const { data: urlData } = supabase.storage.from("listing-photos").getPublicUrl(path);
            await supabase.from("listing_photos").insert({
              listing_id: listing.id,
              url: urlData.publicUrl,
              position: i,
            });
          }
        }
      }

      photoPreviews.forEach((url) => URL.revokeObjectURL(url));
      await queryClient.invalidateQueries({ queryKey: ["my-listings", user.id] });
      toast.success(
        t(
          "publish.successModeration",
          "Annonce envoyée ! Elle sera visible après modération par notre équipe. Les boosts demandés seront examinés en même temps."
        )
      );
      navigate("/dashboard");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("publish.error", "Erreur lors de la publication");
      toast.error(message);
    }
    setPublishing(false);
  };

  const submitCreditPurchase = async () => {
    if (!user) {
      toast.error(t("publish.loginRequired", "Vous devez être connecté"));
      return;
    }
    const pack = creditPacks.find((p) => p.id === creditPackPurchase);
    if (!pack) {
      toast.error(t("publish.selectPack", "Choisissez un pack de crédits"));
      return;
    }
    if (!purchasePaymentMethod) {
      toast.error(t("publish.paymentProofRequired", "Choisissez un mode de paiement"));
      return;
    }
    if (!proofFile) {
      toast.error(t("publish.proofRequired", "Joignez une preuve de paiement (capture ou RIB annoté)"));
      return;
    }

    setPurchaseSubmitting(true);
    try {
      const ext = proofFile.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/${Date.now()}-proof.${ext}`;
      const { error: upErr } = await supabase.storage.from("payment-proofs").upload(path, proofFile);
      if (upErr) throw new Error(upErr.message);

      const { error: txErr } = await supabase.from("transactions").insert({
        user_id: user.id,
        amount_mga: pack.price_mga,
        method: purchasePaymentMethod as "bank_transfer" | "mvola" | "orange_money" | "airtel_money",
        status: "pending",
        reference: `CR-${pack.id}-${Date.now()}`,
        payment_proof_url: path,
        credit_pack_id: pack.id,
      });
      if (txErr) throw new Error(txErr.message);

      await queryClient.invalidateQueries({ queryKey: ["pending-credit-purchases", user.id] });
      await queryClient.invalidateQueries({ queryKey: ["credit-tx-history", user.id] });

      toast(
        t(
          "publish.creditRequestSent",
          "Demande enregistrée. Nos équipes valideront votre paiement et créditeront votre compte sous peu — les crédits ne sont pas encore disponibles."
        ),
        { duration: 6500 },
      );
      setProofFile(null);
      setCreditPackPurchase("");
      setPurchasePaymentMethod("");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
    setPurchaseSubmitting(false);
  };

  const progress = ((step + 1) / steps.length) * 100;

  return (
    <>
      <Helmet><title>{t("publish.title")} — ImmoNex</title></Helmet>
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-start gap-3 mb-6 rounded-2xl border border-border bg-secondary/30 p-4">
          <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground font-sans leading-relaxed">
            {t(
              "publish.moderationBanner",
              "ImmoNex vérifie chaque annonce avant publication. Coût : {cost} crédits par soumission (+ options boost). Description uniquement en français."
            ).replace("{cost}", String(LISTING_PUBLISH_CREDIT_COST))}
          </p>
        </div>

        <h1 className="font-serif text-3xl font-bold mb-6">{t("publish.title")}</h1>

        <div className="mb-8">
          <div className="flex justify-between mb-3 gap-1 overflow-x-auto pb-1">
            {steps.map((s, i) => (
              <div key={s} className="flex flex-col items-center min-w-[4.5rem]">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-sans font-semibold transition-colors ${i <= step ? "gradient-primary" : "bg-secondary text-muted-foreground"}`}
                  style={i <= step ? { color: "#FAFAFA" } : undefined}
                >
                  {i < step ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <span className={`text-[10px] md:text-xs font-sans mt-1 text-center ${i <= step ? "text-primary font-medium" : "text-muted-foreground"}`}>{s}</span>
              </div>
            ))}
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {stepErrors.length > 0 && (
          <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-xl">
            {stepErrors.map((err, i) => (
              <p key={i} className="text-sm text-destructive font-sans flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" /> {err}
              </p>
            ))}
          </div>
        )}

        {step === 0 && (
          <div className="space-y-5 bg-card rounded-2xl border border-border p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-sans">Transaction *</Label>
                <Select
                  value={transaction}
                  onValueChange={(v) => {
                    setTransaction(v as TransactionType);
                    setListingType((prev) => {
                      const allowed = new Set(listingTypesForTransaction(v));
                      return allowed.has(prev as ListingType) ? prev : "";
                    });
                  }}
                >
                  <SelectTrigger className="font-sans"><SelectValue placeholder={t("common.select")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vente">{t("search.sale", "Vente")}</SelectItem>
                    <SelectItem value="location">{t("search.rental", "Location")}</SelectItem>
                    <SelectItem value="location_vacances">{t("search.vacationRental", "Location vacances")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-sans">{t("publish.propertyType", "Type de bien")} *</Label>
                <Select value={listingType} onValueChange={(v) => setListingType(v as ListingType)} disabled={!transaction}>
                  <SelectTrigger className="font-sans"><SelectValue placeholder={t("common.select")} /></SelectTrigger>
                  <SelectContent>
                    {typeOptions.map((type) => (
                      <SelectItem key={type} value={type}>{LISTING_TYPE_LABELS[type]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
              <div>
                <p className="font-sans font-medium text-sm">{t("publish.newProgram", "Programme / neuf")}</p>
                <p className="text-xs text-muted-foreground font-sans">{t("publish.newProgramHint", "Cochez si le bien relève d’un promoteur ou d’un lot neuf.")}</p>
              </div>
              <Switch checked={isNewProgram} onCheckedChange={setIsNewProgram} />
            </div>
            <div className="space-y-2">
              <Label className="font-sans">{t("publish.internalRef", "Référence interne (optionnel)")}</Label>
              <Input value={internalRef} onChange={(e) => setInternalRef(e.target.value)} className="font-sans" maxLength={80} placeholder="REF-2026-042" />
            </div>
            <LocationPicker
              ville={ville}
              arrondissement={arrondissement}
              quartier={quartier}
              quartierLibre={quartierLibre}
              onVilleChange={setVille}
              onArrondissementChange={setArrondissement}
              onQuartierChange={setQuartier}
              onQuartierLibreChange={setQuartierLibre}
            />
            <div className="border-t border-border pt-5">
              <h3 className="font-serif font-semibold text-base mb-2">{t("publish.mapTitle", "Emplacement approximatif sur la carte")}</h3>
              <p className="text-xs text-muted-foreground font-sans mb-3">{t("publish.mapPublicHint", "La position affichée publiquement sera légèrement décalée pour préserver la confidentialité.")}</p>
              {!ville ? (
                <p className="text-sm text-muted-foreground font-sans">{t("publish.mapNeedVille", "Choisissez d’abord une ville.")}</p>
              ) : pinLat != null && pinLng != null && isValidListingCoordinates(pinLat, pinLng) ? (
                <PublishLocationMap lat={pinLat} lng={pinLng} onPositionChange={(la, ln) => { setPinLat(la); setPinLng(ln); }} />
              ) : (
                <p className="text-sm text-muted-foreground font-sans">{t("common.loading", "Chargement…")}</p>
              )}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4 bg-card rounded-2xl border border-border p-6">
            <div className="space-y-2">
              <Label className="font-sans">{t("publish.listingTitle", "Titre")} *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="font-sans" maxLength={120} />
            </div>
            <div className="space-y-2">
              <Label className="font-sans">{t("publish.descriptionFr", "Description (français)")} *</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="font-sans" rows={6} maxLength={5000} placeholder="Rédigez une description complète en français…" />
              <p className="text-xs text-muted-foreground font-sans">{description.trim().length}/5000 — min. 40 caractères</p>
            </div>
            <div className={`grid ${showRooms ? "grid-cols-2 md:grid-cols-3" : "grid-cols-2"} gap-4`}>
              <div className="space-y-2">
                <Label className="font-sans">{t("publish.priceMga", "Prix (Ar)")} *</Label>
                <Input type="number" value={priceMga} onChange={(e) => setPriceMga(e.target.value)} className="font-sans" min={0} />
              </div>
              <div className="space-y-2">
                <Label className="font-sans">{t("listing.surface")} (m²)</Label>
                <Input type="number" value={surface} onChange={(e) => setSurface(e.target.value)} className="font-sans" min={0} />
              </div>
              {showRooms && (
                <>
                  <div className="space-y-2"><Label className="font-sans">{t("listing.rooms")}</Label><Input type="number" value={rooms} onChange={(e) => setRooms(e.target.value)} className="font-sans" min={0} /></div>
                  <div className="space-y-2"><Label className="font-sans">{t("listing.bathrooms")}</Label><Input type="number" value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} className="font-sans" min={0} /></div>
                  <div className="space-y-2"><Label className="font-sans">{t("publish.toilets", "Toilettes / WC")}</Label><Input type="number" value={toilets} onChange={(e) => setToilets(e.target.value)} className="font-sans" min={0} /></div>
                </>
              )}
            </div>
            <div className="space-y-2">
              <Label className="font-sans">{t("listing.features", "Équipements")}</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {LISTING_EQUIPMENT_OPTIONS.map((f) => (
                  <label key={f} className="flex items-center gap-2 cursor-pointer font-sans text-sm">
                    <Checkbox checked={selectedFeatures.includes(f)} onCheckedChange={() => toggleFeature(f)} />
                    {f}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5 bg-card rounded-2xl border border-border p-6">
            <p className="text-sm text-muted-foreground font-sans">{t("publish.mainPhotoFirst", "La première image est la photo principale. Utilisez « Couverture » pour réorganiser.")}</p>
            <div className="border-2 border-dashed border-border rounded-2xl p-10 text-center">
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <input type="file" multiple accept="image/*" onChange={handlePhotoSelect} className="hidden" id="photo-upload" />
              <label htmlFor="photo-upload">
                <Button variant="outline" className="font-sans" type="button" asChild><span>{t("publish.chooseFiles", "Choisir des photos")}</span></Button>
              </label>
            </div>
            {photoPreviews.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {photoPreviews.map((url, i) => (
                  <div key={url} className="relative rounded-xl overflow-hidden border border-border aspect-square group">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 flex gap-1 p-1 bg-background/80">
                      {i > 0 && (
                        <Button type="button" size="sm" variant="secondary" className="text-[10px] h-7 flex-1 font-sans" onClick={() => setAsCover(i)}>Couverture</Button>
                      )}
                      <Button type="button" size="sm" variant="destructive" className="text-[10px] h-7 font-sans" onClick={() => removePhoto(i)}>×</Button>
                    </div>
                    {i === 0 && <span className="absolute top-1 left-1 text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded font-sans">Main</span>}
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-2">
              <Label className="font-sans">{t("publish.videoUrl", "Lien vidéo (YouTube, etc.) — optionnel")}</Label>
              <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} className="font-sans" placeholder="https://" />
            </div>
            <div className="space-y-2">
              <Label className="font-sans">{t("publish.tourUrl", "Visite virtuelle (URL) — optionnel")}</Label>
              <Input value={virtualTourUrl} onChange={(e) => setVirtualTourUrl(e.target.value)} className="font-sans" placeholder="https://" />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <Card className="rounded-2xl border-border">
              <CardHeader>
                <CardTitle className="font-serif flex items-center gap-2"><Coins className="h-5 w-5" /> {t("publish.creditsTitle", "Crédits & coût")}</CardTitle>
                <CardDescription className="font-sans">
                  {t("publish.yourBalance", "Votre solde")} : <strong>{creditsBalance}</strong> {t("publish.credits", "crédits")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 font-sans text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">{t("publish.costPublication", "Publication (modération)")}</span><span>{LISTING_PUBLISH_CREDIT_COST}</span></div>
                {selectedBoosts.map((b) => (
                  <div key={b} className="flex justify-between">
                    <span className="text-muted-foreground">{BOOST_LABELS_FR[b]}</span>
                    <span>{BOOST_CREDIT_COSTS[b]}</span>
                  </div>
                ))}
                {agencySpotlightActive && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("publish.agencySpotlight", "Spotlight agence (marque)")}</span>
                    <span>{AGENCY_SPOTLIGHT_CREDIT_COST}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold border-t pt-2"><span>Total</span><span>{totalCost}</span></div>
                {!canPublishWithCredits && (
                  <p className="text-destructive text-sm">{t("publish.needMoreCredits", "Solde insuffisant pour envoyer cette annonce avec les options choisies.")}</p>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border">
              <CardHeader>
                <CardTitle className="font-serif flex items-center gap-2"><Sparkles className="h-5 w-5" /> {t("publish.boostTitle", "Boosts (après validation)")}</CardTitle>
                <CardDescription className="font-sans">{t("publish.boostHonest", "Les boosts sélectionnés seront pris en compte lors de la mise en ligne par notre équipe, sous réserve de disponibilité.")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {BOOST_ORDER.map((b) => (
                  <label key={b} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 cursor-pointer font-sans text-sm">
                    <span className="flex items-center gap-2">
                      <Checkbox checked={selectedBoosts.includes(b)} onCheckedChange={() => toggleBoost(b)} />
                      <span>{BOOST_LABELS_FR[b]}</span>
                    </span>
                    <span className="text-muted-foreground whitespace-nowrap">{BOOST_CREDIT_COSTS[b]} cr.</span>
                  </label>
                ))}
              </CardContent>
            </Card>

            {profile?.agency_id && (
              <Card className="rounded-2xl border-border border-dashed border-primary/30">
                <CardHeader className="pb-2">
                  <CardTitle className="font-serif text-base">{t("publish.agencySpotlightTitle", "Visibilité agence")}</CardTitle>
                  <CardDescription className="font-sans text-xs">
                    {t(
                      "publish.agencySpotlightDesc",
                      "Renforce la présence de votre marque sur le portail (après validation). Réservé aux comptes agence.",
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <label className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 cursor-pointer font-sans text-sm">
                    <span className="flex items-center gap-2">
                      <Checkbox checked={agencySpotlight} onCheckedChange={(c) => setAgencySpotlight(c === true)} />
                      <span>{t("publish.agencySpotlightLabel", "Spotlight agence")}</span>
                    </span>
                    <span className="text-muted-foreground">{AGENCY_SPOTLIGHT_CREDIT_COST} cr.</span>
                  </label>
                </CardContent>
              </Card>
            )}

            <Card className="rounded-2xl border-border">
              <CardHeader>
                <CardTitle className="font-serif text-lg">{t("publish.summary", "Récapitulatif")}</CardTitle>
              </CardHeader>
              <CardContent className="font-sans text-sm space-y-1 text-muted-foreground">
                <p><strong className="text-foreground">{title || "—"}</strong></p>
                <p>{listingType ? LISTING_TYPE_LABELS[listingType as ListingType] : ""} · {transaction} · {ville}</p>
                <p>{photos.length} photo(s)</p>
              </CardContent>
            </Card>

            <Button
              type="button"
              onClick={handlePublish}
              disabled={publishing || !canPublishWithCredits}
              className="w-full gradient-primary border-0 font-sans text-lg py-6"
              style={{ color: "#FAFAFA" }}
            >
              {publishing ? t("common.loading") : t("publish.submitForReview", "Envoyer pour modération")}
            </Button>

            <div className="border-t border-border pt-6 space-y-4">
              <h3 className="font-serif font-semibold">{t("publish.buyCredits", "Acheter des crédits")}</h3>
              <p className="text-xs text-muted-foreground font-sans">{t("publish.buyCreditsHint", "Paiement manuel : transmettez le montant puis joignez une preuve. Aucun crédit n’est ajouté avant validation.")}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {creditPacks.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setCreditPackPurchase(p.id)}
                    className={`rounded-xl border p-3 text-left font-sans text-sm transition-colors ${creditPackPurchase === p.id ? "border-primary ring-1 ring-primary" : "border-border"}`}
                  >
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-muted-foreground">{p.credits_amount} crédits — {formatAriary(p.price_mga)}</p>
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                <Label className="font-sans">{t("publish.paymentMethod", "Mode de paiement")}</Label>
                <Select value={purchasePaymentMethod} onValueChange={setPurchasePaymentMethod}>
                  <SelectTrigger className="font-sans"><SelectValue placeholder={t("common.select")} /></SelectTrigger>
                  <SelectContent>
                    {MANUAL_PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-sans">{t("publish.proofFile", "Preuve de paiement (fichier)")}</Label>
                <Input type="file" accept="image/*,.pdf" className="font-sans" onChange={(e) => setProofFile(e.target.files?.[0] ?? null)} />
              </div>
              <Button type="button" variant="outline" className="w-full font-sans" disabled={purchaseSubmitting} onClick={submitCreditPurchase}>
                {purchaseSubmitting ? t("common.loading") : t("publish.submitCreditRequest", "Enregistrer la demande d’achat")}
              </Button>
            </div>
          </div>
        )}

        <div className="flex justify-between mt-8 gap-4">
          <Button type="button" variant="outline" onClick={() => { setStepErrors([]); setStep((s) => Math.max(0, s - 1)); }} disabled={step === 0} className="font-sans">
            {t("publish.prev")}
          </Button>
          {step < 3 && (
            <Button type="button" onClick={handleNext} className="gradient-primary border-0 font-sans" style={{ color: "#FAFAFA" }}>
              {t("publish.next")}
            </Button>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default PublishPage;
