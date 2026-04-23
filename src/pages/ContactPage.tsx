import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { isValidPhoneNumber } from "libphonenumber-js";
import { Mail, MapPin, Clock } from "lucide-react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { buildCanonicalUrl } from "@/lib/seo";
import {
  submitContactErrorMessage,
  useSubmitContactMessage,
  type ContactSubject,
} from "@/hooks/useSubmitContactMessage";

const SUBJECT_OPTIONS: { value: ContactSubject; label: string }[] = [
  { value: "general", label: "Question générale" },
  { value: "technical", label: "Support technique" },
  { value: "dealers", label: "Concessionnaires" },
  { value: "partnerships", label: "Partenariats" },
  { value: "other", label: "Autre" },
];

const contactFormSchema = z.object({
  fullName: z.string().trim().min(2, "Nom complet requis (min 2 caractères).").max(100, "Max 100 caractères."),
  email: z.string().trim().email("Email invalide."),
  whatsappPhone: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || isValidPhoneNumber(v), {
      message: "Numéro invalide (format international attendu : +261…).",
    }),
  subject: z.enum(["general", "technical", "dealers", "partnerships", "other"]),
  message: z
    .string()
    .trim()
    .min(20, "Minimum 20 caractères.")
    .max(2000, "Maximum 2000 caractères."),
  consentGiven: z.literal(true, {
    errorMap: () => ({ message: "Vous devez accepter la politique de confidentialité." }),
  }),
  // Honeypot field — must stay empty. Not shown to real users.
  website: z.literal("").default(""),
});

type ContactFormErrors = Partial<Record<keyof z.infer<typeof contactFormSchema>, string>>;

const CONTACT_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  name: "Contact — AutoNex",
  url: buildCanonicalUrl("/contact"),
  mainEntity: {
    "@type": "Organization",
    name: "APLi SARLU",
    email: "info@autonex.mg",
    url: "https://autonex.mg",
  },
};

