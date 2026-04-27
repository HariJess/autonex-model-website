'use client'

import Image from 'next/image'
import { ChevronRight } from 'lucide-react'

const categories = [
  {
    label: 'SUV & Pick-up',
    image: '/category-icons/category-suv-pickup.svg',
  },
  {
    label: 'Berline',
    image: '/category-icons/category-sedan.svg',
  },
  {
    label: 'Citadine',
    image: '/category-icons/category-citadine.svg',
  },
  {
    label: 'Utilitaire',
    image: '/category-icons/category-utilitaire.svg',
  },
  {
    label: 'Moto',
    image: '/category-icons/category-scooter.svg',
  },
]

export default function VehicleCategories() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">
            Explorer rapidement
          </p>
          <h2 className="text-3xl font-bold text-slate-900">
            Catégories principales
          </h2>
        </div>
        <a
          href="#"
          className="flex items-center gap-1 text-sm font-semibold text-sky-600 hover:text-sky-700 transition-colors"
        >
          Voir tout <ChevronRight className="w-4 h-4" />
        </a>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {categories.map((cat) => (
          <button
            key={cat.label}
            type="button"
            className="group flex flex-col items-center gap-4 p-5 rounded-2xl border border-gray-200 bg-white hover:border-sky-400 hover:shadow-md transition-all duration-200 cursor-pointer"
          >
            {/* Icon circle */}
            <div className="w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center overflow-hidden group-hover:bg-sky-50 transition-colors duration-200">
              <img
                src={cat.image}
                alt={cat.label}
                className="w-20 h-14 object-contain"
              />
            </div>

            {/* Label */}
            <span className="text-sm font-medium text-gray-700 group-hover:text-sky-700 transition-colors">
              {cat.label}
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}