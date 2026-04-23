import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Brand = {
  id: string;
  label: string;
  href: string;
  logoAsset: string | null | undefined;
};

type Props = {
  brands: Brand[];
};

export default function BrandsRibbon({ brands }: Props) {
  const { t } = useTranslation();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(true);
  const [isHovering, setIsHovering] = useState(false);

  const updateScrollButtons = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    setCanScrollPrev(container.scrollLeft > 5);
    const maxScroll = container.scrollWidth - container.clientWidth;
    setCanScrollNext(container.scrollLeft < maxScroll - 5);
  }, []);

  const scrollBy = useCallback((direction: "prev" | "next") => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const isMobile = window.innerWidth < 768;
    const scrollAmount = isMobile ? 480 : 600;
    container.scrollBy({
      left: direction === "prev" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    updateScrollButtons();
    container.addEventListener("scroll", updateScrollButtons, { passive: true });
    window.addEventListener("resize", updateScrollButtons);
    return () => {
      container.removeEventListener("scroll", updateScrollButtons);
      window.removeEventListener("resize", updateScrollButtons);
    };
  }, [updateScrollButtons]);

  return (
    <div
      className="relative group"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Gradient fade gauche */}
      {canScrollPrev && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 md:w-20 z-10 bg-gradient-to-r from-white via-white/80 to-transparent"
        />
      )}

      {/* Gradient fade droit */}
      {canScrollNext && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 md:w-20 z-10 bg-gradient-to-l from-white via-white/80 to-transparent"
        />
      )}

      {/* Flèche gauche */}
      <button
        type="button"
        onClick={() => scrollBy("prev")}
        disabled={!canScrollPrev}
        aria-label={t("brands.scrollPrev", "Marques précédentes")}
        className={cn(
          "absolute left-2 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center h-10 w-10 rounded-full bg-white shadow-lg border border-border/70 transition-opacity duration-200 hover:bg-slate-50",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2",
          "disabled:opacity-0 disabled:pointer-events-none",
          isHovering ? "opacity-100" : "opacity-0"
        )}
      >
        <ChevronLeft className="h-5 w-5 text-foreground" />
      </button>

      {/* Flèche droite */}
      <button
        type="button"
        onClick={() => scrollBy("next")}
        disabled={!canScrollNext}
        aria-label={t("brands.scrollNext", "Marques suivantes")}
        className={cn(
          "absolute right-2 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center h-10 w-10 rounded-full bg-white shadow-lg border border-border/70 transition-opacity duration-200 hover:bg-slate-50",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2",
          "disabled:opacity-0 disabled:pointer-events-none",
          isHovering ? "opacity-100" : "opacity-0"
        )}
      >
        <ChevronRight className="h-5 w-5 text-foreground" />
      </button>

      {/* Container scrollable horizontal natif */}
      <div
        ref={scrollContainerRef}
        role="region"
        aria-label={t("home.popularBrandsRibbon", "Marques populaires")}
        className="flex gap-8 md:gap-10 overflow-x-auto scroll-smooth snap-x snap-mandatory scrollbar-hide px-4 md:px-6"
      >
        {brands.map((brand) => (
          <Link
            key={brand.id}
            to={brand.href}
            draggable={false}
            className="flex-[0_0_auto] snap-start rounded-lg px-4 py-3 flex flex-col items-center justify-center gap-2 text-center motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out hover:-translate-y-[2px] hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 w-[128px] md:w-[160px]"
            aria-label={`Voir les annonces ${brand.label}`}
          >
            {brand.logoAsset ? (
              <img
                src={brand.logoAsset}
                alt={`Logo ${brand.label}`}
                loading="lazy"
                decoding="async"
                draggable={false}
                className="h-12 md:h-14 w-auto max-w-[110px] md:max-w-[140px] object-contain opacity-90 hover:opacity-100 motion-safe:transition-opacity pointer-events-none"
              />
            ) : (
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-border/60 bg-background text-sm font-semibold tracking-wide text-foreground/85 pointer-events-none">
                {brand.label.slice(0, 2).toUpperCase()}
              </span>
            )}
            <span className="font-sans text-xs font-medium tracking-[0.01em] text-foreground/75 pointer-events-none">
              {brand.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
