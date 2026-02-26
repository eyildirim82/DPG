import React from 'react';
import { motion } from 'framer-motion';

export default function SponsorsList() {
    

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
                    Sponsorlarımız
                    <span className="block w-[60px] h-px bg-dpg-gold mt-2.5 mx-auto" />
                </h2>
            </div>

              <div className="flex flex-wrap md:flex-nowrap items-center justify-center gap-3 md:gap-6 max-w-[1000px] mx-auto py-2">
                  <div className="bg-white rounded-xl border border-white/10 p-4 flex items-center justify-center w-[calc(50%-0.375rem)] h-[80px] md:w-[160px] md:h-[100px] flex-shrink-0 transition-all duration-300 hover:scale-105 hover:bg-white/90 cursor-default overflow-hidden">
                    <img
                        src="/denizbank-logo.svg"
                        alt="DenizBank"
                        className="w-full h-full object-contain"
                    />
                </div>   
                <div className="bg-white rounded-xl border border-white/10 p-1 flex items-center justify-center w-[calc(50%-0.375rem)] h-[80px] md:w-[160px] md:h-[100px] flex-shrink-0 transition-all duration-300 hover:scale-105 hover:bg-white/90 cursor-default overflow-hidden">
                    <img
                        src="/northernLand.png"
                        alt="NorthernLAND"
                        className="w-full h-full object-contain"
                    />
                </div>    
                <div className="bg-white rounded-xl border border-white/10 p-1 flex items-center justify-center w-[calc(50%-0.375rem)] h-[80px] md:w-[160px] md:h-[100px] flex-shrink-0 transition-all duration-300 hover:scale-105 hover:bg-white/90 cursor-default overflow-hidden">
                    <img
                        src="/İGA PASS-01.svg"
                        alt="İGA PASS"
                        className="w-full h-full object-contain scale-150"
                    />
                </div>

                <div className="bg-white rounded-xl border border-white/10 p-2 flex items-center justify-center w-[calc(50%-0.375rem)] h-[80px] md:w-[160px] md:h-[100px] flex-shrink-0 transition-all duration-300 hover:scale-105 hover:bg-white/90 cursor-default overflow-hidden">
                    <img
                        src="/havaist-logo-v2.png"
                        alt="HAVAIST"
                        className="w-full h-full object-contain"
                    />
                </div>
            </div>
        </motion.section>
    );
}
