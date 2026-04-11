import { useState } from "react";
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
import { Check, Upload, Zap, Heart, Mail, CreditCard } from "lucide-react";
import { getRegionForVille } from "@/data/madagascar-locations";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const steps = ["Pack", "Détails", "Photos", "Localisation", "Options", "Paiement"];

const PublishPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [selectedPack, setSelectedPack] = useState("");

  // Step 2 - Details
  const [listingType, setListingType] = useState("");
  const [transaction, setTransaction] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceMga, setPriceMga] = useState("");
  const [surface, setSurface] = useState("");
  const [rooms, setRooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");

  // Step 3 - Photos
  const [photos, setPhotos] = useState<File[]>([]);

  // Step 4 - Location
  const [ville, setVille] = useState("");
  const [arrondissement, setArrondissement] = useState("");
  const [quartier, setQuartier] = useState("");
  const [quartierLibre, setQuartierLibre] = useState("");

  // Step 5 - Upsells
  const [selectedUpsells, setSelectedUpsells] = useState<string[]>([]);

  // Step 6 - Payment
  const [paymentMethod, setPaymentMethod] = useState("");
  const [publishing, setPublishing] = useState(false);

  const packs = [
    { id: "decouverte", name: "Pack Découverte", price: "Gratuit", desc: "1 annonce, 30 jours", quota: 1 },
    { id: "pro", name: "Pack Pro", price: "50 000 Ar", desc: "10 annonces, 60 jours, stats avancées", quota: 10 },
    { id: "agence", name: "Pack Agence", price: "200 000 Ar/mois", desc: "Annonces illimitées, badge vérifié, dashboard", quota: -1 },
    { id: "promoteur", name: "Pack Promoteur", price: "Sur devis", desc: "Solutions sur mesure, pages projets dédiées", quota: -1 },
  ];

  const upsells = [
    { id: "boost", name: "Boost", price: "15 000 Ar", desc: "Votre annonce en tête des résultats pendant 7 jours", icon: Zap },
    { id: "coup_de_coeur", name: "Coup de cœur", price: "25 000 Ar", desc: "Badge coup de cœur + mise en avant homepage", icon: Heart },
    { id: "newsletter", name: "Newsletter", price: "30 000 Ar", desc: "Inclusion dans notre newsletter hebdomadaire", icon: Mail },
  ];

  const paymentMethods = [
    { id: "mvola", name: "MVola" },
    { id: "orange_money", name: "Orange Money" },
    { id: "airtel_money", name: "Airtel Money" },
    { id: "stripe", name: "Carte bancaire (Stripe)" },
  ];

  const progress = ((step + 1) / steps.length) * 100;

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setPhotos(Array.from(e.target.files).slice(0, 10));
    }
  };

  const toggleUpsell = (id: string) => {
    setSelectedUpsells((prev) => prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]);
  };

  const handlePublish = async () => {
    if (!user) return;
    setPublishing(true);

    try {
      const region = getRegionForVille(ville);
      const priceNum = Number(priceMga) || 0;

      // Create listing
      const { data: listing, error: listingError } = await supabase
        .from("listings")
        .insert({
          owner_id: user.id,
          title,
          description,
          type: listingType as any,
          transaction: transaction as any,
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
          status: "active" as const,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (listingError) throw listingError;

      // Upload photos
      if (photos.length > 0 && listing) {
        for (let i = 0; i < photos.length; i++) {
          const file = photos[i];
          const path = `${listing.id}/${i}-${file.name}`;
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

      // Create transaction record (mock)
      if (paymentMethod && selectedPack !== "decouverte") {
        await supabase.from("transactions").insert({
          user_id: user.id,
          amount_mga: selectedPack === "pro" ? 50000 : 200000,
          method: paymentMethod as any,
          status: "success" as const,
          reference: `TXN-${Date.now()}`,
        });
      }

      toast.success("Annonce publiée avec succès !");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la publication");
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

        {/* Step 1: Pack */}
        {step === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {packs.map((pack) => (
              <Card key={pack.id} className={`rounded-2xl cursor-pointer transition-all ${selectedPack === pack.id ? "ring-2 ring-primary" : ""}`} onClick={() => setSelectedPack(pack.id)}>
                <CardHeader>
                  <CardTitle className="font-serif text-lg">{pack.name}</CardTitle>
                  <CardDescription className="font-sans">{pack.desc}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold font-sans gradient-text">{pack.price}</p>
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
                <Label className="font-sans">Type de bien</Label>
                <Select value={listingType} onValueChange={setListingType}>
                  <SelectTrigger className="font-sans"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="appartement">Appartement</SelectItem>
                    <SelectItem value="villa">Villa</SelectItem>
                    <SelectItem value="maison">Maison</SelectItem>
                    <SelectItem value="terrain">Terrain</SelectItem>
                    <SelectItem value="local_commercial">Local commercial</SelectItem>
                    <SelectItem value="bureau">Bureau</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-sans">Transaction</Label>
                <Select value={transaction} onValueChange={setTransaction}>
                  <SelectTrigger className="font-sans"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vente">Vente</SelectItem>
                    <SelectItem value="location">Location</SelectItem>
                    <SelectItem value="location_vacances">Location vacances</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label className="font-sans">Titre</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} className="font-sans" placeholder="Ex: Villa moderne avec piscine" /></div>
            <div className="space-y-2"><Label className="font-sans">Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="font-sans" rows={4} placeholder="Décrivez votre bien..." /></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2"><Label className="font-sans">Prix (Ar)</Label><Input type="number" value={priceMga} onChange={(e) => setPriceMga(e.target.value)} className="font-sans" /></div>
              <div className="space-y-2"><Label className="font-sans">Surface (m²)</Label><Input type="number" value={surface} onChange={(e) => setSurface(e.target.value)} className="font-sans" /></div>
              <div className="space-y-2"><Label className="font-sans">Chambres</Label><Input type="number" value={rooms} onChange={(e) => setRooms(e.target.value)} className="font-sans" /></div>
              <div className="space-y-2"><Label className="font-sans">Sdb</Label><Input type="number" value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} className="font-sans" /></div>
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
            {photos.length > 0 && (
              <div className="mt-4 grid grid-cols-5 gap-2">
                {photos.map((f, i) => (
                  <div key={i} className="aspect-square rounded-lg bg-secondary flex items-center justify-center overflow-hidden">
                    <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
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

        {/* Step 5: Options */}
        {step === 4 && (
          <div className="space-y-4">
            {upsells.map((u) => (
              <Card key={u.id} className={`rounded-2xl cursor-pointer transition-colors ${selectedUpsells.includes(u.id) ? "ring-2 ring-primary" : "hover:border-primary"}`} onClick={() => toggleUpsell(u.id)}>
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="p-3 rounded-xl bg-accent/10 text-accent"><u.icon className="h-6 w-6" /></div>
                  <div className="flex-1">
                    <p className="font-sans font-semibold">{u.name}</p>
                    <p className="text-sm text-muted-foreground font-sans">{u.desc}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold font-sans text-primary">{u.price}</p>
                    {selectedUpsells.includes(u.id) && <Check className="h-5 w-5 text-success" />}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Step 6: Payment */}
        {step === 5 && (
          <div className="space-y-4">
            <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
              <h3 className="font-serif font-bold text-lg">Mode de paiement</h3>
              {paymentMethods.map((m) => (
                <div key={m.id} onClick={() => setPaymentMethod(m.id)} className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${paymentMethod === m.id ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary"}`}>
                  <CreditCard className="h-5 w-5 text-primary" />
                  <span className="font-sans">{m.name}</span>
                  {paymentMethod === m.id && <Check className="h-4 w-4 text-success ml-auto" />}
                </div>
              ))}
            </div>
            <Button onClick={handlePublish} disabled={publishing} className="w-full gradient-primary border-0 font-sans text-lg py-6" style={{ color: "#FAFAFA" }}>
              {publishing ? "Publication en cours..." : t("publish.submit")}
            </Button>
          </div>
        )}

        <div className="flex justify-between mt-8">
          <Button variant="outline" onClick={() => setStep((s) => s - 1)} disabled={step === 0} className="font-sans">
            {t("publish.prev")}
          </Button>
          {step < 5 && (
            <Button onClick={() => setStep((s) => s + 1)} className="gradient-primary border-0 font-sans" style={{ color: "#FAFAFA" }}>
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
