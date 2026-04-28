'use client'

import { HeroSearch } from './HeroSearch'

export default function HeroSection() {
  return (
    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 mt-6 pb-16">
      
      {/* Image de fond — overflow-hidden uniquement sur la card image */}
      <div className="relative h-[500px] sm:h-[560px] lg:h-[700px] bg-cover bg-center overflow-hidden rounded-3xl">
        {/* Background Image */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "url('/home/hero-bg.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="absolute inset-0 bg-black/35" />
        </div>

        {/* Contenu texte uniquement */}
        <div className="relative h-full flex flex-col justify-start p-6 sm:p-10 lg:p-14">
          <div className="mt-8 sm:mt-12">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight">
              Trouvez le <span className="text-sky-300">véhicule</span>
            </h1>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight">
              qui vous correspond
            </h1>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight">
              à Madagascar
            </h1>
            <p className="text-white/80 mt-4 text-base sm:text-lg">
              Le portail auto N°1 de Madagascar
            </p>
          </div>
          <HeroSearch />
        </div>
      </div>

      {/* HeroSearch — en dehors du overflow-hidden, chevauche le bas de la card */}
      {/* <div className="relative -mt-16 sm:-mt-40 z-10 px-2 sm:px-4 lg:px-0 mx-0 md:mx-4 lg:mx-12 bg-white rounded-2xl shadow-2xl border border-gray-100 py-4">
        <HeroSearch />
      </div> */}
    </div>
  )
}