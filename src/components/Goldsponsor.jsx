import React from 'react';
import { motion } from 'framer-motion';

export default function Sponsor() {
  return (
    <motion.section
      className="py-8 md:py-12 text-center px-4 md:px-0"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.6 }}
    >
      <div className="text-center mb-6 md:mb-8">
        <h2 className="font-heading font-normal tracking-wide uppercase text-3xl md:text-4xl text-dpg-silver relative inline-block">
          Altın Sponsor
          <span className="block w-[60px] h-px bg-dpg-gold mt-2.5 mx-auto" />
        </h2>
      </div>
      <a href="https://northernland.com/tr/grand-sapphire-blu" target="_blank" rel="noopener noreferrer" className="bg-white rounded-xl border border-dpg-gold p-6 inline-block shadow-[0_4px_20px_rgba(230,194,117,0.15)] transition-transform hover:scale-105 duration-300 cursor-pointer">
        <img
          src="northernLand.png"
          alt="NorthernLAND"
          className="h-10 md:h-14 lg:h-16 w-auto object-contain mx-auto mix-blend-multiply"
        />
      </a>
    </motion.section>
  );
}
