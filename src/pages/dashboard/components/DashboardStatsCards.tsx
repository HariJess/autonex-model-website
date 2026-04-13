import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

type DashboardStat = {
  label: string;
  value: string;
  icon: LucideIcon;
  color: string;
};

type DashboardStatsCardsProps = {
  stats: DashboardStat[];
};

export function DashboardStatsCards({ stats }: DashboardStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="rounded-2xl">
          <CardContent className="flex items-center gap-4 p-4 md:p-6">
            <div className={`p-3 rounded-xl bg-secondary ${stat.color}`}>
              <stat.icon className="h-5 w-5 md:h-6 md:w-6" />
            </div>
            <div>
              <p className="text-xl md:text-2xl font-bold font-sans">{stat.value}</p>
              <p className="text-xs md:text-sm text-muted-foreground font-sans">{stat.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

