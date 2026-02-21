import React from 'react';
import { motion } from 'framer-motion';
import TimelineNode from './ui/TimelineNode';
import { timelineNodes } from '../data/timeline';

export default function Timeline() {
  return (
    <motion.section
      className="py-16 md:py-32 relative px-4 md:px-0"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <div className="text-center mb-8 md:mb-12">
        <h2 className="font-heading font-normal tracking-wide uppercase text-3xl md:text-4xl text-dpg-silver text-center mb-8 md:mb-12 relative inline-block">
          Etkinlik Hakkında
          <span className="block w-[60px] h-px bg-dpg-gold mt-2.5 mx-auto" />
        </h2>
      </div>
      <p className="text-center max-w-[700px] mx-auto text-dpg-text-muted font-light text-base md:text-lg">
        2014 yılından bu yana Türkiye Havayolu Pilotları Derneği (TALPA) tarafından düzenlenen Dünya
        Pilotlar Günü, havacılık camiasını birleştiren en prestijli buluşmadır. Bu yıl, gökyüzündeki
        sınırları kaldıranlara adanmıştır.
      </p>
      {/* Mobil: dikey timeline */}
      <div className="relative mt-12 md:mt-16 py-6 md:py-8 md:block">
        {/* Yatay çizgi – sadece md ve üzeri */}
        <motion.div
          className="hidden md:block absolute top-1/2 left-0 w-full h-px z-[1] origin-left"
          style={{
            background: 'linear-gradient(90deg, transparent, #E6C275, transparent)',
          }}
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
        {/* Dikey çizgi – sadece mobil */}
        <motion.div
          className="md:hidden absolute left-[29px] top-0 bottom-0 w-px z-[1] origin-top"
          style={{ background: 'linear-gradient(180deg, transparent, #E6C275, transparent)' }}
          initial={{ scaleY: 0 }}
          whileInView={{ scaleY: 1 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
        <div className="flex flex-col md:flex-row md:flex-wrap md:justify-between gap-6 md:gap-4 relative z-[2]">
          {timelineNodes.map((node) => (
            <TimelineNode
              key={node.year}
              year={node.year}
              label={node.label}
              desc={node.desc}
              active={node.active}
            />
          ))}
        </div>
      </div>
    </motion.section>
  );
}
