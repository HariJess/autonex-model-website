'use client';

import { motion } from 'framer-motion';
import { useRef } from 'react';

const BRANDS = [
  { name: 'Toyota', logo: '🚗' },
  { name: 'Honda', logo: '🚗' },
  { name: 'BMW', logo: '🏎️' },
  { name: 'Mercedes-Benz', logo: '🏎️' },
  { name: 'Audi', logo: '🏎️' },
  { name: 'Mitsubishi', logo: '🚗' },
  { name: 'Nissan', logo: '🚗' },
  { name: 'Hyundai', logo: '🚗' },
  { name: 'Kia', logo: '🚗' },
  { name: 'Subaru', logo: '🚗' },
];

export const BrandShowcase = () => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      scrollContainerRef.current.scrollBy({
        left: direction === 'right' ? scrollAmount : -scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <section className="relative py-16 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            Marques <span className="text-gradient">Partenaires</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Nous partenons avec plus de 50 marques automobiles mondiales pour vous offrir le meilleur choix.
          </p>
        </motion.div>

        {/* Carousel */}
        <div className="relative group">
          <motion.div
            ref={scrollContainerRef}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="flex gap-8 overflow-x-auto pb-6 scroll-smooth scrollbar-hide"
          >
            {BRANDS.map((brand, index) => (
              <motion.div
                key={brand.name}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.05 }}
                className="flex-shrink-0 group/brand"
              >
                <div className="relative p-8 rounded-2xl border border-slate-800 bg-slate-900/50 hover:border-cyan-500/50 transition-all cursor-pointer min-w-40 flex flex-col items-center justify-center h-40 glass-dark hover:bg-slate-800/80">
                  {/* Grayscale to color effect */}
                  <motion.div
                    className="text-5xl mb-3 transition-all grayscale group-hover/brand:grayscale-0"
                  >
                    {brand.logo}
                  </motion.div>

                  <h3 className="text-center font-bold text-white text-sm">
                    {brand.name}
                  </h3>

                  {/* Glow effect */}
                  <motion.div
                    animate={{
                      opacity: [0, 0.5, 0],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                    }}
                    className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/20 to-cyan-500/20 -z-10"
                  />
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Navigation buttons */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-5 z-20 w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
          >
            ←
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-5 z-20 w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
          >
            →
          </motion.button>

          {/* Gradient fade */}
          <div className="absolute right-0 top-0 h-full w-32 bg-gradient-to-l from-background to-transparent pointer-events-none z-10" />
        </div>
      </div>

      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl -z-10" />
    </section>
  );
};
