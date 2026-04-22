import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useEffect, useRef, useState, useCallback, type MouseEvent as ReactMouseEvent, type WheelEvent as ReactWheelEvent } from "react";
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
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [userInteracted, setUserInteracted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartScroll, setDragStartScroll] = useState(0);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const [isHovering, setIsHovering] = useState(false);

  const stopAutoScroll = useCallback(() => {
    if (!userInteracted) setUserInteracted(true);
  }, [userInteracted]);

  const updateArrowVisibility = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setShowLeftArrow(el.scrollLeft > 8);
    setShowRightArrow(el.scrollLeft < maxScroll - 8);
  }, []);

  useEffect(() => {
    if (!userInteracted) return;
    updateArrowVisibility();
  }, [userInteracted, updateArrowVisibility]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const handleScroll = () => updateArrowVisibility();
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [updateArrowVisibility]);

  const handleMouseDown = (e: ReactMouseEvent) => {
    stopAutoScroll();
    const el = scrollerRef.current;
    if (!el) return;
    setIsDragging(true);
    setDragStartX(e.pageX - el.offsetLeft);
    setDragStartScroll(el.scrollLeft);
  };

  const handleMouseMove = (e: ReactMouseEvent) => {
    if (!isDragging) return;
    const el = scrollerRef.current;
    if (!el) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    const walk = (x - dragStartX) * 1.4;
    el.scrollLeft = dragStartScroll - walk;
  };

  const handleMouseUp = () => setIsDragging(false);
  const handleMouseLeave = () => {
    setIsDragging(false);
    setIsHovering(false);
  };

  const handleWheel = (e: ReactWheelEvent) => {
    stopAutoScroll();
    const el = scrollerRef.current;
    if (!el) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    }
  };

  const scrollBy = (direction: "left" | "right") => {
    stopAutoScroll();
    const el = scrollerRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.7;
    el.scrollBy({ left: direction === "left" ? -amount : amount, behavior: "smooth" });
  };

  const duplicatedBrands = userInteracted ? brands : [...brands, ...brands];

  return (
    <div
      className="relative group"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={handleMouseLeave}
    >
      {/* Gradient fade gauche */}
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-white to-transparent z-10 transition-opacity duration-200",
          userInteracted && showLeftArrow ? "opacity-100" : "opacity-0"
        )}
      />

      {/* Gradient fade droit */}
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-white to-transparent z-10 transition-opacity duration-200",
          !userInteracted || showRightArrow ? "opacity-100" : "opacity-0"
        )}
      />

      {/* Flèche gauche */}
      <button
        type="button"
        onClick={() => scrollBy("left")}
        aria-label="Défiler vers la gauche"
        className={cn(
          "absolute left-3 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-white border border-border shadow-md flex items-center justify-center text-foreground transition-opacity duration-200 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2",
          userInteracted && isHovering && showLeftArrow ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      {/* Flèche droite */}
      <button
        type="button"
        onClick={() => scrollBy("right")}
        aria-label="Défiler vers la droite"
        className={cn(
          "absolute right-3 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-white border border-border shadow-md flex items-center justify-center text-foreground transition-opacity duration-200 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2",
          userInteracted && isHovering && showRightArrow ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* Ruban scrollable */}
      <div
        ref={scrollerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        className={cn(
          "flex gap-10 overflow-x-auto scrollbar-hide",
          !userInteracted && "animate-scroll-x",
          userInteracted && "w-full",
          isDragging ? "cursor-grabbing select-none" : "cursor-grab",
          !userInteracted && "w-max"
        )}
        role="region"
        aria-label={t("home.popularBrandsRibbon", "Marques populaires, défilement horizontal")}
      >
        {duplicatedBrands.map((brand, idx) => (
          <Link
            key={`${brand.id}-${idx}`}
            to={brand.href}
            onClick={(e) => {
              if (isDragging) e.preventDefault();
            }}
            draggable={false}
            className="shrink-0 rounded-lg px-4 py-3 flex flex-col items-center justify-center gap-2 text-center motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out hover:-translate-y-[2px] hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 w-[144px]"
            aria-label={`Voir les annonces ${brand.label}`}
            {...(!userInteracted && idx >= brands.length ? { "aria-hidden": "true", tabIndex: -1 } : {})}
          >
            {brand.logoAsset ? (
              <img
                src={brand.logoAsset}
                alt={!userInteracted && idx >= brands.length ? "" : `Logo ${brand.label}`}
                loading="lazy"
                decoding="async"
                draggable={false}
                className="h-12 w-auto max-w-[120px] object-contain opacity-90 hover:opacity-100 motion-safe:transition-opacity pointer-events-none"
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
