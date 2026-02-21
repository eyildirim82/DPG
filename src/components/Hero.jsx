import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import Button from './ui/Button';
import { theme } from '../styles/theme';

const VIDEO_SRC = '/promo.mp4';

function PlayIcon({ className = 'w-16 h-16' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5v14l11-7L8 5z" />
    </svg>
  );
}

const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.25, 1, 0.5, 1] },
  },
};

export default function Hero({ onScrollTo }) {
  const videoRef = useRef(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(null);
  const [showPlayButton, setShowPlayButton] = useState(true);

  const handlePlayClick = () => {
    if (videoRef.current && !videoError) {
      videoRef.current.play();
      setShowPlayButton(false);
    }
  };

  return (
    <motion.section
      className="min-h-screen flex flex-col justify-center items-center text-center relative pt-20 md:pt-16 px-4"
      style={{ isolation: 'isolate' }}
      initial="hidden"
      animate="visible"
      variants={container}
    >
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-full -z-[1] opacity-30 md:opacity-40 bg-cover bg-center grayscale contrast-125"
        style={{
          background: theme.heroBackground,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'grayscale(100%) sepia(20%) hue-rotate(180deg) contrast(1.2)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 40%, black 60%, transparent)',
          maskImage: 'linear-gradient(to bottom, transparent, black 40%, black 60%, transparent)',
        }}
      />
      <motion.div
        variants={item}
        className="text-base md:text-xl tracking-[0.2em] text-dpg-silver mb-6 md:mb-8 uppercase font-body font-light"
      >
        26 Nisan 2026
      </motion.div>
      <motion.h1
        variants={item}
        className="font-heading font-normal tracking-wide uppercase text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl leading-none mb-6 md:mb-8 text-center"
        style={{
          background: 'linear-gradient(to bottom, #E6C275, #9E8245)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        Dünya Pilotlar Günü 2026
      </motion.h1>
      <motion.div
        variants={item}
        className="w-full max-w-[1100px] mx-auto mb-8 md:mb-10 flex flex-col gap-6"
      >
        <div className="relative rounded overflow-hidden border border-dpg-gold-dim flex items-center justify-center w-full aspect-video max-h-[320px] sm:max-h-[380px] md:max-h-[420px] bg-dpg-navy"
        >
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10 transition-opacity duration-300 pointer-events-none bg-dpg-navy"
            style={{ opacity: videoLoaded ? 0 : 1 }}
          >
            <img src="/talpa-logo.webp" alt="TALPA" className="h-20 md:h-28 w-auto object-contain opacity-90" />
            <span className="text-dpg-text-muted font-body text-sm">Yükleniyor...</span>
          </div>
          {videoError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-20 bg-dpg-navy p-4">
              <img src="/talpa-logo.webp" alt="TALPA" className="h-16 w-auto object-contain opacity-80" />
              <p className="text-dpg-text-muted text-sm text-center">{videoError}</p>
            </div>
          )}
          {showPlayButton && videoLoaded && !videoError && (
            <button
              type="button"
              onClick={handlePlayClick}
              className="absolute inset-0 z-[2] flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors cursor-pointer"
              aria-label="Videoyu oynat"
            >
              <span className="w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center text-dpg-gold border-2 border-dpg-gold/80 bg-dpg-navy/80 hover:bg-dpg-gold/20 transition-colors">
                <PlayIcon className="w-10 h-10 md:w-12 md:h-12 ml-1 text-dpg-gold" />
              </span>
            </button>
          )}
          <video
            ref={videoRef}
            src={VIDEO_SRC}
            poster="/talpa-logo.webp"
            className="w-full h-full object-contain relative z-[1] bg-dpg-navy"
            controls
            controlsList="nodownload"
            playsInline
            preload="metadata"
            onLoadedData={() => { setVideoLoaded(true); setVideoError(null); }}
            onCanPlay={() => setVideoLoaded(true)}
            onPlay={() => setShowPlayButton(false)}
            onPause={() => setShowPlayButton(true)}
            onError={(e) => {
              const v = e.target;
              const msg = v.error?.message || v.error?.code;
              setVideoError(msg ? `Video yüklenemedi: ${msg}` : 'Video oynatılamadı.');
            }}
          >
            Tarayıcınız video oynatmayı desteklemiyor.
          </video>
        </div>
        <div className="flex flex-col gap-6 max-w-[600px] mx-auto w-full">
          <p className="text-base md:text-lg border-l border-dpg-gold pl-4 md:pl-6 text-left text-dpg-text-muted font-light">
            Gökyüzünün kahramanları bir araya geliyor. TALPA öncülüğünde, havacılık tarihine saygı ve
            geleceğe vizyoner bir bakış.
          </p>
          <Button onClick={() => onScrollTo('basvur')} className="w-full sm:w-auto min-h-[44px] self-center">Etkinliğe Başvur</Button>
        </div>
      </motion.div>
      <motion.div
        variants={item}
        className="mt-12 md:mt-16 opacity-90 text-xs md:text-sm tracking-widest text-dpg-silver flex flex-col items-center gap-3"
      >
        ANA SPONSOR
        <img
          src="/denizbank-logo.svg"
          alt="DenizBank"
          className="h-8 md:h-10 w-auto object-contain"
        />
      </motion.div>
    </motion.section>
  );
}
