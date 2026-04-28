'use client'

import { Shield } from "lucide-react"

import Header from '@/components/Header'
import Footer from '@/components/Footer'


const CATEGORIES = ["Tous", "Achat auto", "Financement", "Entretien", "4×4 & utilitaires", "Électrique", "Assurance"]

const ARTICLES = [
  {
    id: 1,
    categorie: "Achat auto",
    date: "13/04/2026",
    lecture: "10 min",
    titre: "Acheter une voiture d'occasion à Madagascar : le guide complet pour éviter les pièges (2026)",
    extrait: "Prix du marché, canaux d'achat, checklist d'inspection, arnaques à éviter : tout ce...",
    image: "/conseils/achat-occasion.jpg",
    imageAlt: "Parking de voitures d'occasion",
  },
  {
    id: 2,
    categorie: "Financement",
    date: "28/03/2026",
    lecture: "9 min",
    titre: "Financement auto à Madagascar : comparer les banques et calculer son budget (guide 2026)",
    extrait: "Taux 2026 des grandes banques, calcul de capacité d'emprunt, comparaison cré...",
    image: "/conseils/financement.jpg",
    imageAlt: "Financement auto en concession",
  },
  {
    id: 3,
    categorie: "Entretien",
    date: "05/03/2026",
    lecture: "8 min",
    titre: "Entretien voiture à Madagascar : 12 règles d'or pour une fiabilité maximale",
    extrait: "Vidange tous les 5 000 km, batterie à 3-4 ans, signes d'alerte à connaître : le guide...",
    image: "/conseils/entretien.jpg",
    imageAlt: "Mécanicien en train de travailler",
  },
  {
    id: 4,
    categorie: "4×4 & utilitaires",
    date: "24/04/2026",
    lecture: "12 min",
    titre: "Comment choisir son 4x4 à Madagascar : le guide complet pour ne pas se tromper (2026)",
    extrait: "Hilux, Prado, L200, Ranger, Pajero : découvrez quel 4×4 convient vraiment à...",
    image: "/conseils/4x4.jpg",
    imageAlt: "4x4 dans le désert",
  },
]

export default function ConseilsAutoPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* ── Hero Banner ── */}
        <div className="relative h-44 sm:h-52 rounded-2xl overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url('/home/hero-bg.png')" }}
          />
          <div className="absolute inset-0 bg-black/55" />
          {/* Grain */}
          <div
            className="absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
              backgroundSize: "150px",
            }}
          />
          <div className="relative h-full flex flex-col justify-center px-7 sm:px-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-px w-6 bg-sky-400" />
              <span className="text-sky-400 text-xs font-semibold uppercase tracking-widest">
                Guides & astuces
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight">
              Conseils <span className="text-sky-300">auto</span>
            </h1>
            <p className="text-white/70 mt-1.5 text-sm sm:text-base max-w-xl">
              Nos guides pour acheter, entretenir et financer votre véhicule à Madagascar.
            </p>
          </div>
        </div>

        {/* ── Filtres catégories ── */}
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                cat === "Tous"
                  ? "bg-sky-500 text-white border-sky-500 shadow-sm"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* ── Grille articles ── */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Tous les conseils
            <span className="ml-2 text-sm font-normal text-gray-400">({ARTICLES.length} articles)</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {ARTICLES.map((article) => (
              <div
                key={article.id}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md hover:border-sky-100 transition-all group cursor-pointer"
              >
                {/* Image avec titre overlay */}
                <div className="relative h-44 overflow-hidden bg-gray-200">
                  <img
                    src={article.image}
                    alt={article.imageAlt}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      // Fallback gradient si image absente
                      const target = e.currentTarget
                      target.style.display = "none"
                      const parent = target.parentElement
                      if (parent) {
                        parent.style.background =
                          "linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)"
                      }
                    }}
                  />
                  {/* Gradient + titre */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3 flex items-end justify-between">
                    <p className="text-white font-bold text-base leading-tight pr-2">
                      {article.imageAlt}
                    </p>
                    <div className="h-7 w-7 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                      <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="none" stroke="currentColor" strokeWidth={2.5}>
                        <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Contenu */}
                <div className="p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full font-medium">
                      {article.categorie}
                    </span>
                    <span>{article.date}</span>
                    <span>•</span>
                    <span>{article.lecture}</span>
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 leading-snug group-hover:text-sky-600 transition-colors line-clamp-3">
                    {article.titre}
                  </h3>
                  <p className="text-xs text-gray-400 line-clamp-2">{article.extrait}</p>
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