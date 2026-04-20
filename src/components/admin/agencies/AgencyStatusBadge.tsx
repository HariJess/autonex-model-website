import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgencyStatus } from "@/types/agency";
import { AGENCY_STATUS_LABELS_FR } from "@/types/agency";

const STATUS_CLASSES: Record<AgencyStatus, string> = {
  pending_review: "bg-gray-100 text-gray-700 border-gray-200",
  approved: "bg-green-100 text-green-800 border-green-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
  suspended: "bg-red-200 text-red-900 border-red-300",
};

interface AgencyStatusBadgeProps {
  status: AgencyStatus;
  verified?: boolean;
  className?: string;
}

export function AgencyStatusBadge({ status, verified, className }: AgencyStatusBadgeProps) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <span
        className={cn(
          "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-sans font-medium",
          STATUS_CLASSES[status],
        )}
      >
        {AGENCY_STATUS_LABELS_FR[status]}
      </span>
      {verified ? (
        <span
          className="inline-flex items-center gap-0.5 rounded-md border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-xs font-sans font-medium text-amber-800"
          title="Partenaire AutoNex vérifié"
        >
          <ShieldCheck className="h-3 w-3" /> Partenaire
        </span>
      ) : null}
    </span>
  );
}
