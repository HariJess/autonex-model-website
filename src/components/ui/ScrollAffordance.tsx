import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

type ScrollAffordanceProps = {
  scrollRef: React.RefObject<HTMLDivElement>;
  scrollAmount?: number;
  className?: string;
};

export function ScrollAffordance({
  scrollRef,
  scrollAmount = 220,
  className,
}: ScrollAffordanceProps) {
  const { t } = useTranslation();
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);
  const [isPulsing, setIsPulsing] = useState(true);
  const hasInteractedRef = useRef(false);

  const update = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 5);
    const max = el.scrollWidth - el.clientWidth;
    setCanNext(el.scrollLeft < max - 5);
  }, [scrollRef]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    update();
    const onScroll = () => {
      update();
      if (!hasInteractedRef.current) {
        hasInteractedRef.current = true;
        setIsPulsing(false);
      }
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", update);
    };
  }, [update, scrollRef]);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsPulsing(false), 2500);
    return () => window.clearTimeout(timer);
  }, []);

  const scrollByAmount = (dir: "prev" | "next") => {
    const el = scrollRef.current;
    if (!el) return;
    hasInteractedRef.current = true;
    setIsPulsing(false);
    el.scrollBy({
      left: dir === "next" ? scrollAmount : -scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <div className={cn("md:hidden", className)} aria-hidden={!canPrev && !canNext}>
      {canPrev && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 bottom-0 w-10 z-10 bg-gradient-to-r from-background via-background/80 to-transparent"
        />
      )}
      {canNext && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 z-10 bg-gradient-to-l from-background via-background/80 to-transparent"
        />
      )}
      {canPrev && (
        <button
          type="button"
          onClick={() => scrollByAmount("prev")}
          aria-label={t("common.scrollPrev", "Précédent")}
          className="absolute left-1.5 top-1/2 -translate-y-1/2 z-20 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md border border-border/60 active:scale-95 transition-transform"
        >
          <ChevronLeft className="h-4 w-4 text-foreground/80" />
        </button>
      )}
      {canNext && (
        <button
          type="button"
          onClick={() => scrollByAmount("next")}
          aria-label={t("common.scrollNext", "Suivant")}
          className={cn(
            "absolute right-1.5 top-1/2 -translate-y-1/2 z-20 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md border border-border/60 active:scale-95 transition-transform",
            isPulsing && "motion-safe:animate-pulse",
          )}
        >
          <ChevronRight className="h-4 w-4 text-foreground/80" />
        </button>
      )}
    </div>
  );
}
