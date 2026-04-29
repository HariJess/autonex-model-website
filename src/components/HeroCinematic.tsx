import { useTranslation } from "react-i18next";
import HeroSearch from "@/components/HeroSearch";

export function HeroCinematic() {
  const { t } = useTranslation();

  return (
    <section
      aria-label={t("hero.aria", "Recherche de véhicule sur AutoNex")}
      className="relative isolate overflow-hidden bg-gradient-to-br from-navbar via-slate-900 to-navbar"
    >
      <picture className="absolute inset-0 -z-10">
        <source
          media="(max-width: 768px)"
          type="image/webp"
          srcSet="/hero/hero-mobile-640.webp 640w, /hero/hero-mobile-1080.webp 1080w, /hero/hero-mobile-1440.webp 1440w"
          sizes="100vw"
        />
        <source
          media="(max-width: 1280px)"
          type="image/webp"
          srcSet="/hero/hero-tablet-1024.webp 1024w, /hero/hero-tablet-2048.webp 2048w"
          sizes="100vw"
        />
        <source
          type="image/webp"
          srcSet="/hero/hero-desktop-1280.webp 1280w, /hero/hero-desktop-1920.webp 1920w, /hero/hero-desktop-2560.webp 2560w"
          sizes="100vw"
        />
        <img
          src="/hero/hero-desktop-1920.jpg"
          alt=""
          aria-hidden="true"
          loading="eager"
          fetchPriority="high"
          decoding="async"
          className="h-full w-full object-cover object-center"
        />
      </picture>

      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-b from-black/40 via-transparent to-transparent"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-t from-black/50 via-transparent to-transparent"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-b from-black/30 via-transparent to-black/40 md:hidden"
      />

      <div className="container mx-auto px-4 pt-8 md:pt-12 lg:pt-16 pb-12 md:pb-20 lg:pb-24">
        <div className="flex flex-col gap-8 md:gap-10 max-w-5xl mx-auto items-center">
          <div className="max-w-4xl text-center">
            <h1 className="font-geist font-bold text-4xl sm:text-5xl lg:text-6xl xl:text-6xl text-white leading-[1.1] tracking-tight">
              {t("hero.title.line1Prefix", "Trouvez le ")}
              <span className="text-sky-400">{t("hero.title.accent", "véhicule")}</span>
              {t("hero.title.line2Suffix", " qui vous correspond à Madagascar")}
            </h1>
            <p className="mt-4 md:mt-5 font-geist text-base sm:text-lg lg:text-xl xl:text-2xl text-white/90 font-medium tracking-wide">
              {t("hero.subtitle", "Le portail auto N°1 de Madagascar")}
            </p>
          </div>

          <div className="w-full max-w-4xl">
            <HeroSearch hideHeader hideBackground />
          </div>
        </div>
      </div>
    </section>
  );
}

export default HeroCinematic;
