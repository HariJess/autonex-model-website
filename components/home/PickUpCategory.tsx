'use client'

import { ChevronRight } from 'lucide-react'
import { CarCard } from './FeaturedCars'

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

export default function PickUpCategory() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">
            4x4 Pick-up
          </h2>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">
            Terrain, robustesse et usages mixtes route/piste.
          </p>
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