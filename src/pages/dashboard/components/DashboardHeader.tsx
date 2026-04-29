import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

type DashboardHeaderProps = {
  title: string;
  accountRoleLabel?: string | null;
  publishLabel: string;
};

export function DashboardHeader({
  title,
  accountRoleLabel,
  publishLabel,
}: DashboardHeaderProps) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h1 className="font-sans text-3xl font-bold">{title}</h1>
        {accountRoleLabel && <p className="text-sm text-muted-foreground font-sans mt-1">{accountRoleLabel}</p>}
      </div>
      <div className="flex items-center gap-2">
        <Link to="/publier">
          <Button variant="hero" className="font-sans">
            <Plus className="h-4 w-4 mr-2" /> {publishLabel}
          </Button>
        </Link>
      </div>
    </div>
  );
}

