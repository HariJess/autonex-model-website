import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const links = [
  {
    to: "/admin/moderation",
    title: "Modération",
    desc: "Validation des annonces et opérations éditoriales.",
  },
  {
    to: "/admin/monetisation",
    title: "Monétisation",
    desc: "Paiements crédits, décisions et contrôle opérationnel.",
  },
  {
    to: "/admin/partenaires",
    title: "Partenaires",
    desc: "Campagnes publicitaires externes (placements partenaires).",
  },
  {
    to: "/admin/recherche",
    title: "Recherche",
    desc: "Signaux et analytics de recherche.",
  },
] as const;

function AdminOverviewPage() {
  return (
    <>
      <Helmet>
        <title>Admin — Vue d’ensemble — ImmoNex</title>
      </Helmet>
      <div className="space-y-5">
        <div>
          <h1 className="font-serif text-2xl font-bold">Vue d’ensemble admin</h1>
          <p className="text-sm text-muted-foreground font-sans mt-1">
            Espace interne séparé du compte utilisateur standard.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {links.map((item) => (
            <Link key={item.to} to={item.to}>
              <Card className="rounded-2xl hover:shadow-sm transition-shadow">
                <CardHeader>
                  <CardTitle className="font-serif text-lg">{item.title}</CardTitle>
                  <CardDescription className="font-sans">{item.desc}</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-primary font-sans">Ouvrir</CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}

export default AdminOverviewPage;
