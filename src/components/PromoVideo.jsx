import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';

/**
 * Tanıtım videosu.
 * public/promo.mp4 kullanılır.
 */
const VIDEO_SRC = '/promo.mp4';

export default function PromoVideo() {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);
  const videoRef = useRef(null);

  return (
    <motion.section
      className="py-16 md:py-24 px-4 md:px-0"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.6 }}
    >
      <div className="text-center mb-8 md:mb-12">
        <h2 className="font-heading font-normal tracking-wide uppercase text-3xl md:text-4xl text-dpg-silver text-center mb-8 md:mb-12 relative inline-block">
          Tanıtım
          <span className="block w-[60px] h-px bg-dpg-gold mt-2.5 mx-auto" />
        </h2>
      </div>
      <div className="max-w-[1000px] mx-auto relative">
        <div
          className="relative rounded overflow-hidden border border-dpg-gold-dim flex items-center justify-center min-h-[280px] md:min-h-[360px]"
          style={{ backgroundColor: 'rgba(10, 34, 57, 0.8)' }}
        >
          {/* Yükleme katmanı – tıklamaları engellemesin diye pointer-events: none */}
          <div
            className="absolute inset-0 flex items-center justify-center z-10 transition-opacity duration-300 pointer-events-none"
            style={{ opacity: loaded ? 0 : 1, background: 'rgba(5, 20, 36, 0.4)' }}
          >
            <span className="text-dpg-text-muted font-body text-sm">Yükleniyor...</span>
          </div>
          {error && (
            <div className="absolute inset-0 flex items-center justify-center z-20 bg-dpg-navy/90 p-4">
              <p className="text-dpg-text-muted text-sm text-center">{error}</p>
            </div>
          )}
          <video
            ref={videoRef}
            src={VIDEO_SRC}
            className="w-full max-h-[70vh] object-contain relative z-[1] bg-black/30"
            controls
            controlsList="nodownload"
            playsInline
            preload="metadata"
            onLoadedData={() => { setLoaded(true); setError(null); }}
            onCanPlay={() => setLoaded(true)}
            onError={(e) => {
              const v = e.target;
              const msg = v.error?.message || v.error?.code;
              setError(msg ? `Video yüklenemedi: ${msg}` : 'Video oynatılamadı. Dosya public/promo.mp4 konumunda mı?');
            }}
          >
            Tarayıcınız video oynatmayı desteklemiyor.
          </video>
        </div>
      </div>
    </motion.section>
  );
}
