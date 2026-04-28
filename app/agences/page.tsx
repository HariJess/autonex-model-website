'use client'

import { useState } from "react"
import { Search, ChevronDown, CheckSquare, Shield, Star } from "lucide-react"

import Header from '@/components/Header'
import Footer from '@/components/Footer'

const VILLES = ["Toutes les villes", "Antananarivo", "Toamasina", "Fianarantsoa", "Mahajanga", "Toliara"]

const PARTENAIRES = [
  {
    id: 1,
    nom: "OceanTrade",
    initiale: "O",
    ville: "Antananarivo, Andraharo",
    marques: ["Mazda", "Foton", "Infiniti"],
    verifie: true,
    partenaire: true,
    logo: null,
  },
]

const CONCESSIONNAIRES = [
  { id: 1, nom: "Test Auto Mada", description: "Aucune description.", initiale: "T", verifie: false },
  { id: 2, nom: "Test Mada V2", description: "Aucune description.", initiale: "T", verifie: false },
]

export default function ConcessionnairesPage() {
  const [search, setSearch] = useState("")
  const [ville, setVille] = useState("Toutes les villes")
  const [villeOpen, setVilleOpen] = useState(false)
  const [verifieOnly, setVerifieOnly] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* ── Hero Banner ── */}
        <div className="relative h-44 sm:h-52 rounded-2xl overflow-hidden">
          {/* Image de fond */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url('/agences/agence-bg.png')" }}
          />
          {/* Overlay sombre */}
          <div className="absolute inset-0 bg-black/55" />
          {/* Grain léger */}
          <div
            className="absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
              backgroundSize: "150px",
            }}
          />

          {/* Contenu */}
          <div className="relative h-full flex flex-col justify-center px-7 sm:px-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-px w-6 bg-sky-400" />
              <span className="text-sky-400 text-xs font-semibold uppercase tracking-widest">
                Réseau officiel
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight">
              Concessionnaires <span className="text-sky-300">AutoNex</span>
            </h1>
            <p className="text-white/70 mt-1.5 text-sm sm:text-base max-w-xl">
              Retrouvez nos partenaires officiels et les concessionnaires présents sur la plateforme.
            </p>
          </div>
        </div>

        {/* ── Filtres ── */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          {/* Recherche */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Nom de l'agence..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg bg-white text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400 transition"
            />
          </div>

          {/* Ville dropdown */}
          <div className="relative w-full sm:w-52">
            <button
              type="button"
              onClick={() => setVilleOpen((o) => !o)}
              className="w-full flex items-center justify-between gap-2 px-4 py-2.5 border border-gray-200 rounded-lg bg-white text-sm text-gray-700 hover:bg-gray-50 transition"
            >
              <span>{ville}</span>
              <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${villeOpen ? "rotate-180" : ""}`} />
            </button>
            {villeOpen && (
              <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
                {VILLES.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => { setVille(v); setVilleOpen(false) }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${v === ville ? "bg-sky-50 text-sky-600 font-medium" : "text-gray-700 hover:bg-gray-50"}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Checkbox */}
          <button
            type="button"
            onClick={() => setVerifieOnly((v) => !v)}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg bg-white text-sm text-gray-600 hover:bg-gray-50 transition whitespace-nowrap"
          >
            <div className={`h-4 w-4 rounded border-2 flex items-center justify-center transition-colors ${verifieOnly ? "bg-sky-500 border-sky-500" : "border-gray-300"}`}>
              {verifieOnly && (
                <svg viewBox="0 0 10 8" className="h-2.5 w-2.5" fill="none">
                  <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            Partenaires vérifiés uniquement
          </button>
        </div>

        {/* ── Partenaires officiels ── */}
        <div className="border border-gray-200 rounded-2xl bg-white overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Partenaires officiels AutoNex</h2>
              <p className="text-sm text-gray-500 mt-0.5">Des concessionnaires sélectionnés et mis en avant par AutoNex.</p>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 text-sky-700 text-xs font-semibold rounded-full border border-sky-200">
              <Shield className="h-3.5 w-3.5" />
              Partenaire AutoNex
            </span>
          </div>

          <div className="p-4 space-y-3">
            {PARTENAIRES.map((p) => (
              <div key={p.id} className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl hover:border-sky-200 hover:bg-sky-50/30 transition-colors group">
                {/* Logo */}
                <div className="h-14 w-14 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center shrink-0 text-lg font-bold text-gray-400">
                  {p.initiale}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-gray-900">{p.nom}</span>
                    {p.partenaire && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500 text-white text-[11px] font-semibold rounded-full">
                        <Shield className="h-3 w-3" />
                        Partenaire
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{p.ville}</p>
                  <p className="text-xs text-gray-400 mt-1">{p.marques.join(" • ")}</p>
                </div>

                <button
                  type="button"
                  className="text-sky-600 text-sm font-medium hover:text-sky-700 hover:underline whitespace-nowrap"
                >
                  Voir le stock
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── Annuaire ── */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Annuaire des concessionnaires</h2>
          <p className="text-sm text-gray-500 mb-4">{CONCESSIONNAIRES.length} concessionnaires trouvés.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CONCESSIONNAIRES.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl hover:border-sky-200 hover:shadow-sm transition-all cursor-pointer"
              >
                <div className="h-12 w-12 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center text-base font-bold text-gray-400 shrink-0">
                  {c.initiale}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-800 truncate">{c.nom}</p>
                  <p className="text-sm text-gray-400 truncate">{c.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
      <Footer />
    </div>
  )
}