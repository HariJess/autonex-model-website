import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Phone, MessageSquare, Home, Zap, Pause, Trash2, CreditCard } from "lucide-react";
import { seedListings } from "@/data/seed-listings";
import { formatMGA } from "@/config/currency";

const Dashboard = () => {
  const { t } = useTranslation();
  const myListings = seedListings.slice(0, 5);

  const stats = [
    { label: t("dashboard.totalViews"), value: "2,847", icon: Eye, color: "text-primary" },
    { label: t("dashboard.contacts"), value: "34", icon: MessageSquare, color: "text-success" },
    { label: t("dashboard.phoneReveals"), value: "18", icon: Phone, color: "text-accent" },
    { label: t("dashboard.activeListings"), value: "5", icon: Home, color: "text-primary" },
  ];

  const leads = [
    { name: "Jean Rakoto", message: "Bonjour, je suis intéressé par votre villa à Ambatobe...", date: "2026-04-10", listing: "Villa de standing à Ambatobe" },
    { name: "Marie Rabe", message: "Est-ce que le prix est négociable ?", date: "2026-04-09", listing: "Appartement moderne à Ivandry" },
    { name: "Paul Tourist", message: "Hello, I'd like to book the bungalow for 2 weeks...", date: "2026-04-08", listing: "Bungalow tropical Ambatoloaka" },
  ];

  return (
    <>
      <Helmet><title>{t("dashboard.title")} — ImmoNex</title></Helmet>
      <Header />
      <div className="container mx-auto px-4 py-8 space-y-8">
        <h1 className="font-serif text-3xl font-bold">{t("dashboard.title")}</h1>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(stat => (
            <Card key={stat.label} className="rounded-2xl">
              <CardContent className="flex items-center gap-4 p-6">
                <div className={`p-3 rounded-xl bg-secondary ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-sans">{stat.value}</p>
                  <p className="text-sm text-muted-foreground font-sans">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Credits */}
        <Card className="rounded-2xl">
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-accent/10 text-accent">
                <CreditCard className="h-6 w-6" />
              </div>
              <div>
                <p className="font-bold font-sans text-lg">{t("dashboard.credits")}: 75 000 Ar</p>
                <p className="text-sm text-muted-foreground font-sans">Pack Pro actif</p>
              </div>
            </div>
            <Button className="gradient-primary border-0 font-sans" style={{ color: '#FAFAFA' }}>{t("dashboard.buyCredits")}</Button>
          </CardContent>
        </Card>

        {/* My listings */}
        <div>
          <h2 className="font-serif text-xl font-bold mb-4">{t("dashboard.myListings")}</h2>
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4 font-sans text-sm font-medium text-muted-foreground">Annonce</th>
                    <th className="text-left p-4 font-sans text-sm font-medium text-muted-foreground">Prix</th>
                    <th className="text-left p-4 font-sans text-sm font-medium text-muted-foreground">Statut</th>
                    <th className="text-left p-4 font-sans text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {myListings.map(listing => (
                    <tr key={listing.id} className="border-b border-border last:border-0">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img src={listing.images[0]} alt="" className="w-12 h-12 rounded-lg object-cover" />
                          <div>
                            <p className="font-sans text-sm font-medium">{listing.title}</p>
                            <p className="text-xs text-muted-foreground font-sans">{listing.city}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-sans text-sm">{formatMGA(listing.price_mga)}</td>
                      <td className="p-4"><Badge variant="secondary" className="font-sans text-xs">Active</Badge></td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" title="Boost"><Zap className="h-4 w-4 text-accent" /></Button>
                          <Button variant="ghost" size="icon" title="Pause"><Pause className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" title="Supprimer"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Leads */}
        <div>
          <h2 className="font-serif text-xl font-bold mb-4">{t("dashboard.leads")}</h2>
          <div className="space-y-3">
            {leads.map((lead, i) => (
              <Card key={i} className="rounded-2xl">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-sans font-semibold">{lead.name}</p>
                      <p className="text-xs text-muted-foreground font-sans mb-2">Re: {lead.listing}</p>
                      <p className="text-sm text-muted-foreground font-sans">{lead.message}</p>
                    </div>
                    <span className="text-xs text-muted-foreground font-sans flex-shrink-0">{lead.date}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default Dashboard;
