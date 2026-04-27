'use client';

import { motion } from 'framer-motion';
import { Heart, Zap, Gauge, Calendar } from 'lucide-react';
import { useState } from 'react';
import Image from 'next/image';

interface VehicleCardProps {
  id: string;
  name: string;
  image: string;
  price: number;
  priceAriary: string;
  badge: string;
  badgeColor: 'cyan' | 'blue' | 'purple' | 'pink';
  year: number;
  mileage: number;
  power: number;
  index?: number;
}

const badgeColorMap = {
  cyan: 'from-cyan-500 to-blue-500',
  blue: 'from-blue-500 to-purple-500',
  purple: 'from-purple-500 to-pink-500',
  pink: 'from-pink-500 to-red-500',
};

export const VehicleCard = ({
  id,
  name,
  image,
  price,
  priceAriary,
  badge,
  badgeColor,
  year,
  mileage,
  power,
  index = 0,
}: VehicleCardProps) => {
  const [isLiked, setIsLiked] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      viewport={{ once: true }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="relative group h-full"
    >
      <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 h-full flex flex-col glass-dark hover:border-blue-500/50 transition-all duration-300">
        {/* Image Container */}
        <div className="relative h-56 sm:h-64 overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900">
          <motion.div
            animate={{ scale: isHovered ? 1.05 : 1 }}
            transition={{ duration: 0.3 }}
            className="w-full h-full"
          >
            <Image
              src={image}
              alt={name}
              fill
              className="object-cover"
              priority
            />
          </motion.div>

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`absolute top-4 left-4 px-3 py-1.5 rounded-full bg-gradient-to-r ${badgeColorMap[badgeColor]} text-white text-xs font-bold`}
          >
            {badge}
          </motion.div>

          {/* Like Button */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsLiked(!isLiked)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all"
          >
            <Heart
              className={`w-5 h-5 transition-all ${
                isLiked
                  ? 'fill-red-500 text-red-500'
                  : 'text-white/70 hover:text-white'
              }`}
            />
          </motion.button>

          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovered ? 1 : 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"
          />
        </div>

        {/* Content */}
        <div className="flex-1 p-5 sm:p-6 flex flex-col">
          {/* Name */}
          <h3 className="text-base sm:text-lg font-bold text-white mb-2 line-clamp-2">
            {name}
          </h3>

          {/* Price */}
          <div className="mb-4">
            <p className="text-cyan-400 font-bold text-lg">
              ${price.toLocaleString('en-US')}
            </p>
            <p className="text-muted-foreground text-xs">
              {priceAriary}
            </p>
          </div>

          {/* Specs */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {/* Year */}
            <motion.div
              whileHover={{ y: -2 }}
              className="bg-slate-800/50 rounded-lg p-3 text-center border border-slate-700 hover:border-blue-500/30 transition-colors"
            >
              <Calendar className="w-4 h-4 text-blue-400 mx-auto mb-1" />
              <p className="text-xs font-semibold text-white">{year}</p>
              <p className="text-xs text-muted-foreground">Année</p>
            </motion.div>

            {/* Mileage */}
            <motion.div
              whileHover={{ y: -2 }}
              className="bg-slate-800/50 rounded-lg p-3 text-center border border-slate-700 hover:border-cyan-500/30 transition-colors"
            >
              <Gauge className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
              <p className="text-xs font-semibold text-white">{(mileage / 1000).toFixed(0)}k</p>
              <p className="text-xs text-muted-foreground">Km</p>
            </motion.div>

            {/* Power */}
            <motion.div
              whileHover={{ y: -2 }}
              className="bg-slate-800/50 rounded-lg p-3 text-center border border-slate-700 hover:border-purple-500/30 transition-colors"
            >
              <Zap className="w-4 h-4 text-purple-400 mx-auto mb-1" />
              <p className="text-xs font-semibold text-white">{power}</p>
              <p className="text-xs text-muted-foreground">Ch</p>
            </motion.div>
          </div>

          {/* View Details Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full mt-auto px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/40 text-cyan-300 font-semibold hover:from-blue-500/30 hover:to-cyan-500/30 hover:border-blue-500/60 transition-all text-sm"
          >
            Voir Détails
          </motion.button>
        </div>

        {/* Glow effect on hover */}
        <motion.div
          animate={{ opacity: isHovered ? 1 : 0 }}
          className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 blur-xl -z-10 pointer-events-none"
        />
      </div>
    </motion.div>
  );
};
