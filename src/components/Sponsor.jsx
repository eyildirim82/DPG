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
      <p className="uppercase tracking-[0.2em] mb-4 text-lg md:text-xl text-dpg-gold font-light">
        Ana Sponsor
      </p>
      <img
        src="/denizbank-logo.svg"
        alt="DenizBank"
        className="h-12 md:h-16 w-auto object-contain mx-auto"
      />
    </motion.section>
  );
}
