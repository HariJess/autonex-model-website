import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface AdminStatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  className?: string;
}

export function AdminStatCard({ title, value, subtitle, className }: AdminStatCardProps) {
  return (
    <Card className={cn("rounded-2xl", className)}>
      <CardContent className="p-4 space-y-1">
        <p className="text-xs font-sans uppercase tracking-wide text-muted-foreground">
          {title}
        </p>
        <p className="font-serif text-2xl font-bold leading-tight">{value}</p>
        {subtitle ? (
          <p className="text-xs font-sans text-muted-foreground">{subtitle}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
