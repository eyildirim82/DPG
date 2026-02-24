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
      className="min-h-[80vh] md:min-h-screen flex flex-col justify-center items-center text-center relative pt-40 md:pt-36 pb-10 md:pb-0 px-4"
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

      <motion.h1
        variants={item}
        className="font-heading font-medium tracking-normal uppercase text-3xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl leading-tight mb-4 md:mb-4 text-center flex flex-col gap-2"
        style={{
          background: 'linear-gradient(to bottom, #E6C275, #9E8245)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        <span className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl">26 Nisan 2026</span>
        <span>Dünya Pilotlar Günü</span>
      </motion.h1>
      <motion.div
        variants={item}
        className="w-full max-w-[1100px] mx-auto mb-4 md:mb-6 flex flex-col gap-4 md:gap-6"
      >
        <div className="relative rounded overflow-hidden border border-dpg-gold-dim flex items-center justify-center w-full aspect-video max-h-[320px] sm:max-h-[380px] md:max-h-[420px] bg-dpg-navy mt-4 md:mt-6"
        >
          {videoError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-20 bg-dpg-navy p-4">
              <img src="/talpa-logo.webp" alt="TALPA" className="h-24 md:h-28 w-auto object-contain opacity-80" />
              <p className="text-dpg-text-muted text-sm text-center">{videoError}</p>
            </div>
          )}
          {showPlayButton && !videoError && (
            <button
              type="button"
              onClick={handlePlayClick}
              className="absolute inset-0 z-[2] flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-dpg-gold focus-visible:outline-offset-2"
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

        <div className="flex flex-col gap-6 max-w-[700px] mx-auto w-full mt-4 md:mt-8">
          <div className="text-xl md:text-2xl leading-relaxed border-l border-dpg-gold pl-4 md:pl-6 text-left text-dpg-text-muted font-light flex flex-col gap-4">
            <p>
              Gökyüzünün kahramanları bir araya geliyor!
            </p>
            <p>
              Gökyüzüne adanmış bir ömrün, fedakârlığın, disiplinin ve tutkunun ortak adı;
              <br />
              <strong className="text-dpg-gold text-2xl md:text-3xl font-medium mt-1 inline-block">Dünya Pilotlar Günü.</strong>
            </p>
            <p className="text-base md:text-lg">
              Türkiye’nin ilk pilotu Fesa Evrensev’in 26 Nisan’da gerçekleştirdiği kabul edilen ilk uçuş, bugün tüm dünyada Dünya Pilotlar Günü olarak kutlanmaktadır. Bu tarih; cesaretin, vizyonun ve öncülüğün sembolüdür.
            </p>
            <p className="font-medium mt-1 md:mt-2 text-lg md:text-xl">
              Bu özel günü TALPA öncülüğünde hep birlikte kutluyoruz!
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center mt-2 md:mt-4">
            <Button onClick={() => onScrollTo('basvur')} className="w-full sm:w-auto min-h-[44px] items-center justify-center flex">Etkinliğe Başvur</Button>
            <a
              href="https://www.talpa.org/wp-content/uploads/2026/02/acil-durum-plani.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 hover:bg-white/5 border border-white/20 px-6 py-4 rounded-md transition-colors duration-300 text-dpg-text-muted hover:text-dpg-gold text-lg md:text-xl font-body focus-visible:outline focus-visible:outline-2 focus-visible:outline-dpg-gold min-h-[60px]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Acil Durum Planı
            </a>
          </div>
        </div>
      </motion.div>

    </motion.section>
  );
}
