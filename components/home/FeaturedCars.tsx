'use client'

import { ChevronRight, Heart } from 'lucide-react'
import { useState } from 'react'

interface Car {
  id: number
  name: string
  subtitle: string
  badge: string
  priceEur: string
  priceMga: string
  location: string
  images: string[]
}

const cars: Car[] = [
  {
    id: 1,
    name: 'Suzuki Jimny 2024',
    subtitle: 'Suzuki Jimny 2024',
    badge: 'Vente',
    priceEur: '51 465,35 €',
    priceMga: '259 900 000 Ar',
    location: 'Antananarivo',
    images: [
      'https://wtkedamrmtvdoippqanc.supabase.co/storage/v1/object/public/listing-photos/e40a4803-fd48-4e21-966f-cf60b2f6ba23/0-1777036055705.jpg',
      'https://wtkedamrmtvdoippqanc.supabase.co/storage/v1/object/public/listing-photos/e40a4803-fd48-4e21-966f-cf60b2f6ba23/1-1777036070675.webp',
      'https://wtkedamrmtvdoippqanc.supabase.co/storage/v1/object/public/listing-photos/e40a4803-fd48-4e21-966f-cf60b2f6ba23/2-1777036073164.jpeg',
    ],
  },
  {
    id: 2,
    name: 'Greatwall Tank 300 2025',
    subtitle: 'Greatwall Tank 300 2025',
    badge: 'Vente',
    priceEur: '28 900,00 €',
    priceMga: '146 000 000 Ar',
    location: 'Antananarivo',
    images: [
      'https://wtkedamrmtvdoippqanc.supabase.co/storage/v1/object/public/listing-photos/aaa11b77-8873-47f5-bd70-b430721aba47/0-1777033560242.webp',
      'https://wtkedamrmtvdoippqanc.supabase.co/storage/v1/object/public/listing-photos/aaa11b77-8873-47f5-bd70-b430721aba47/2-1777033571289.webp',
    ],
  },
  {
    id: 3,
    name: 'Toyota Land Cruiser 2025',
    subtitle: 'Toyota Land Cruiser 2025',
    badge: 'Vente',
    priceEur: '35 200,00 €',
    priceMga: '177 900 000 Ar',
    location: 'Toamasina',
    images: [
      'https://wtkedamrmtvdoippqanc.supabase.co/storage/v1/object/public/listing-photos/4db743ca-d296-4592-a42a-e7812cd17183/2-1777031129275.webp',
    ],
  },
  {
    id: 4,
    name: 'Haval H6 Gt 2024',
    subtitle: 'Haval H6 Gt 2024',
    badge: 'Location',
    priceEur: '42 000,00 €',
    priceMga: '212 000 000 Ar',
    location: 'Mahajanga',
    images: [
      'https://wtkedamrmtvdoippqanc.supabase.co/storage/v1/object/public/listing-photos/fe99014e-84b2-4a30-b2b1-143acd36832e/2-1777030541120.png',
      'https://wtkedamrmtvdoippqanc.supabase.co/storage/v1/object/public/listing-photos/fe99014e-84b2-4a30-b2b1-143acd36832e/0-1777030537043.avif',
    ],
  },
]

export function CarCard({ car }: { car: Car }) {
  const [favorited, setFavorited] = useState(false)
  const [currentImg, setCurrentImg] = useState(0)

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200 cursor-pointer">
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        <img
          src={car.images[currentImg]}
          alt={car.name}
          className="w-full h-full object-cover"
        />

        {/* Badge top-left */}
        <span className="absolute top-3 left-3 bg-white text-gray-700 text-xs font-semibold px-3 py-1 rounded-full shadow-sm">
          {car.badge}
        </span>

        {/* Favorite top-right */}
        <button
          onClick={(e) => { e.stopPropagation(); setFavorited(!favorited) }}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center hover:bg-white transition shadow-sm"
        >
          <Heart
            className={`w-4 h-4 transition-colors ${
              favorited ? 'fill-red-500 text-red-500' : 'text-gray-400'
            }`}
          />
        </button>

        {/* Dots indicator */}
        {car.images.length > 1 && (
          <div className="absolute bottom-2.5 left-0 right-0 flex justify-center gap-1.5">
            {car.images.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); setCurrentImg(i) }}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  i === currentImg ? 'bg-white w-3' : 'bg-white/60'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Price */}
        <p className="text-sky-600 font-bold text-lg leading-tight">
          {car.priceEur}
        </p>
        <p className="text-gray-400 text-sm mt-0.5">{car.priceMga}</p>

        {/* Divider */}
        <div className="my-3 h-px bg-gray-100" />

        {/* Name */}
        <p className="text-gray-900 font-semibold text-sm leading-snug">
          {car.name}
        </p>
        <p className="text-gray-400 text-xs mt-0.5">{car.subtitle}</p>

        {/* Divider */}
        <div className="my-3 h-px bg-gray-100" />

        {/* Location */}
        <p className="text-gray-400 text-sm">{car.location}</p>
      </div>
    </div>
  )
}

export default function FeaturedCars() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">
            Annonces récentes
          </p>
          <h2 className="text-3xl font-bold text-slate-900">
            Véhicules en vedette
          </h2>
        </div>
        <a href="#" className="flex items-center gap-1 text-sm font-semibold text-sky-600 hover:text-sky-700 transition-colors">
          Voir tout <ChevronRight className="w-4 h-4" />
        </a>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {cars.map((car) => (
          <CarCard key={car.id} car={car} />
        ))}
      </div>
    </section>
  )
}