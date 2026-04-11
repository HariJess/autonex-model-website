import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Check, Upload, MapPin, Zap, Heart, Mail, CreditCard } from "lucide-react";
import { regionNames } from "@/data/madagascar-regions";

const steps = ["Pack", "Détails", "Photos", "Localisation", "Options", "Paiement"];

const PublishPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [selectedPack, setSelectedPack] = useState("");

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
    { id: "orange", name: "Orange Money" },
    { id: "airtel", name: "Airtel Money" },
    { id: "card", name: "Carte bancaire (Stripe)" },
  ];

  const progress = ((step + 1) / steps.length) * 100;

  return (
    <>
      <Helmet><title>{t("publish.title")} — ImmoNex</title></Helmet>
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="font-serif text-3xl font-bold mb-6">{t("publish.title")}</h1>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between mb-3">
            {steps.map((s, i) => (
              <div key={s} className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-sans font-semibold transition-colors ${
                  i <= step ? 'gradient-primary' : 'bg-secondary text-muted-foreground'
                }`} style={i <= step ? { color: '#FAFAFA' } : undefined}>
                  {i < step ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <span className={`text-xs font-sans mt-1 hidden md:block ${i <= step ? 'text-primary font-medium' : 'text-muted-foreground'}`}>{s}</span>
              </div>
            ))}
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step 1: Pack */}
        {step === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {packs.map(pack => (
              <Card key={pack.id} className={`rounded-2xl cursor-pointer transition-all ${selectedPack === pack.id ? 'ring-2 ring-primary' : ''}`}
                onClick={() => setSelectedPack(pack.id)}>
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
                <Select><SelectTrigger className="font-sans"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="appartement">Appartement</SelectItem>
                    <SelectItem value="villa">Villa</SelectItem>
                    <SelectItem value="terrain">Terrain</SelectItem>
                    <SelectItem value="commercial">Local commercial</SelectItem>
                    <SelectItem value="bureau">Bureau</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-sans">Transaction</Label>
                <Select><SelectTrigger className="font-sans"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vente">Vente</SelectItem>
                    <SelectItem value="location">Location</SelectItem>
                    <SelectItem value="location_vacances">Location vacances</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label className="font-sans">Titre</Label><Input className="font-sans" placeholder="Ex: Villa moderne avec piscine" /></div>
            <div className="space-y-2"><Label className="font-sans">Description</Label><Textarea className="font-sans" rows={4} placeholder="Décrivez votre bien..." /></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2"><Label className="font-sans">Prix (Ar)</Label><Input type="number" className="font-sans" /></div>
              <div className="space-y-2"><Label className="font-sans">Surface (m²)</Label><Input type="number" className="font-sans" /></div>
              <div className="space-y-2"><Label className="font-sans">Chambres</Label><Input type="number" className="font-sans" /></div>
              <div className="space-y-2"><Label className="font-sans">Sdb</Label><Input type="number" className="font-sans" /></div>
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
              <Button variant="outline" className="font-sans">Choisir des fichiers</Button>
            </div>
          </div>
        )}

        {/* Step 4: Location */}
        {step === 3 && (
          <div className="space-y-4 bg-card rounded-2xl border border-border p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-sans">Région</Label>
                <Select><SelectTrigger className="font-sans"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>{regionNames.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label className="font-sans">Ville</Label><Input className="font-sans" /></div>
            </div>
            <div className="bg-secondary/50 rounded-2xl h-64 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <MapPin className="h-8 w-8 mx-auto mb-2" />
                <p className="font-sans text-sm">Cliquez sur la carte pour placer votre bien</p>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Options */}
        {step === 4 && (
          <div className="space-y-4">
            {upsells.map(u => (
              <Card key={u.id} className="rounded-2xl cursor-pointer hover:border-primary transition-colors">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="p-3 rounded-xl bg-accent/10 text-accent"><u.icon className="h-6 w-6" /></div>
                  <div className="flex-1">
                    <p className="font-sans font-semibold">{u.name}</p>
                    <p className="text-sm text-muted-foreground font-sans">{u.desc}</p>
                  </div>
                  <p className="font-bold font-sans text-primary">{u.price}</p>
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
              {paymentMethods.map(m => (
                <div key={m.id} className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-primary cursor-pointer transition-colors">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <span className="font-sans">{m.name}</span>
                </div>
              ))}
            </div>
            <Button onClick={() => { alert("Annonce publiée avec succès !"); navigate("/dashboard"); }}
              className="w-full gradient-primary border-0 font-sans text-lg py-6" style={{ color: '#FAFAFA' }}>
              {t("publish.submit")}
            </Button>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button variant="outline" onClick={() => setStep(s => s - 1)} disabled={step === 0} className="font-sans">
            {t("publish.prev")}
          </Button>
          {step < 5 && (
            <Button onClick={() => setStep(s => s + 1)} className="gradient-primary border-0 font-sans" style={{ color: '#FAFAFA' }}>
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
