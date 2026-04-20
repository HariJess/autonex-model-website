import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { AdminUserOverview } from "@/types/admin";

interface UserDetailHeaderProps {
  profile: AdminUserOverview;
}

export function UserDetailHeader({ profile }: UserDetailHeaderProps) {
  const displayName = profile.full_name?.trim() || "Sans nom";

  return (
    <div className="space-y-3">
      <Button variant="ghost" size="sm" asChild className="font-sans -ml-2">
        <Link to="/admin/utilisateurs" className="flex items-center gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Retour aux utilisateurs
        </Link>
      </Button>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-serif text-2xl font-bold">{displayName}</h1>
        <Badge variant="secondary" className="font-sans uppercase tracking-wide">
          {profile.role}
        </Badge>
        {profile.suspended ? (
          <Badge
            variant="destructive"
            className="font-sans uppercase tracking-wide"
          >
            Suspendu
          </Badge>
        ) : null}
      </div>

      {profile.email ? (
        <p className="font-sans text-sm text-muted-foreground">{profile.email}</p>
      ) : null}
    </div>
  );
}
