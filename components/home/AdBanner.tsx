'use client'

interface AdBannerProps {
  href: string
  label: string
  mobileImageUrl: string
  desktopImageUrl: string
  altText?: string
  sponsoredLabel?: string
}

export default function AdBanner({
  href,
  label,
  mobileImageUrl,
  desktopImageUrl,
  altText = 'Publicité',
  sponsoredLabel = 'Sponsorisé',
}: AdBannerProps) {
  return (
    <section className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-4">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer sponsored"
        aria-label={label}
        className="relative block w-full overflow-hidden rounded-xl bg-muted/40 group"
      >
        {/* Banner image */}
        <div className="relative w-full aspect-[2.5/1] md:aspect-[8/1]">
          <picture>
            <source media="(max-width: 768px)" srcSet={mobileImageUrl} />
            <img
              src={desktopImageUrl}
              alt={altText}
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
            />
          </picture>
        </div>

        {/* Sponsored badge */}
        <span className="absolute right-3 top-3 z-10 rounded-full bg-black/60 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white backdrop-blur-sm">
          {sponsoredLabel}
        </span>
      </a>
    </section>
  )
}