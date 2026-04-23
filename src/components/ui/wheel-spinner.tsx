import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type WheelSpinnerSize = "sm" | "md" | "lg" | "xl";
type WheelSpinnerVariant = "primary" | "white" | "muted";

interface WheelSpinnerProps extends React.HTMLAttributes<SVGSVGElement> {
  size?: WheelSpinnerSize;
  variant?: WheelSpinnerVariant;
}

const sizeMap: Record<WheelSpinnerSize, string> = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
  xl: "h-12 w-12",
};

const variantMap: Record<WheelSpinnerVariant, { tire: string; rim: string; hub: string }> = {
  primary: {
    tire: "stroke-primary",
    rim: "fill-primary/20 stroke-primary",
    hub: "fill-primary",
  },
  white: {
    tire: "stroke-white",
    rim: "fill-white/20 stroke-white",
    hub: "fill-white",
  },
  muted: {
    tire: "stroke-muted-foreground",
    rim: "fill-muted-foreground/20 stroke-muted-foreground",
    hub: "fill-muted-foreground",
  },
};

export const WheelSpinner = forwardRef<SVGSVGElement, WheelSpinnerProps>(
  ({ size = "md", variant = "primary", className, "aria-label": ariaLabel = "Chargement en cours", ...props }, ref) => {
    const colors = variantMap[variant];
    return (
      <svg
        ref={ref}
        role="status"
        aria-label={ariaLabel}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("animate-spin", sizeMap[size], className)}
        {...props}
      >
        {/* Tire (outer) */}
        <circle cx="24" cy="24" r="21" strokeWidth="4" className={colors.tire} />
        {/* Rim */}
        <circle cx="24" cy="24" r="14" strokeWidth="2" className={colors.rim} />
        {/* Spokes (5 branches, r=13 from center, round caps kiss rim at r=14) */}
        <g className={colors.tire} strokeWidth="2" strokeLinecap="round">
          <line x1="24" y1="24" x2="24" y2="11" />
          <line x1="24" y1="24" x2="36.36" y2="19.98" />
          <line x1="24" y1="24" x2="31.64" y2="34.52" />
          <line x1="24" y1="24" x2="16.36" y2="34.52" />
          <line x1="24" y1="24" x2="11.64" y2="19.98" />
        </g>
        {/* Hub (center nut) */}
        <circle cx="24" cy="24" r="3" className={colors.hub} />
      </svg>
    );
  },
);

WheelSpinner.displayName = "WheelSpinner";
