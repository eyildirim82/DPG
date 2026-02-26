import React from 'react';
import { motion } from 'framer-motion';
import { Music3 } from 'lucide-react';

export default function ArtistsList() {
    const placeholders = [1, 2];

    return (
        <motion.section
            className="py-6 md:py-10 text-center px-4 md:px-0"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.6 }}
        >
            <div className="text-center mb-8 md:mb-12">
                <h2 className="font-heading font-normal tracking-wide uppercase text-3xl md:text-4xl text-dpg-silver text-center mb-6 md:mb-8 relative inline-block">
                    Sanatçılar
                    <span className="block w-[60px] h-px bg-dpg-gold mt-2.5 mx-auto" />
                </h2>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10 max-w-[800px] mx-auto">
                <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-dpg-gold-dim/70 p-5 flex flex-col items-center justify-center w-[200px] h-[280px] md:w-[280px] md:h-[360px] transition-all duration-300 hover:bg-white/10 hover:border-dpg-gold/70 cursor-default">
                    <div className="w-32 h-32 md:w-48 md:h-48 rounded-full bg-white border-4 border-dpg-gold mb-5 flex items-center justify-center overflow-hidden shadow-[0_0_25px_rgba(230,194,117,0.35)]">
                        <img
                            src="/Derya ULUĞ-Photoroom.png"
                            alt="Derya ULUĞ"
                            className="w-full h-full object-cover object-top scale-110 md:scale-125"
                        />
                    </div>
                    <span className="text-dpg-gold font-heading tracking-[0.4em] uppercase text-base md:text-xl text-center font-semibold">
                        Derya ULUĞ
                    </span>
                </div>

                <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4 flex flex-col items-center justify-center w-[160px] h-[220px] md:w-[220px] md:h-[280px] transition-all duration-300 hover:bg-white/10 hover:border-dpg-gold/50 cursor-default">
                    <div className="w-28 h-28 md:w-40 md:h-40 rounded-full bg-white border-2 border-dpg-gold-dim mb-4 flex items-center justify-center overflow-hidden shadow-[0_0_15px_rgba(230,194,117,0.2)]">
                        <img
                            src="/ilknur.png"
                            alt="İlknur Tuncer"
                            className="w-full h-full object-cover object-top"
                        />
                    </div>
                    <span className="text-dpg-gold font-heading tracking-widest uppercase text-sm md:text-base text-center font-medium">
                        İlknur Tuncer
                    </span>
                </div>
            </div>
        </motion.section>
    );
}
