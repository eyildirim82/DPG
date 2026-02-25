import React from 'react';
import { motion } from 'framer-motion';

const DOCUMENTS = [
    {
        title: 'Acil Durum Planı',
        icon: '🚨',
        href: '/docs/acil-durum-plani.pdf',
        color: 'from-red-500/20 to-red-600/10',
        border: 'border-red-500/30 hover:border-red-400/60',
        iconBg: 'bg-red-500/15',
    },
    {
        title: 'Ulaşım Bilgileri',
        icon: '🚌',
        href: '/docs/ulasim.pdf',
        color: 'from-blue-500/20 to-blue-600/10',
        border: 'border-blue-500/30 hover:border-blue-400/60',
        iconBg: 'bg-blue-500/15',
    },
    {
        title: 'Menü',
        icon: '🍽️',
        href: '/docs/menu.pdf',
        color: 'from-amber-500/20 to-amber-600/10',
        border: 'border-amber-500/30 hover:border-amber-400/60',
        iconBg: 'bg-amber-500/15',
    },
];

export default function DocumentLinks() {
    return (
        <motion.section
            className="py-10 md:py-16 max-w-[700px] mx-auto px-4 md:px-0"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5 }}
        >
            <div className="text-center mb-6 md:mb-8">
                <h2 className="font-heading font-normal tracking-wide uppercase text-2xl md:text-3xl text-dpg-silver relative inline-block">
                    Dökümanlar
                    <span className="block w-[60px] h-px bg-dpg-gold mt-2.5 mx-auto" />
                </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {DOCUMENTS.map((doc, idx) => (
                    <motion.a
                        key={doc.title}
                        href={doc.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`group relative flex flex-col items-center gap-3 p-5 rounded-xl border-2 ${doc.border} bg-gradient-to-b ${doc.color} backdrop-blur-sm transition-all duration-300 hover:shadow-[0_0_20px_rgba(230,194,117,0.1)] hover:-translate-y-0.5`}
                        initial={{ opacity: 0, y: 16 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4, delay: idx * 0.1 }}
                    >
                        <span className={`text-3xl ${doc.iconBg} w-14 h-14 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}>
                            {doc.icon}
                        </span>
                        <span className="text-sm md:text-base font-heading font-medium text-gray-200 tracking-wide text-center group-hover:text-dpg-gold transition-colors duration-300">
                            {doc.title}
                        </span>
                        <span className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-dpg-gold/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                        </span>
                    </motion.a>
                ))}
            </div>
        </motion.section>
    );
}
