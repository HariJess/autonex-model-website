import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

type DashboardHeaderProps = {
  title: string;
  accountRoleLabel?: string | null;
  isAdmin: boolean;
  publishLabel: string;
};

export function DashboardHeader({
  title,
  accountRoleLabel,
  isAdmin,
  publishLabel,
}: DashboardHeaderProps) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h1 className="font-serif text-3xl font-bold">{title}</h1>
        {accountRoleLabel && <p className="text-sm text-muted-foreground font-sans mt-1">{accountRoleLabel}</p>}
      </div>
      <div className="flex items-center gap-2">
        {isAdmin && (
          <>
            <Link to="/admin/monetisation">
              <Button variant="outline" size="sm" className="font-sans">
                Admin monétisation
              </Button>
            </Link>
            <Link to="/admin/recherche">
              <Button variant="outline" size="sm" className="font-sans">
                Signaux recherche
              </Button>
            </Link>
          </>
        )}
        <Link to="/publier">
          <Button className="gradient-primary border-0 font-sans" style={{ color: "#FAFAFA" }}>
            <Plus className="h-4 w-4 mr-2" /> {publishLabel}
          </Button>
        </Link>
      </div>
    </div>
  );
}

