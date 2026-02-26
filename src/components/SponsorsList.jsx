import React from 'react';
import { motion } from 'framer-motion';

export default function SponsorsList() {
    const placeholders = [1, 2, 3, 4];

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
                    Destekleyenler
                    <span className="block w-[60px] h-px bg-dpg-gold mt-2.5 mx-auto" />
                </h2>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 max-w-[800px] mx-auto">
                <div className="bg-white rounded-xl border border-white/10 p-1 flex items-center justify-center w-[140px] h-[90px] md:w-[160px] md:h-[100px] transition-all duration-300 hover:scale-105 hover:bg-white/90 hover:shadow-[0_0_15px_rgba(230,194,117,0.15)] cursor-default overflow-hidden">
                    <img
                        src="/İGA PASS-01.svg"
                        alt="İGA PASS"
                        className="w-full h-full object-contain scale-150"
                    />
                </div>
                <div className="bg-white rounded-xl border border-white/10 p-1 flex items-center justify-center w-[140px] h-[90px] md:w-[160px] md:h-[100px] transition-all duration-300 hover:scale-105 hover:bg-white/90 hover:shadow-[0_0_15px_rgba(230,194,117,0.15)] cursor-default overflow-hidden">
                    <img
                        src="/northernLand.png"
                        alt="NorthernLAND"
                        className="w-full h-full object-contain"
                    />
                </div>
                {[3, 4].map((item) => (
                    <div
                        key={item}
                        className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4 flex items-center justify-center w-[140px] h-[90px] md:w-[160px] md:h-[100px] transition-all duration-300 hover:bg-white/10 hover:border-dpg-gold/50 cursor-default"
                    >
                        <span className="text-dpg-text-muted font-heading tracking-widest uppercase text-xs md:text-sm text-center">
                            Sponsor {item}
                        </span>
                    </div>
                ))}
            </div>
        </motion.section>
    );
}