export default function ContactPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [subject, setSubject] = useState<ContactSubject | "">("");
  const [message, setMessage] = useState("");
  const [consentGiven, setConsentGiven] = useState(false);
  const [website, setWebsite] = useState(""); // honeypot
  const [errors, setErrors] = useState<ContactFormErrors>({});

  const mutation = useSubmitContactMessage();

  const charsRemaining = 2000 - message.trim().length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Honeypot: silently drop if filled. Bot-only.
    if (website.trim().length > 0) {
      toast.success("Merci, votre message a été envoyé. Nous vous répondrons sous 48h ouvrés.");
      return;
    }

    const parsed = contactFormSchema.safeParse({
      fullName,
      email,
      whatsappPhone: whatsappPhone.trim() || undefined,
      subject: subject || undefined,
      message,
      consentGiven,
      website: "",
    });

    if (!parsed.success) {
      const next: ContactFormErrors = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path[0] as keyof ContactFormErrors;
        if (path && !next[path]) next[path] = issue.message;
      }
      setErrors(next);
      return;
    }

    mutation.mutate(
      {
        fullName: parsed.data.fullName,
        email: parsed.data.email,
        whatsappPhone: parsed.data.whatsappPhone,
        subject: parsed.data.subject,
        message: parsed.data.message,
        consentGiven: true,
      },
      {
        onSuccess: () => {
          toast.success("Merci, votre message a été envoyé. Nous vous répondrons sous 48h ouvrés.");
          setFullName("");
          setEmail("");
          setWhatsappPhone("");
          setSubject("");
          setMessage("");
          setConsentGiven(false);
        },
        onError: (err) => {
          toast.error(submitContactErrorMessage(err.code));
        },
      },
    );
  };

  const canonical = buildCanonicalUrl("/contact");

  return (
    <>
      <Helmet>
        <title>Contact — AutoNex</title>
        <meta
          name="description"
          content="Contactez l'équipe AutoNex : questions générales, support technique, concessionnaires, partenariats. Réponse sous 48h ouvrés."
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={canonical} />
        <script type="application/ld+json">{JSON.stringify(CONTACT_JSON_LD)}</script>
      </Helmet>
      <Header />
      <main className="container mx-auto py-8 md:py-12">
        <header className="mb-6 md:mb-8 space-y-2">
          <h1 className="font-serif text-3xl md:text-4xl font-bold">Nous contacter</h1>
          <p className="font-sans text-muted-foreground max-w-2xl">
            Une question, une suggestion, un partenariat ? Notre équipe vous répond sous 48h ouvrés.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 md:gap-10">
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Honeypot — hidden from real users, kept in tab order=-1 + aria-hidden */}
            <div aria-hidden className="hidden">
              <label>
                Website
                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </label>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contact-fullName" className="font-sans">Nom complet *</Label>
              <Input
                id="contact-fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="font-sans"
                maxLength={100}
                required
              />
              {errors.fullName ? <p className="text-xs text-destructive font-sans">{errors.fullName}</p> : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contact-email" className="font-sans">Email *</Label>
              <Input
                id="contact-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="font-sans"
                maxLength={255}
                required
              />
              {errors.email ? <p className="text-xs text-destructive font-sans">{errors.email}</p> : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contact-whatsapp" className="font-sans">Téléphone WhatsApp (optionnel)</Label>
              <Input
                id="contact-whatsapp"
                value={whatsappPhone}
                onChange={(e) => setWhatsappPhone(e.target.value)}
                className="font-sans"
                placeholder="+261..."
                maxLength={30}
              />
              {errors.whatsappPhone ? (
                <p className="text-xs text-destructive font-sans">{errors.whatsappPhone}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contact-subject" className="font-sans">Sujet *</Label>
              <Select value={subject} onValueChange={(v) => setSubject(v as ContactSubject)}>
                <SelectTrigger id="contact-subject" className="font-sans">
                  <SelectValue placeholder="Choisir un sujet" />
                </SelectTrigger>
                <SelectContent>
                  {SUBJECT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.subject ? <p className="text-xs text-destructive font-sans">{errors.subject}</p> : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contact-message" className="font-sans">Message *</Label>
              <Textarea
                id="contact-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="font-sans"
                rows={6}
                maxLength={2000}
                required
              />
              <p className="text-xs text-muted-foreground font-sans">
                {charsRemaining} caractères restants (min 20).
              </p>
              {errors.message ? <p className="text-xs text-destructive font-sans">{errors.message}</p> : null}
            </div>

            <label className="flex items-start gap-2">
              <Checkbox
                id="contact-consent"
                checked={consentGiven}
                onCheckedChange={(v) => setConsentGiven(v === true)}
                className="mt-0.5"
              />
              <span className="text-sm font-sans text-foreground">
                J'accepte que mes données soient utilisées pour répondre à ma demande, conformément à la{" "}
                <Link to="/legal/confidentialite" className="text-primary hover:underline">
                  Politique de Confidentialité
                </Link>
                .
              </span>
            </label>
            {errors.consentGiven ? <p className="text-xs text-destructive font-sans">{errors.consentGiven}</p> : null}

            <Button type="submit" disabled={mutation.isPending} className="font-sans">
              {mutation.isPending ? "Envoi…" : "Envoyer le message"}
            </Button>
          </form>

          <aside className="space-y-4 rounded-2xl border border-border bg-card p-5 h-fit lg:sticky lg:top-24">
            <h2 className="font-serif text-lg font-bold">Autres canaux</h2>
            <p className="text-sm font-sans text-muted-foreground flex items-start gap-2">
              <Mail className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
              <a href="mailto:info@autonex.mg" className="text-primary hover:underline">
                info@autonex.mg
              </a>
            </p>
            <p className="text-sm font-sans text-muted-foreground flex items-start gap-2">
              <Clock className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
              Réponse sous 48h ouvrés
            </p>
            <p className="text-sm font-sans text-muted-foreground flex items-start gap-2">
              <MapPin className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
              <span>
                APLi SARLU — LOGT 51 CITE AMPEFILOHA CUA ANTANANARIVO I, 10101 Antananarivo Renivohitra, Analamanga,
                Madagascar
              </span>
            </p>
            <p className="text-xs font-sans text-muted-foreground border-t border-border pt-3">
              Pour toute question légale, consultez nos{" "}
              <Link to="/legal/mentions" className="text-primary hover:underline">
                Mentions légales
              </Link>
              .
            </p>
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}
