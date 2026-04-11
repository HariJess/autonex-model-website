import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LocationPicker from "@/components/LocationPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Check, Upload, CreditCard, AlertCircle } from "lucide-react";
import { LISTING_TYPES, LISTING_TYPE_LABELS } from "@/types/listing";
import { getRegionForVille } from "@/data/madagascar-locations";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ListingType, TransactionType } from "@/types/listing";

const steps = ["Pack", "Détails", "Photos", "Localisation", "Paiement"];

const PublishPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [selectedPack, setSelectedPack] = useState("");
  const [stepErrors, setStepErrors] = useState<string[]>([]);

  // Step 2 - Details
  const [listingType, setListingType] = useState<ListingType | "">("");
  const [transaction, setTransaction] = useState<TransactionType | "">("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceMga, setPriceMga] = useState("");
  const [surface, setSurface] = useState("");
  const [rooms, setRooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");

  // Step 3 - Photos
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

  // Step 4 - Location
  const [ville, setVille] = useState("");
  const [arrondissement, setArrondissement] = useState("");
  const [quartier, setQuartier] = useState("");
  const [quartierLibre, setQuartierLibre] = useState("");

  // Step 5 - Payment
  const [paymentMethod, setPaymentMethod] = useState("");
  const [publishing, setPublishing] = useState(false);

  // Fetch real packs from DB
  const { data: dbPacks = [] } = useQuery({
    queryKey: ["packs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("packs").select("*").order("price_mga", { ascending: true });
      if (error || !data || data.length === 0) {
        // Fallback to hardcoded packs if DB is empty
        return [
          { id: "decouverte", name: "Pack Découverte", price_mga: 0, listings_quota: 1, duration_days: 30, features: [] },
          { id: "pro", name: "Pack Pro", price_mga: 50000, listings_quota: 10, duration_days: 60, features: [] },
          { id: "agence", name: "Pack Agence", price_mga: 200000, listings_quota: null, duration_days: 30, features: [] },
        ];
      }
      return data;
    },
  });

  const selectedPackData = dbPacks.find((p) => p.id === selectedPack);
  const isFree = selectedPackData ? (selectedPackData.price_mga ?? 0) === 0 : selectedPack === "decouverte";

  const paymentMethods = [
    { id: "mvola", name: "MVola" },
    { id: "orange_money", name: "Orange Money" },
    { id: "airtel_money", name: "Airtel Money" },
    { id: "stripe", name: "Carte bancaire (Stripe)" },
  ];

  const progress = ((step + 1) / steps.length) * 100;

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      photoPreviews.forEach((url) => URL.revokeObjectURL(url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoPreviews]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).slice(0, 10);
      photoPreviews.forEach((url) => URL.revokeObjectURL(url));
      setPhotos(files);
      setPhotoPreviews(files.map((f) => URL.createObjectURL(f)));
    }
  };

  const validateStep = (s: number): string[] => {
    const errors: string[] = [];
    switch (s) {
      case 0:
        if (!selectedPack) errors.push("Veuillez choisir un pack");
        break;
      case 1:
        if (!listingType) errors.push("Type de bien requis");
        if (!transaction) errors.push("Type de transaction requis");
        if (!title.trim()) errors.push("Titre requis");
        if (title.trim().length < 5) errors.push("Le titre doit contenir au moins 5 caractères");
        if (!priceMga || Number(priceMga) <= 0) errors.push("Prix valide requis");
        break;
      case 2:
        break;
      case 3:
        if (!ville) errors.push("Ville requise");
        break;
      case 4:
        if (!isFree && !paymentMethod) errors.push("Méthode de paiement requise");
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
    setStep((s) => s + 1);
  };

  const handlePublish = async () => {
    const errors = validateStep(4);
    setStepErrors(errors);
    if (errors.length > 0) {
      toast.error(errors[0]);
      return;
    }
    if (!user) {
      toast.error("Vous devez être connecté");
      return;
    }
    setPublishing(true);

    try {
      const region = getRegionForVille(ville);
      const priceNum = Number(priceMga) || 0;

      // Determine initial status: free = active, paid = draft until payment confirmed
      const initialStatus = isFree ? "active" : "draft";

      const { data: listing, error: listingError } = await supabase
        .from("listings")
        .insert({
          owner_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
          type: listingType as ListingType,
          transaction: transaction as TransactionType,
          price_mga: priceNum,
          price_eur: Math.round((priceNum / 5050) * 100) / 100,
          surface: Number(surface) || null,
          rooms: Number(rooms) || null,
          bathrooms: Number(bathrooms) || null,
          ville,
          arrondissement: arrondissement || null,
          quartier: quartier || null,
          quartier_libre: quartierLibre || null,
          region,
          status: initialStatus,
          expires_at: new Date(Date.now() + (selectedPackData?.duration_days ?? 30) * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (listingError) throw new Error(listingError.message);

      // Upload photos
      if (photos.length > 0 && listing) {
        const uploadErrors: string[] = [];
        for (let i = 0; i < photos.length; i++) {
          const file = photos[i];
          const path = `${listing.id}/${i}-${file.name}`;
          const { error: uploadError } = await supabase.storage.from("listing-photos").upload(path, file);
          if (uploadError) {
            uploadErrors.push(`Photo ${i + 1}: ${uploadError.message}`);
          } else {
            const { data: urlData } = supabase.storage.from("listing-photos").getPublicUrl(path);
            await supabase.from("listing_photos").insert({
              listing_id: listing.id,
              url: urlData.publicUrl,
              position: i,
            });
          }
        }
        if (uploadErrors.length > 0) {
          toast.warning(`${uploadErrors.length} photo(s) n'ont pas pu être uploadées`);
        }
      }

      // Create transaction record for paid packs
      if (!isFree && paymentMethod && listing) {
        await supabase.from("transactions").insert({
          user_id: user.id,
          amount_mga: selectedPackData?.price_mga ?? 0,
          method: paymentMethod as "mvola" | "orange_money" | "airtel_money" | "stripe",
          status: "pending",
          reference: `TXN-${listing.id.slice(0, 8)}-${Date.now()}`,
        });
      }

      photoPreviews.forEach((url) => URL.revokeObjectURL(url));

      if (isFree) {
        toast.success("Annonce publiée avec succès !");
      } else {
        toast.success("Annonce créée ! Elle sera activée après confirmation du paiement.");
      }
      navigate("/dashboard");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur lors de la publication";
      toast.error(message);
    }
    setPublishing(false);
  };

  return (
    <>
      <Helmet><title>{t("publish.title")} — ImmoNex</title></Helmet>
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="font-serif text-3xl font-bold mb-6">{t("publish.title")}</h1>

        <div className="mb-8">
          <div className="flex justify-between mb-3">
            {steps.map((s, i) => (
              <div key={s} className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-sans font-semibold transition-colors ${i <= step ? "gradient-primary" : "bg-secondary text-muted-foreground"}`} style={i <= step ? { color: "#FAFAFA" } : undefined}>
                  {i < step ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <span className={`text-xs font-sans mt-1 hidden md:block ${i <= step ? "text-primary font-medium" : "text-muted-foreground"}`}>{s}</span>
              </div>
            ))}
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {stepErrors.length > 0 && (
          <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-xl">
            {stepErrors.map((err, i) => (
              <p key={i} className="text-sm text-destructive font-sans flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" /> {err}
              </p>
            ))}
          </div>
        )}

        {/* Step 1: Pack */}
        {step === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dbPacks.map((pack) => (
              <Card key={pack.id} className={`rounded-2xl cursor-pointer transition-all ${selectedPack === pack.id ? "ring-2 ring-primary" : ""}`} onClick={() => setSelectedPack(pack.id)}>
                <CardHeader>
                  <CardTitle className="font-serif text-lg">{pack.name}</CardTitle>
                  <CardDescription className="font-sans">
                    {pack.listings_quota ? `${pack.listings_quota} annonce${pack.listings_quota > 1 ? "s" : ""}` : "Illimité"}, {pack.duration_days ?? 30} jours
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold font-sans gradient-text">
                    {(pack.price_mga ?? 0) === 0 ? "Gratuit" : `${(pack.price_mga ?? 0).toLocaleString("fr-FR")} Ar`}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Step 2: Details */}
        {step === 1 && (
          <div className="space-y-4 bg-card rounded-2xl border border-border p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-sans">Type de bien *</Label>
                <Select value={listingType} onValueChange={(v) => setListingType(v as ListingType)}>
                  <SelectTrigger className="font-sans"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    {LISTING_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>{LISTING_TYPE_LABELS[type]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-sans">Transaction *</Label>
                <Select value={transaction} onValueChange={(v) => setTransaction(v as TransactionType)}>
                  <SelectTrigger className="font-sans"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vente">Vente</SelectItem>
                    <SelectItem value="location">Location</SelectItem>
                    <SelectItem value="location_vacances">Location vacances</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="font-sans">Titre *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="font-sans" placeholder="Ex: Villa moderne avec piscine" />
            </div>
            <div className="space-y-2">
              <Label className="font-sans">Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="font-sans" rows={4} placeholder="Décrivez votre bien..." />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2"><Label className="font-sans">Prix (Ar) *</Label><Input type="number" value={priceMga} onChange={(e) => setPriceMga(e.target.value)} className="font-sans" min={0} /></div>
              <div className="space-y-2"><Label className="font-sans">Surface (m²)</Label><Input type="number" value={surface} onChange={(e) => setSurface(e.target.value)} className="font-sans" min={0} /></div>
              <div className="space-y-2"><Label className="font-sans">Chambres</Label><Input type="number" value={rooms} onChange={(e) => setRooms(e.target.value)} className="font-sans" min={0} /></div>
              <div className="space-y-2"><Label className="font-sans">Sdb</Label><Input type="number" value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} className="font-sans" min={0} /></div>
            </div>
          </div>
        )}

        {/* Step 3: Photos */}
        {step === 2 && (
          <div className="bg-card rounded-2xl border border-border p-6">
            <div className="border-2 border-dashed border-border rounded-2xl p-12 text-center">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="font-sans font-semibold mb-1">Glissez vos photos ici</p>
              <p className="text-sm text-muted-foreground font-sans mb-4">ou cliquez pour sélectionner (max 10 photos)</p>
              <input type="file" multiple accept="image/*" onChange={handlePhotoSelect} className="hidden" id="photo-upload" />
              <label htmlFor="photo-upload">
                <Button variant="outline" className="font-sans" asChild><span>Choisir des fichiers</span></Button>
              </label>
            </div>
            {photoPreviews.length > 0 && (
              <div className="mt-4 grid grid-cols-5 gap-2">
                {photoPreviews.map((url, i) => (
                  <div key={i} className="aspect-square rounded-lg bg-secondary flex items-center justify-center overflow-hidden">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 4: Location */}
        {step === 3 && (
          <div className="space-y-4 bg-card rounded-2xl border border-border p-6">
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
          </div>
        )}

        {/* Step 5: Payment */}
        {step === 4 && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="bg-card rounded-2xl border border-border p-6">
              <h3 className="font-serif font-bold text-lg mb-3">Récapitulatif</h3>
              <div className="space-y-1 text-sm font-sans">
                <p><span className="text-muted-foreground">Pack :</span> {selectedPackData?.name ?? selectedPack}</p>
                <p><span className="text-muted-foreground">Bien :</span> {title}</p>
                <p><span className="text-muted-foreground">Type :</span> {listingType ? LISTING_TYPE_LABELS[listingType as ListingType] : "-"}</p>
                <p><span className="text-muted-foreground">Ville :</span> {ville}</p>
                <p><span className="text-muted-foreground">Photos :</span> {photos.length}</p>
              </div>
            </div>

            {isFree ? (
              <div className="bg-card rounded-2xl border border-border p-6 text-center">
                <Check className="h-12 w-12 text-success mx-auto mb-3" />
                <p className="font-serif font-bold text-lg">Pack gratuit — Aucun paiement requis</p>
              </div>
            ) : (
              <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
                <h3 className="font-serif font-bold text-lg">Mode de paiement *</h3>
                <p className="text-sm text-muted-foreground font-sans">
                  Montant : {(selectedPackData?.price_mga ?? 0).toLocaleString("fr-FR")} Ar
                </p>
                {paymentMethods.map((m) => (
                  <div key={m.id} onClick={() => setPaymentMethod(m.id)} className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${paymentMethod === m.id ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary"}`}>
                    <CreditCard className="h-5 w-5 text-primary" />
                    <span className="font-sans">{m.name}</span>
                    {paymentMethod === m.id && <Check className="h-4 w-4 text-success ml-auto" />}
                  </div>
                ))}
                <p className="text-xs text-muted-foreground font-sans">
                  Votre annonce sera activée après confirmation du paiement.
                </p>
              </div>
            )}
            <Button onClick={handlePublish} disabled={publishing} className="w-full gradient-primary border-0 font-sans text-lg py-6" style={{ color: "#FAFAFA" }}>
              {publishing ? t("common.loading") : t("publish.submit")}
            </Button>
          </div>
        )}

        <div className="flex justify-between mt-8">
          <Button variant="outline" onClick={() => { setStepErrors([]); setStep((s) => s - 1); }} disabled={step === 0} className="font-sans">
            {t("publish.prev")}
          </Button>
          {step < 4 && (
            <Button onClick={handleNext} className="gradient-primary border-0 font-sans" style={{ color: "#FAFAFA" }}>
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
