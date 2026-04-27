'use client';

import { motion } from 'framer-motion';
import { Car, Mail, Phone, MapPin, Facebook, Twitter, Instagram } from 'lucide-react';

export const Footer = () => {
  const footerSections = [
    {
      title: 'Parcourir',
      links: [
        { label: 'Tous les Véhicules', href: '#' },
        { label: 'Véhicules Neufs', href: '#' },
        { label: 'Occasions Certifiées', href: '#' },
        { label: 'Marques Populaires', href: '#' },
      ],
    },
    {
      title: 'Services',
      links: [
        { label: 'Financement Automobile', href: '#' },
        { label: 'Assurance Véhicule', href: '#' },
        { label: 'Maintenance et Réparation', href: '#' },
        { label: 'Échange Reprise', href: '#' },
      ],
    },
    {
      title: 'Entreprise',
      links: [
        { label: 'À Propos AutoNex', href: '#' },
        { label: 'Nous Rejoindre', href: '#' },
        { label: 'Blog et Actualités', href: '#' },
        { label: 'Contactez-Nous', href: '#' },
      ],
    },
    {
      title: 'Légal',
      links: [
        { label: 'Conditions Générales', href: '#' },
        { label: 'Politique Confidentialité', href: '#' },
        { label: 'Politique Cookies', href: '#' },
        { label: 'Mentions Légales', href: '#' },
      ],
    },
  ];

  const socialLinks = [
    { icon: Facebook, label: 'Facebook' },
    { icon: Twitter, label: 'Twitter' },
    { icon: Instagram, label: 'Instagram' },
  ];

  return (
    <footer className="relative bg-gradient-to-b from-slate-900/50 to-background border-t border-slate-800 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
          {/* Brand */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500">
                <Car className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gradient">AutoNex</h3>
                <p className="text-xs text-cyan-400">Madagascar</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              La plateforme de marché automobile la plus avancée et fiable de Madagascar.
            </p>

            {/* Contact Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-muted-foreground hover:text-blue-400 transition-colors cursor-pointer">
                <Phone className="w-4 h-4 flex-shrink-0 text-cyan-400" />
                +261 32 123 45 67
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground hover:text-blue-400 transition-colors cursor-pointer">
                <Mail className="w-4 h-4 flex-shrink-0 text-cyan-400" />
                info@autonex.mg
              </div>
              <div className="flex items-start gap-3 text-sm text-muted-foreground hover:text-blue-400 transition-colors cursor-pointer">
                <MapPin className="w-4 h-4 flex-shrink-0 text-cyan-400 mt-0.5" />
                <span>Antananarivo, Madagascar</span>
              </div>
            </div>
          </motion.div>

          {/* Links Sections */}
          {footerSections.map((section, sectionIndex) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: sectionIndex * 0.1 }}
              viewport={{ once: true }}
            >
              <h4 className="font-bold text-white mb-4">{section.title}</h4>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-blue-400 transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent mb-8" />

        {/* Bottom Section */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          {/* Copyright */}
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-sm text-muted-foreground text-center sm:text-left"
          >
            © 2024 AutoNex Madagascar. Tous droits réservés. Construit avec passion pour les automobilistes.
          </motion.p>

          {/* Social Links */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="flex items-center gap-4"
          >
            {socialLinks.map((social) => {
              const Icon = social.icon;
              return (
                <motion.a
                  key={social.label}
                  href="#"
                  whileHover={{ scale: 1.2, rotate: 5 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-muted-foreground hover:text-cyan-400 hover:border-cyan-500 transition-all"
                  title={social.label}
                >
                  <Icon className="w-4 h-4" />
                </motion.a>
              );
            })}
          </motion.div>
        </div>
      </div>

      {/* Background decorations */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl -z-10" />
    </footer>
  );
};
