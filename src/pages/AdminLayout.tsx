import { Link, NavLink, Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/admin/overview", label: "Vue d’ensemble" },
  { to: "/admin/utilisateurs", label: "Utilisateurs" },
  { to: "/admin/moderation", label: "Modération" },
  { to: "/admin/agences", label: "Agences" },
  { to: "/admin/monetisation", label: "Monétisation" },
  { to: "/admin/partenaires", label: "Partenaires" },
  { to: "/admin/recherche", label: "Recherche" },
] as const;

function AdminLayout() {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="border-b border-border bg-background">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-serif text-lg font-bold">AutoNex Back-office</span>
            <span className="text-xs font-sans text-muted-foreground">Admin</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild className="font-sans">
              <Link to="/dashboard">Espace utilisateur</Link>
            </Button>
            <Button variant="outline" size="sm" className="font-sans" onClick={() => void signOut()}>
              Déconnexion
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
        <aside className="rounded-2xl border border-border bg-card p-3 h-fit">
          <nav className="space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "block rounded-lg px-3 py-2 text-sm font-sans transition-colors",
                    isActive ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-muted",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
