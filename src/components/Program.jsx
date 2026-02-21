import React from 'react';
import { motion } from 'framer-motion';

export default function Program() {
  return (
    <motion.section
      id="program"
      className="py-16 md:py-24 px-4 md:px-0"
      style={{ background: 'linear-gradient(to bottom, #051424, #0A2239)' }}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.6 }}
    >
      <div className="text-center mb-8 md:mb-12">
        <h2 className="font-heading font-normal tracking-wide uppercase text-3xl md:text-4xl text-dpg-silver text-center mb-8 md:mb-12 relative inline-block">
          Etkinlik Programı
          <span className="block w-[60px] h-px bg-dpg-gold mt-2.5 mx-auto" />
        </h2>
      </div>
      <div className="max-w-[600px] mx-auto text-center border border-dpg-gold-dim/50 rounded py-12 px-6 md:py-16 md:px-10">
        <p className="text-dpg-text-muted font-body text-base md:text-lg font-light leading-relaxed">
          Henüz etkinlik programı netleşmedi. <strong className="text-dpg-silver font-normal">Dünya Pilotlar Günü</strong> programı ilerleyen vakitlerde detaylı olarak açıklanacaktır.
        </p>
      </div>
    </motion.section>
  );
}
