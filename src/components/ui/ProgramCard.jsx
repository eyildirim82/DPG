import React from 'react';
import { motion } from 'framer-motion';

export default function ProgramCard({ time, title, desc, index = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{
        duration: 0.6,
        ease: [0.25, 1, 0.5, 1],
        delay: index * 0.1,
      }}
      whileHover={{
        borderColor: 'rgba(230, 194, 117, 1)',
        backgroundColor: 'rgba(230, 194, 117, 0.05)',
      }}
      className="border border-dpg-silver/20 px-5 py-6 md:px-8 md:py-8 relative cursor-default"
    >
      <span className="inline-block mb-4 font-body text-xs text-dpg-gold border border-dpg-gold py-1 px-3 rounded-full">
        {time}
      </span>
      <h3 className="font-heading text-2xl text-dpg-text mb-2 font-normal uppercase tracking-wide">
        {title}
      </h3>
      <p className="text-dpg-text-muted font-light">{desc}</p>
    </motion.div>
  );
}
