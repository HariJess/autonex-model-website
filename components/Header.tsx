'use client'

import { useState } from "react"
import { User, Menu, X, LogIn, ChevronDown, Globe2, Plus } from "lucide-react"
import Image from "next/image"

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [mobileRentOpen, setMobileRentOpen] = useState(false)
  const [exploreOpen, setExploreOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)

  return (
    <header className="max-w-7xl mx-auto sticky top-0 z-50 border-b border-gray-100 bg-[#0a142f] backdrop-blur-md rounded-b-xl">
      <div className="flex items-center justify-between h-16 sm:h-[4.75rem] px-4 sm:px-8">

        {/* Logo */}
        <a href="/" className="flex items-center gap-2 flex-shrink-0">
          <Image src="/logo.png" alt="Autonex Logo" width={32} height={32} className="w-32 h-12" />
        </a>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1">
          {/* Explorer Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setExploreOpen(!exploreOpen)}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-sm font-semibold text-gray-500 transition-colors hover:text-slate-900 hover:bg-gray-50"
            >
              Explorer
              <ChevronDown className="h-4 w-4" />
            </button>
            {exploreOpen && (
              <div className="absolute left-0 mt-2 w-56 rounded-xl border border-gray-200 bg-white shadow-lg py-1 z-50">
                <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Acheter</a>
                <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Location longue durée</a>
                <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Location courte durée</a>
              </div>
            )}
          </div>

          <a href="/agences" className="text-sm font-semibold text-gray-500 hover:text-slate-900 transition-colors px-2.5 py-2 rounded-lg hover:bg-gray-50">
            Concessionnaires
          </a>
          <a href="#" className="text-sm font-semibold text-gray-500 hover:text-slate-900 transition-colors px-2.5 py-2 rounded-lg hover:bg-gray-50">
            Conseils
          </a>
          <a href="#" className="inline-flex items-center rounded-full border border-white/45 bg-white/10 px-3.5 py-1.5 text-sm font-semibold text-white transition-all opacity-80 hover:opacity-100">
            Estimation
          </a>
        </nav>

        {/* Desktop Right */}
        <div className="hidden lg:flex items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setLangOpen(!langOpen)}
              className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-gray-400 hover:bg-gray-50"
            >
              <Globe2 className="h-3.5 w-3.5" />
              FR · MGA
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {langOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl border border-gray-200 bg-white shadow-lg py-1 z-50">
                <div className="px-4 py-1.5 text-[11px] uppercase tracking-wide text-gray-400">Langue</div>
                <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Français</a>
                <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Malagasy</a>
                <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">English</a>
                <div className="my-1 h-px bg-gray-100" />
                <div className="px-4 py-1.5 text-[11px] uppercase tracking-wide text-gray-400">Devise</div>
                <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">MGA</a>
                <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">EUR</a>
              </div>
            )}
          </div>

          <button className="px-4 py-2 bg-sky-500 text-white rounded-full font-semibold text-sm hover:bg-sky-600 transition">
            Publier une annonce
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setAccountOpen(!accountOpen)}
              className="inline-flex items-center justify-center h-10 w-10 rounded-full text-gray-600 hover:bg-gray-100 border border-gray-200"
            >
              <User className="h-5 w-5" />
            </button>
            {accountOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-xl border border-gray-200 bg-white shadow-lg py-1 z-50">
                <a href="#" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  <LogIn className="mr-2 h-4 w-4" />
                  Connexion
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Menu Button */}
        <button
          type="button"
          className="lg:hidden inline-flex items-center justify-center h-10 w-10 rounded-xl border border-gray-200 bg-white text-gray-700"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="lg:hidden border-t border-gray-100 bg-white">
          <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-1.5">

            {/* Navigation items — same as desktop */}
            <a href="#" className="flex items-center min-h-11 px-3 py-2.5 rounded-xl bg-gray-50 text-sm font-medium text-gray-700 hover:bg-gray-100">
              Acheter
            </a>

            <div className="rounded-xl bg-gray-50">
              <button
                type="button"
                onClick={() => setMobileRentOpen(!mobileRentOpen)}
                className="w-full flex items-center justify-between min-h-11 px-3 py-2.5 text-sm font-medium text-gray-700"
              >
                <span>Louer</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${mobileRentOpen ? "rotate-180" : ""}`} />
              </button>
              {mobileRentOpen && (
                <div className="pb-2 px-2">
                  <a href="#" className="flex items-center min-h-10 px-3 py-2 rounded-lg bg-white text-sm text-gray-700">
                    Location longue durée
                  </a>
                  <a href="#" className="flex items-center min-h-10 px-3 py-2 rounded-lg bg-white text-sm text-gray-700 mt-1">
                    Location courte durée
                  </a>
                </div>
              )}
            </div>

            <a href="/agences" className="flex items-center min-h-11 px-3 py-2.5 rounded-xl bg-gray-50 text-sm font-medium text-gray-700 hover:bg-gray-100">
              Concessionnaires
            </a>
            <a href="#" className="flex items-center min-h-11 px-3 py-2.5 rounded-xl bg-gray-50 text-sm font-medium text-gray-700 hover:bg-gray-100">
              Conseils
            </a>
            <a href="#" className="flex items-center justify-between min-h-11 px-3 py-2.5 rounded-xl bg-sky-50 border border-sky-500/35 text-sm font-semibold text-sky-600">
              <span>Estimation</span>
              <span className="text-[10px] font-bold uppercase tracking-wide bg-sky-100 text-sky-700 px-2 py-0.5 rounded">Nouveau</span>
            </a>

            {/* Divider */}
            <div className="h-px bg-gray-100 my-1" />

            {/* Language + Currency */}
            <div className="grid grid-cols-2 gap-2">
              <button className="py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-lg bg-white">🇫🇷 Français</button>
              <button className="py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-lg bg-white">🇲🇬 Malagasy</button>
              <button className="py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-lg bg-white">🇬🇧 English</button>
              <button className="py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-lg bg-white">MGA · EUR</button>
            </div>

            {/* CTA & Login */}
            <button className="w-full flex items-center justify-center gap-2 mt-1 min-h-12 bg-sky-500 hover:bg-sky-600 text-white font-semibold text-sm rounded-xl transition">
              <Plus className="h-4 w-4" />
              Publier une annonce
            </button>
            <button className="w-full flex items-center justify-center gap-2 min-h-11 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">
              <LogIn className="h-4 w-4" />
              Connexion
            </button>
          </div>
        </div>
      )}
    </header>
  )
}