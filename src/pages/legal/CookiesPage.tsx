import { useCookieConsent } from "@/hooks/useCookieConsent";
import { Button } from "@/components/ui/button";
import { LegalLayout } from "./LegalLayout";
import { LEGAL_LAST_UPDATED } from "./legalConstants";

export default function CookiesPage() {
  const { openPreferences } = useCookieConsent();

  return (
    <LegalLayout
      title="Cookies — AutoNex"
      description="Cookies utilisés par AutoNex : techniques, analytics Google Analytics 4, fonctionnels, monitoring Sentry. Gestion du consentement."
      canonicalPath="/legal/cookies"
      lastUpdated={LEGAL_LAST_UPDATED}
    >
      <h1>Cookies</h1>

      <h2>Qu'est-ce qu'un cookie ?</h2>
      <p>
        Un cookie est un petit fichier texte déposé sur le terminal de l'utilisateur (ordinateur, smartphone, tablette) par le
        navigateur lors de la consultation d'un site web. Les cookies permettent de reconnaître le terminal, conserver des
        préférences, analyser l'usage, ou fournir des services personnalisés.
      </p>

      <h2>Cookies utilisés sur AutoNex</h2>

      <h3>1. Cookies techniques (obligatoires, pas de consent requis)</h3>
      <div className="overflow-x-auto">
        <table>
          <thead>
            <tr><th>Cookie</th><th>Finalité</th><th>Durée</th></tr>
          </thead>
          <tbody>
            <tr><td>Session Supabase Auth</td><td>Maintien de la connexion utilisateur</td><td>Session + 7 jours</td></tr>
            <tr><td>Beta Lock gate</td><td>Accès à la version beta de la plateforme</td><td>30 jours</td></tr>
            <tr><td>Vercel load balancer</td><td>Performance et haute disponibilité</td><td>Session</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        Ces cookies sont strictement nécessaires au fonctionnement du service et ne peuvent être désactivés sans empêcher
        l'utilisation d'AutoNex.
      </p>

      <h3>2. Cookies analytics (consent requis)</h3>
      <div className="overflow-x-auto">
        <table>
          <thead>
            <tr><th>Cookie</th><th>Finalité</th><th>Durée</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>Google Analytics 4 (<code>_ga</code>, <code>_ga_*</code>)</td>
              <td>Statistiques d'usage anonymisées (IP tronquée activée)</td>
              <td>13 mois maximum</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>Ces cookies ne sont déposés qu'avec le consentement explicite de l'utilisateur (via la bannière cookies).</p>

      <h3>3. Cookies fonctionnels (consent requis)</h3>
      <div className="overflow-x-auto">
        <table>
          <thead>
            <tr><th>Cookie</th><th>Finalité</th><th>Durée</th></tr>
          </thead>
          <tbody>
            <tr><td>Préférence langue</td><td>Mémorisation de la langue choisie</td><td>1 an</td></tr>
          </tbody>
        </table>
      </div>

      <h3>4. Cookies de monitoring (intérêt légitime, révocable)</h3>
      <div className="overflow-x-auto">
        <table>
          <thead>
            <tr><th>Cookie</th><th>Finalité</th><th>Durée</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>Sentry session replay</td>
              <td>Reproduction de bugs techniques, aucune donnée personnelle identifiante</td>
              <td>Session</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>Gestion des cookies</h2>
      <ul>
        <li>
          <strong>Bannière de consentement</strong> : lors de votre première visite, une bannière vous permet de choisir les
          catégories de cookies à accepter
        </li>
        <li>
          <strong>Bouton "Gérer mes cookies"</strong> : présent en pied de page, il vous permet de modifier vos choix à tout
          moment
        </li>
        <li>
          <strong>Paramètres navigateur</strong> : vous pouvez également configurer votre navigateur pour bloquer ou supprimer les
          cookies. Attention : le blocage des cookies techniques peut empêcher le fonctionnement d'AutoNex
        </li>
        <li>
          <strong>Effet différé</strong> : si vous révoquez votre consentement après qu'un cookie a été déposé, celui-ci ne sera
          plus redéposé lors de vos prochaines visites, mais son contenu déjà stocké peut persister jusqu'à expiration naturelle
        </li>
      </ul>

      <div className="not-prose flex justify-center py-2">
        <Button type="button" variant="outline" onClick={openPreferences} className="font-sans">
          Gérer mes préférences cookies
        </Button>
      </div>

      <h2>Politiques de confidentialité des prestataires tiers</h2>
      <ul>
        <li><a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">policies.google.com/privacy</a></li>
        <li><a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">vercel.com/legal/privacy-policy</a></li>
        <li><a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">supabase.com/privacy</a></li>
        <li><a href="https://sentry.io/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">sentry.io/privacy</a></li>
      </ul>
    </LegalLayout>
  );
}
