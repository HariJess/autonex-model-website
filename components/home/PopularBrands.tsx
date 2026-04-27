'use client'

import { useRef, useState } from 'react'
import { ChevronRight, ChevronLeft } from 'lucide-react'

const brands = [
  { label: 'Toyota',  logo: '/featured-makes/toyota.png' },
  { label: 'Haval',   logo: '/featured-makes/haval.png' },
  { label: 'Mazda',   logo: '/featured-makes/mazda.png' },
  { label: 'Isuzu',   logo: '/featured-makes/isuzu.png' },
  { label: 'Suzuki',  logo: '/featured-makes/suzuki.png' },
]

export default function PopularBrands() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: direction === 'right' ? 220 : -220, behavior: 'smooth' })
  }

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 8)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8)
  }

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">
            Découvrir
          </p>
          <h2 className="text-3xl font-bold text-slate-900">
            Marques populaires
          </h2>
        </div>
        <a href="#" className="flex items-center gap-1 text-sm font-semibold text-sky-600 hover:text-sky-700 transition-colors">
          Voir tout <ChevronRight className="w-4 h-4" />
        </a>
      </div>

      {/* Carousel wrapper */}
      <div className="relative">
        {/* Left arrow */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center hover:bg-gray-50 transition"
          >
            <ChevronLeft className="h-4 w-4 text-gray-600" />
          </button>
        )}

        {/* Scrollable row */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex gap-6 overflow-x-auto scroll-smooth pb-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {brands.map((brand) => (
            <button
              key={brand.label}
              type="button"
              className="group flex-shrink-0 flex flex-col items-center mx-14 cursor-pointer"
            >
              {/* Circle */}
              <div className="w-24 h-24 rounded-full border border-gray-200 bg-white flex items-center justify-center overflow-hidden group-hover:border-sky-400 group-hover:shadow-md transition-all duration-200">
                <img
                  src={brand.logo}
                  alt={brand.label}
                  className="w-14 h-14 object-contain"
                />
              </div>
              {/* Label */}
              <span className="text-sm font-medium text-gray-700 group-hover:text-sky-700 transition-colors">
                {brand.label}
              </span>
            </button>
          ))}
        </div>

        {/* Right arrow */}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center hover:bg-gray-50 transition"
          >
            <ChevronRight className="h-4 w-4 text-gray-600" />
          </button>
        )}
      </div>

      {/* Hide scrollbar for webkit */}
      <style>{`.flex::-webkit-scrollbar { display: none; }`}</style>
    </section>
  )
}