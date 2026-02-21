import React from 'react';
import { motion } from 'framer-motion';

export default function TimelineNode({ year, label, desc, active }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: active ? 1 : 0.5, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      whileHover={{ opacity: 1 }}
      className="flex flex-row md:flex-col md:w-[180px] items-center md:text-center cursor-pointer gap-4 md:gap-0 pl-0 md:pl-0"
    >
      <motion.div
        className={`
          w-[60px] h-[60px] flex-shrink-0 md:mx-auto md:mb-6 rounded-full flex items-center justify-center font-heading text-lg md:text-xl
          ${active
            ? 'bg-gradient-to-br from-dpg-gold to-dpg-gold-dim border border-white text-dpg-navy shadow-[0_0_30px_rgba(230,194,117,0.4)]'
            : 'bg-gradient-to-br from-[#2a4055] to-dpg-navy border border-dpg-gold text-dpg-gold shadow-[0_0_20px_rgba(230,194,117,0.1)]'
          }
        `}
        animate={active ? { scale: 1.1 } : { scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        {year}
      </motion.div>
      <div className="flex-1 md:flex-initial text-left md:text-center min-w-0">
        <span className="block font-heading text-xl md:text-2xl mb-1 md:mb-2 text-dpg-silver font-normal uppercase tracking-wide">
          {label}
        </span>
        <div className="text-sm leading-snug text-dpg-text-muted font-light">{desc}</div>
      </div>
    </motion.div>
  );
}
