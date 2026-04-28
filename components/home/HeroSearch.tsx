'use client'

import { useState, useRef, useEffect } from "react"
import { Search, MapPin, ChevronDown, Car, Banknote } from "lucide-react"

const LOCATION_TABS = [
  { label: "Location longue durée", value: "long" },
  { label: "Location courte durée", value: "short" },
]

export function HeroSearch() {
  const [activeTab, setActiveTab] = useState<"buy" | "long" | "short">("buy")
  const [locationOpen, setLocationOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setLocationOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const activeLocationLabel =
    activeTab === "long" ? "Location longue durée" : "Location courte durée"

  return (
    <div className="mt-24 md:mt-28 z-10 relative w-full">

      {/* ── Transaction Tabs ── */}
      <div className="flex items-center gap-2 mb-3 flex-wrap mx-1">

        {/* "Acheter" — always visible */}
        <button
          type="button"
          onClick={() => setActiveTab("buy")}
          className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all min-h-11 border ${
            activeTab === "buy"
              ? "bg-sky-500 text-white border-sky-500 shadow-lg"
              : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
          }`}
        >
          Acheter
        </button>

        {/* Desktop: two separate buttons */}
        {LOCATION_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveTab(tab.value as "long" | "short")}
            className={`hidden lg:block px-5 py-2.5 rounded-xl font-semibold text-sm transition-all min-h-11 border ${
              activeTab === tab.value
                ? "bg-sky-500 text-white border-sky-500 shadow-lg"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            }`}
          >
            {tab.label}
          </button>
        ))}

        {/* Mobile + Tablet: single dropdown button */}
        <div ref={dropdownRef} className="relative lg:hidden">
          <button
            type="button"
            onClick={() => setLocationOpen((o) => !o)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all min-h-11 border ${
              activeTab !== "buy"
                ? "bg-sky-500 text-white border-sky-500 shadow-lg"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            }`}
          >
            {activeTab !== "buy" ? activeLocationLabel : "Location"}
            <ChevronDown
              className={`h-4 w-4 transition-transform ${locationOpen ? "rotate-180" : ""}`}
            />
          </button>

          {locationOpen && (
            <div className="absolute top-full left-0 mt-1 w-52 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
              {LOCATION_TABS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.value as "long" | "short")
                    setLocationOpen(false)
                  }}
                  className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === tab.value
                      ? "bg-sky-50 text-sky-600"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Search Filter Card ── */}
      <div className="px-1 relative z-10">

        {/* ── Desktop (lg+): single row ── */}
        <div className="hidden lg:flex items-center gap-0 bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex-1 border-r border-gray-200 px-4 py-3">
            <label className="text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-1 block text-left">
              Type
            </label>
            <button
              type="button"
              className="w-full border-0 shadow-none p-0 h-7 text-sm text-left truncate flex items-center gap-2 text-gray-700"
            >
              <Car className="h-4 w-4 text-sky-500 shrink-0" />
              <span>All Types</span>
            </button>
          </div>

          <div className="flex-1 border-r border-gray-200 px-4 py-3 text-left hover:bg-gray-100 transition-colors cursor-pointer">
            <label className="text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-1 block">
              Location
            </label>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-sky-500 shrink-0" />
              <span className="text-sm text-gray-400 truncate">Antananarivo, Madagascar</span>
            </div>
          </div>

          <div className="flex-1 px-4 py-3 text-left hover:bg-gray-100 transition-colors cursor-pointer">
            <label className="text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-1 block">
              Prix
            </label>
            <div className="flex items-center gap-2">
              <Banknote className="h-4 w-4 text-sky-500 shrink-0" />
              <span className="text-sm text-gray-400 truncate">Tout budget</span>
            </div>
          </div>

          <div className="px-6">
            <button
              type="button"
              className="flex my-2 px-4 w-full bg-sky-500 hover:bg-sky-600 text-white border-0 font-semibold gap-2 h-12 rounded-xl items-center justify-center transition-colors"
            >
              <Search className="h-5 w-5" />
              Voir 8 annonces
            </button>
          </div>
        </div>

        {/* Recherche avancée — desktop only */}
        <button
          type="button"
          className="hidden lg:flex mt-2 w-full items-center justify-center gap-2 px-3 py-2 text-sm bg-white/20 text-white hover:bg-white/30 cursor-pointer rounded-lg transition-colors"
        >
          <span>Recherche avancée</span>
          <ChevronDown className="h-4 w-4" />
        </button>

        {/* ── Tablet (sm–lg): 3 filters in a row + button below ── */}
        <div className="hidden sm:flex lg:hidden flex-col gap-2">
          <div className="flex items-stretch gap-0 bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex-1 border-r border-gray-200 px-3 py-3 cursor-pointer hover:bg-gray-100 transition-colors">
              <label className="text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-1 block">
                Type
              </label>
              <div className="flex items-center gap-1.5">
                <Car className="h-4 w-4 text-sky-500 shrink-0" />
                <span className="text-sm text-gray-700 truncate">All Types</span>
              </div>
            </div>

            <div className="flex-1 border-r border-gray-200 px-3 py-3 cursor-pointer hover:bg-gray-100 transition-colors">
              <label className="text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-1 block">
                Lieu
              </label>
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-sky-500 shrink-0" />
                <span className="text-sm text-gray-400 truncate">Antananarivo</span>
              </div>
            </div>

            <div className="flex-1 px-3 py-3 cursor-pointer hover:bg-gray-100 transition-colors">
              <label className="text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-1 block">
                Prix
              </label>
              <div className="flex items-center gap-1.5">
                <Banknote className="h-4 w-4 text-sky-500 shrink-0" />
                <span className="text-sm text-gray-400 truncate">Tout budget</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="w-full bg-sky-500 hover:bg-sky-600 text-white font-semibold gap-2 h-12 rounded-xl flex items-center justify-center transition-colors"
          >
            <Search className="h-5 w-5" />
            Voir 8 annonces
          </button>

          <button
            type="button"
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm bg-white/20 text-white hover:bg-white/30 cursor-pointer rounded-lg transition-colors"
          >
            <span>Recherche avancée</span>
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>

        {/* ── Mobile (< sm): vertical stack ── */}
        <div className="sm:hidden space-y-2">
          <button
            type="button"
            className="w-full justify-start text-sm gap-2 min-h-11 px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 flex items-center text-gray-600"
          >
            <Car className="h-4 w-4 text-sky-500" />
            <span>Tous les types</span>
          </button>

          <button
            type="button"
            className="w-full justify-start text-sm gap-2 min-h-11 px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 flex items-center text-gray-600"
          >
            <MapPin className="h-4 w-4 text-sky-500" />
            <span>Antananarivo, Madagascar</span>
          </button>

          <button
            type="button"
            className="w-full justify-start text-sm gap-2 min-h-11 px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 flex items-center text-gray-600"
          >
            <Banknote className="h-4 w-4 text-sky-500 shrink-0" />
            <span>Tout budget</span>
          </button>

          <button
            type="button"
            className="w-full justify-center text-sm min-h-11 px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 flex items-center text-gray-600"
          >
            Plus de filtres
          </button>

          <button
            type="button"
            className="w-full bg-sky-500 hover:bg-sky-600 text-white border-0 font-semibold gap-2 h-12 min-h-12 rounded-lg flex items-center justify-center transition-colors"
          >
            <Search className="h-5 w-5" />
            Voir 8 annonces
          </button>
        </div>
      </div>

      {/* ── Trust signals ── */}
      <div className="flex flex-nowrap items-center justify-center gap-x-3 md:gap-x-8 text-white/80 text-[11px] md:text-sm px-2 mt-4">
        {[
          { short: "Vérifiés", long: "Annonces vérifiées" },
          { short: "Fiables", long: "Vendeurs fiables" },
          { short: "Gratuit", long: "Estimation gratuite" },
        ].map((item, i) => (
          <span key={i} className="inline-flex items-center gap-1.5 md:gap-2 whitespace-nowrap">
            <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" aria-hidden="true">
              <path d="M12 2 L4 5 V12 C4 17 7.5 21 12 22 C16.5 21 20 17 20 12 V5 L12 2Z" fill="white" />
              <path d="M8 12 L11 15 L16 9" stroke="#0a142f" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="md:hidden">{item.short}</span>
            <span className="hidden md:inline">{item.long}</span>
          </span>
        ))}
      </div>
    </div>
  )
}