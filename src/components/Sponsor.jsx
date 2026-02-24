import React from 'react';
import { motion } from 'framer-motion';

export default function Sponsor() {
  return (
    <motion.section
      className="py-16 md:py-24 text-center px-4 md:px-0"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.6 }}
    >
      <div className="border border-dpg-gold-dim py-10 px-6 md:py-16 md:px-16 max-w-[800px] mx-auto relative text-center">
        <div className="absolute top-[-1px] left-[-1px] w-2.5 h-2.5 border-t border-l border-dpg-gold" />
        <div className="absolute bottom-[-1px] right-[-1px] w-2.5 h-2.5 border-b border-r border-dpg-gold" />
        <p className="uppercase tracking-[0.2em] mb-4 text-xs text-dpg-gold font-light">
          Değerli Destekleriyle
        </p>
        <img
          src="/denizbank-logo.svg"
          alt="DenizBank"
          className="h-20 md:h-28 w-auto object-contain mx-auto mb-4 md:mb-6"
        />
        <p className="italic text-dpg-silver font-light text-sm md:text-base">
          &quot;Gökyüzünde güvenle yol alan tüm pilotlarımızın yanındayız. 2026 Dünya Pilotlar
          Günü&apos;ne ana sponsor olmaktan gurur duyuyoruz.&quot;
        </p>
      </div>
    </motion.section>
  );
}
