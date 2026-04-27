'use client'

interface EstimationBannerProps {
  eyebrow?: string
  title?: string
  description?: string
  primaryLabel?: string
  primaryHref?: string
  secondaryLabel?: string
  secondaryHref?: string
}

export default function EstimationBanner({
  eyebrow = 'Différenciateur AutoMada',
  title = 'Estimation : votre repère avant négociation',
  description = 'Obtenez une fourchette argumentée, un niveau de confiance explicite et un rapport utile pour cadrer votre décision d\'achat ou de vente.',
  primaryLabel = "Lancer l'estimation",
  primaryHref = '/estimation',
  secondaryLabel = 'Comparer les annonces',
  secondaryHref = '/recherche',
}: EstimationBannerProps) {
  return (
    <section className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8">
      <div className="rounded-2xl border border-sky-500/25 bg-gradient-to-br from-white via-white to-sky-500/[0.06] p-5 md:p-7 shadow-[0_2px_20px_-12px_rgba(20,184,166,0.25)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">

          {/* Text block */}
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.14em] text-gray-400 font-semibold">
              {eyebrow}
            </p>
            <h2 className="mt-1 text-2xl md:text-[2rem] font-bold text-slate-900">
              {title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-500">
              {description}
            </p>
          </div>

          {/* CTA buttons */}
          <div className="flex flex-wrap gap-2.5 md:flex-shrink-0">
            <a
              href={primaryHref}
              className="inline-flex items-center justify-center gap-2 h-11 md:h-10 px-5 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold transition-colors whitespace-nowrap"
            >
              {primaryLabel}
            </a>
            <a
              href={secondaryHref}
              className="inline-flex items-center justify-center gap-2 h-11 md:h-10 px-5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold transition-colors whitespace-nowrap"
            >
              {secondaryLabel}
            </a>
          </div>

        </div>
      </div>
    </section>
  )
}