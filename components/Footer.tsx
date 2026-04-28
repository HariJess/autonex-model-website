'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface CookieConsent {
  analytics: boolean
  functional: boolean
}

// ---------------------------------------------------------------------------
// Minimal cookie-consent hook (à remplacer par votre vrai hook)
// ---------------------------------------------------------------------------
function useCookieConsent() {
  const [preferencesOpen, setPreferencesOpen] = useState(false)
  const [consent, setConsent] = useState<CookieConsent>({ analytics: false, functional: false })

  return {
    consent,
    preferencesOpen,
    openPreferences: () => setPreferencesOpen(true),
    closePreferences: () => setPreferencesOpen(false),
    savePreferences: (next: CookieConsent) => setConsent(next),
  }
}

// ---------------------------------------------------------------------------
// Minimal CookieConsentModal placeholder (à remplacer par votre vrai composant)
// ---------------------------------------------------------------------------
function CookieConsentModal({
  open,
  onOpenChange,
  initial,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial: CookieConsent
  onSave: (next: CookieConsent) => void
}) {
  const [analytics, setAnalytics] = useState(initial.analytics)
  const [functional, setFunctional] = useState(initial.functional)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Gérer mes cookies</h2>

        <div className="space-y-3 mb-6">
          {[
            { label: 'Cookies fonctionnels', value: functional, set: setFunctional },
            { label: 'Cookies analytiques', value: analytics, set: setAnalytics },
          ].map(({ label, value, set }) => (
            <label key={label} className="flex items-center justify-between gap-4 cursor-pointer">
              <span className="text-sm text-gray-700">{label}</span>
              <button
                type="button"
                onClick={() => set(!value)}
                className={`relative w-11 h-6 rounded-full transition-colors ${value ? 'bg-teal-500' : 'bg-gray-200'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-5' : ''}`} />
              </button>
            </label>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => onSave({ analytics, functional })}
            className="flex-1 py-2.5 rounded-lg bg-teal-500 hover:bg-teal-600 text-sm font-medium text-white transition"
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------
const Footer = () => {
  const { consent, preferencesOpen, openPreferences, closePreferences, savePreferences } = useCookieConsent()

  const automotive = [
    { href: '/recherche?transaction=vente',    label: 'Acheter' },
    { href: '/recherche?transaction=location', label: 'Louer' },
    { href: '/agences',                        label: 'Agences' },
    { href: '/publier',                        label: 'Publier une annonce' },
  ]

  const information = [
    { href: '/conseils', label: 'Conseils' },
    { href: '/contact',  label: 'Contact' },
  ]

  const legal = [
    { href: '/legal/mentions',        label: 'Mentions légales' },
    { href: '/legal/confidentialite', label: 'Politique de confidentialité' },
    { href: '/legal/cgu',             label: "Conditions générales d'utilisation" },
    { href: '/legal/cookies',         label: 'Gestion des cookies' },
  ]

  return (
    <>
      <footer className="border-t border-white/10 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-10">

            {/* Brand */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-32 h-12 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Image src="/logo.png" alt="Autonex Logo" width={32} height={32} className="w-full h-full" />
                </div>
              </div>
              {/* Remplacer par : <Image src="/logo.png" alt="AutoMada" width={140} height={56} className="h-12 w-auto" /> */}
              <p className="text-sm leading-relaxed text-white/70">
                Le portail auto N°1 de Madagascar. Achetez, vendez et louez en toute confiance.
              </p>
            </div>

            {/* Automobile */}
            <div className="space-y-3">
              <h4 className="font-semibold text-base md:text-lg text-white">Automobile</h4>
              <nav className="flex flex-col gap-1">
                {automotive.map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    className="inline-flex min-h-10 items-center text-sm text-white/70 hover:text-white transition-colors"
                  >
                    {label}
                  </Link>
                ))}
              </nav>
            </div>

            {/* Information */}
            <div className="space-y-3">
              <h4 className="font-semibold text-base md:text-lg text-white">Information</h4>
              <nav className="flex flex-col gap-1">
                {information.map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    className="inline-flex min-h-10 items-center text-sm text-white/70 hover:text-white transition-colors"
                  >
                    {label}
                  </Link>
                ))}
              </nav>
            </div>

            {/* Légal */}
            <div className="space-y-3">
              <h4 className="font-semibold text-base md:text-lg text-white">Informations légales</h4>
              <nav className="flex flex-col gap-1">
                {legal.map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    className="inline-flex min-h-10 items-center text-sm text-white/70 hover:text-white transition-colors"
                  >
                    {label}
                  </Link>
                ))}
                <button
                  type="button"
                  onClick={openPreferences}
                  className="inline-flex min-h-10 items-center text-sm text-white/70 hover:text-white transition-colors text-left"
                >
                  Gérer mes cookies
                </button>
              </nav>
            </div>
          </div>

          {/* Bottom — copyright */}
          <div className="mt-10 md:mt-12 pt-6 border-t border-white/10 text-center text-sm text-white/50 space-y-1">
            <p>© 2026 APLi SARLU — Marque AutoMada. Tous droits réservés.</p>
            <p className="text-xs text-white/40">RCS Antananarivo 2025 B 00769 — NIF 4019287505</p>
          </div>

          {/* Bottom — credit */}
          <div className="mt-4 pt-4 border-t border-white/5 text-center text-xs text-white/40">
            <span>Conçu et développé par </span>
            <a
              href="https://www.linkedin.com/company/aplisarlu/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/60 hover:text-white hover:underline underline-offset-2 transition-colors"
            >
              APli
            </a>
          </div>
        </div>
      </footer>

      {/* Cookie modal — en dehors du <footer> pour éviter les z-index */}
      <CookieConsentModal
        open={preferencesOpen}
        onOpenChange={(open) => (open ? openPreferences() : closePreferences())}
        initial={{ analytics: consent.analytics, functional: consent.functional }}
        onSave={(next) => {
          savePreferences(next)
          closePreferences()
        }}
      />
    </>
  )
}

export default Footer