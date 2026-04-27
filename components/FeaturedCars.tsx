'use client'

import { Heart, ChevronRight } from 'lucide-react'
import { useState } from 'react'

interface Car {
  id: number
  name: string
  badge: string
  badgeColor: string
  price: string
  image: string
}

const cars: Car[] = [
  {
    id: 1,
    name: 'Toyota Fortuner 2.8 VRZ',
    badge: 'Featured',
    badgeColor: 'bg-sky-500',
    price: 'IDR 520,000,000',
    image: 'https://images.unsplash.com/photo-1605559424843-9e4c3ca4628d?w=500&q=80',
  },
  {
    id: 2,
    name: 'Honda CR-V 1.5 Turbo',
    badge: 'Low KM',
    badgeColor: 'bg-sky-500',
    price: 'IDR 415,000,000',
    image: 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=500&q=80',
  },
  {
    id: 3,
    name: 'BMW 320i M Sport',
    badge: 'Premium',
    badgeColor: 'bg-sky-500',
    price: 'IDR 635,000,000',
    image: 'https://images.unsplash.com/photo-1552820728-8ac41f1ce891?w=500&q=80',
  },
  {
    id: 4,
    name: 'Toyota Avanza 1.3 G',
    badge: 'Best Deal',
    badgeColor: 'bg-sky-500',
    price: 'IDR 185,000,000',
    image: 'https://images.unsplash.com/photo-1531584035769-efb8823b26df?w=500&q=80',
  },
]

export default function FeaturedCars() {
  const [favorites, setFavorites] = useState<number[]>([])

  const toggleFavorite = (id: number) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((fav) => fav !== id) : [...prev, id]
    )
  }

  return (
    <section className="max-w-7xl mx-auto px-6 py-16">
      {/* Header */}
      <div className="flex items-center justify-between mb-12">
        <h2 className="text-3xl font-bold text-slate-900">Featured Cars</h2>
        <a href="#" className="text-sky-500 font-medium hover:text-sky-600 flex items-center gap-1">
          View all cars <ChevronRight className="w-4 h-4" />
        </a>
      </div>

      {/* Cars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cars.map((car) => (
          <div
            key={car.id}
            className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-shadow"
          >
            {/* Image Container */}
            <div className="relative h-64 bg-gray-200 overflow-hidden">
              <img
                src={car.image}
                alt={car.name}
                className="w-full h-full object-cover hover:scale-105 transition-transform"
              />
              {/* Badge */}
              <div className={`absolute top-4 left-4 px-3 py-1 ${car.badgeColor} text-white text-xs font-semibold rounded-full`}>
                {car.badge}
              </div>
              {/* Heart Button */}
              <button
                onClick={() => toggleFavorite(car.id)}
                className="absolute top-4 right-4 w-8 h-8 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition"
              >
                <Heart
                  className={`w-4 h-4 ${
                    favorites.includes(car.id)
                      ? 'fill-red-500 text-red-500'
                      : 'text-gray-400'
                  }`}
                />
              </button>
            </div>

            {/* Content */}
            <div className="p-4">
              <h3 className="text-gray-900 font-semibold mb-2">{car.name}</h3>
              <p className="text-sky-500 font-bold text-lg">{car.price}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
