import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

const customStyles = {
  fontCinzel: {
    fontFamily: "'Cinzel', serif",
  },
  fontPlayfair: {
    fontFamily: "'Playfair Display', serif",
  },
  fontMontserrat: {
    fontFamily: "'Montserrat', sans-serif",
  },
  goldGradientText: {
    background: 'linear-gradient(135deg, #FBF5B7 0%, #BF953F 25%, #AA771C 50%, #BF953F 75%, #FBF5B7 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    backgroundSize: '200% auto',
    animation: 'shine 5s linear infinite',
  },
  bgGoldGradient: {
    background: 'linear-gradient(90deg, #BF953F 0%, #FCF6BA 50%, #B38728 100%)',
  },
  videoContainerShadow: {
    boxShadow: '0 20px 50px -12px rgba(0, 0, 0, 0.8), 0 0 30px -5px rgba(191, 149, 63, 0.1)',
  },
  nebulaBg: {
    background: `
      radial-gradient(circle at 50% 50%, rgba(30, 58, 138, 0.15), transparent 60%),
      radial-gradient(circle at 85% 30%, rgba(191, 149, 63, 0.05), transparent 40%),
      radial-gradient(circle at 15% 70%, rgba(37, 99, 235, 0.1), transparent 40%)
    `,
  },
  starPattern: {
    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
  },
};

const Nav = () => {
  return (
    <nav className="relative z-20 w-full px-6 py-6 md:px-12 flex justify-between items-center max-w-[1400px] mx-auto">
      <div className="flex items-center gap-4 group cursor-pointer">
        <div className="relative w-12 h-12 flex items-center justify-center">
          <div className="absolute inset-0 border border-slate-600 rounded-full group-hover:border-[#BF953F] transition-colors duration-300"></div>
          <div className="absolute inset-1 border border-slate-700 rounded-full group-hover:border-[#BF953F]/50 transition-colors duration-300"></div>
          <i className="fa-solid fa-plane-up text-slate-300 group-hover:text-white text-lg transition-colors"></i>
        </div>
        <div className="hidden sm:block">
          <h1 className="font-bold text-lg tracking-wider text-slate-200" style={customStyles.fontCinzel}>TALPA</h1>
        </div>
      </div>

      <div className="flex items-center gap-3 opacity-60 hover:opacity-100 transition-opacity duration-300">
        <span className="font-bold text-xl tracking-tight text-[#00529b]" style={{ textShadow: '0 0 1px rgba(255,255,255,0.1)' }}>DenizBank</span>
        <i className="fa-solid fa-dharmachakra text-[#ed1c24] text-2xl"></i>
      </div>
    </nav>
  );
};

const HeroSection = ({ onApplyClick }) => {
  return (
    <div className="text-center mb-12 relative">
      <div className="inline-block mb-4 relative">
        <span className="text-sm md:text-base tracking-[0.3em] text-[#BF953F] uppercase font-medium" style={customStyles.fontMontserrat}>26 Nisan 2026</span>
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-12 h-[1px] bg-[#BF953F]/50"></div>
      </div>

      <h1 className="text-4xl md:text-6xl lg:text-7xl font-medium leading-tight mt-4" style={customStyles.fontCinzel}>
        <span className="block text-slate-300 mb-2">DÜNYA</span>
        <span className="block font-bold drop-shadow-lg" style={customStyles.goldGradientText}>PİLOTLAR GÜNÜ</span>
        <span className="block text-3xl md:text-5xl text-slate-500 mt-4 font-light italic" style={customStyles.fontPlayfair}>2026</span>
      </h1>
    </div>
  );
};

const VideoPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(33);
  const [isHovered, setIsHovered] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const handlePlayToggle = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="w-full max-w-5xl relative mb-16">
      <div className="absolute -inset-4 bg-gradient-to-r from-blue-900/20 via-[#BF953F]/10 to-blue-900/20 rounded-[2rem] blur-2xl -z-10"></div>

      <div
        className="relative aspect-video bg-[#0B1A3A] rounded-xl overflow-hidden border border-slate-700/50 group cursor-pointer"
        style={customStyles.videoContainerShadow}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handlePlayToggle}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 z-10 pointer-events-none"></div>

        <div className="absolute inset-0 flex flex-col items-center justify-center z-0">
          <div className="absolute inset-0 flex items-center justify-center opacity-10 scale-125">
            <svg className="w-full h-full text-slate-400 fill-current p-12" viewBox="0 0 512 512">
              <path d="M498.1 5.6c10.1 7 15.4 19.1 13.5 31.2l-64 416c-1.5 9.7-7.4 18.2-16 23s-18.9 5.4-28 1.6L284 427.7l-68.5 74.1c-8.9 9.7-22.9 12.9-35.2 8.1S160 493.2 160 480V396.4c0-4 1.5-7.8 4.2-10.7L331.8 202.8c5.8-6.3 5.6-16-.4-22s-15.7-6.4-22-.7L106 360.8 17.7 316.6C7.1 311.3 .3 300.7 0 288.9s5.9-22.8 16.1-28.7l448-256c10.7-6.1 23.9-5.5 34 1.4z" />
            </svg>
          </div>

          <div className="relative w-64 h-64 flex items-center justify-center transform group-hover:scale-105 transition-transform duration-700">
            <div
              className="absolute inset-0 rounded-full border border-[#BF953F]/30 border-dashed"
              style={{ animation: 'spin 60s linear infinite' }}
            ></div>
            <div className="absolute inset-4 rounded-full border border-slate-600/50"></div>

            <div className="relative text-center z-10">
              <div className="text-[10px] uppercase tracking-[0.2em] text-[#BF953F] mb-1 font-semibold">Türkiye Havayolu</div>
              <div className="text-[9px] uppercase tracking-[0.2em] text-slate-400 mb-3">Pilotları Derneği</div>

              <div className="flex justify-center items-center gap-3 my-2">
                <div className="h-[1px] w-8 bg-slate-600"></div>
                <span className="font-bold text-2xl text-white" style={customStyles.fontCinzel}>1958</span>
                <div className="h-[1px] w-8 bg-slate-600"></div>
              </div>

              <i className="fa-solid fa-plane-up text-3xl text-slate-300 mt-2 block mx-auto"></i>
              <div className="mt-3 font-black text-2xl tracking-widest text-[#BF953F]" style={customStyles.fontCinzel}>TALPA</div>
            </div>
          </div>
        </div>

        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div
            className="w-24 h-24 rounded-full bg-[#BF953F]/10 border border-[#BF953F] flex items-center justify-center backdrop-blur-sm group-hover:bg-[#BF953F]/20 transition-all duration-300"
            style={{ animation: 'pulse-gold 2s infinite' }}
          >
            <div className="w-16 h-16 rounded-full flex items-center justify-center pl-1 group-hover:scale-110 transition-transform duration-300" style={{ background: 'linear-gradient(to bottom right, #FCF6BA, #BF953F)', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)' }}>
              <i className={`fa-solid ${isPlaying ? 'fa-pause' : 'fa-play'} text-[#051024] text-2xl`}></i>
            </div>
          </div>
        </div>

        <div
          className="absolute bottom-0 left-0 right-0 p-4 flex items-center gap-4 transition-opacity duration-300 z-30 bg-gradient-to-t from-black/90 to-transparent"
          style={{ opacity: isHovered ? 1 : 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button className="text-white hover:text-[#BF953F]" onClick={handlePlayToggle}>
            <i className={`fa-solid ${isPlaying ? 'fa-pause' : 'fa-play'}`}></i>
          </button>
          <span className="text-xs font-mono text-slate-300">0:00 / 0:40</span>
          <div className="flex-grow h-1 bg-slate-700 rounded-full overflow-hidden cursor-pointer">
            <div className="h-full bg-[#BF953F] relative" style={{ width: `${progress}%` }}>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full shadow"></div>
            </div>
          </div>
          <button className="text-white hover:text-[#BF953F]" onClick={() => setIsMuted(!isMuted)}>
            <i className={`fa-solid ${isMuted ? 'fa-volume-xmark' : 'fa-volume-high'}`}></i>
          </button>
          <button className="text-white hover:text-[#BF953F]">
            <i className="fa-solid fa-expand"></i>
          </button>
        </div>
      </div>
    </div>
  );
};

const ApplyButton = ({ onClick }) => {
  return (
    <div className="flex justify-center md:justify-end">
      <button
        onClick={onClick}
        className="group relative px-8 py-4 bg-transparent overflow-hidden rounded-sm transition-all duration-300 hover:-translate-y-1"
      >
        <div className="absolute inset-0 w-full h-full opacity-100 group-hover:opacity-90 transition-opacity" style={customStyles.bgGoldGradient}></div>
        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out skew-y-12"></div>
        <div className="relative flex items-center gap-3">
          <span className="font-bold text-[#051024] tracking-wider text-sm uppercase" style={customStyles.fontMontserrat}>Etkinliğe Başvur</span>
          <i className="fa-solid fa-arrow-right text-[#051024] transform group-hover:translate-x-1 transition-transform"></i>
        </div>
      </button>
    </div>
  );
};

const ApplyModal = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({ name: '', email: '', airline: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Ad Soyad zorunludur.';
    if (!formData.email.trim()) newErrors.email = 'E-posta zorunludur.';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Geçerli bir e-posta giriniz.';
    if (!formData.airline.trim()) newErrors.airline = 'Havayolu bilgisi zorunludur.';
    return newErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
    } else {
      setErrors({});
      setSubmitted(true);
    }
  };

  const handleClose = () => {
    setSubmitted(false);
    setFormData({ name: '', email: '', airline: '', message: '' });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={handleClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>
      <div
        className="relative w-full max-w-lg bg-[#0B1A3A] border border-slate-700/50 rounded-xl p-8 z-10"
        onClick={(e) => e.stopPropagation()}
        style={{ boxShadow: '0 20px 50px -12px rgba(0,0,0,0.8), 0 0 30px -5px rgba(191,149,63,0.15)' }}
      >
        <button onClick={handleClose} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
          <i className="fa-solid fa-xmark text-xl"></i>
        </button>

        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold tracking-wider" style={{ ...customStyles.fontCinzel, ...customStyles.goldGradientText }}>
            ETKİNLİĞE BAŞVUR
          </h2>
          <p className="text-slate-400 text-sm mt-2" style={customStyles.fontMontserrat}>26 Nisan 2026 · Dünya Pilotlar Günü</p>
        </div>

        {submitted ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-[#BF953F]/20 border border-[#BF953F] flex items-center justify-center mx-auto mb-4">
              <i className="fa-solid fa-check text-[#BF953F] text-2xl"></i>
            </div>
            <p className="text-white text-lg font-semibold" style={customStyles.fontCinzel}>Başvurunuz Alındı!</p>
            <p className="text-slate-400 text-sm mt-2">En kısa sürede sizinle iletişime geçeceğiz.</p>
            <button onClick={handleClose} className="mt-6 px-6 py-2 text-sm text-[#BF953F] border border-[#BF953F] rounded-sm hover:bg-[#BF953F]/10 transition-colors">
              Kapat
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs tracking-wider text-slate-400 mb-1 uppercase">Ad Soyad</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-[#051024] border border-slate-700 rounded px-4 py-3 text-white text-sm focus:outline-none focus:border-[#BF953F] transition-colors"
                placeholder="Adınız Soyadınız"
              />
              {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-xs tracking-wider text-slate-400 mb-1 uppercase">E-posta</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-[#051024] border border-slate-700 rounded px-4 py-3 text-white text-sm focus:outline-none focus:border-[#BF953F] transition-colors"
                placeholder="ornek@email.com"
              />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
            </div>
            <div>
              <label className="block text-xs tracking-wider text-slate-400 mb-1 uppercase">Havayolu / Kurum</label>
              <input
                type="text"
                value={formData.airline}
                onChange={(e) => setFormData({ ...formData, airline: e.target.value })}
                className="w-full bg-[#051024] border border-slate-700 rounded px-4 py-3 text-white text-sm focus:outline-none focus:border-[#BF953F] transition-colors"
                placeholder="Havayolu veya Kurum Adı"
              />
              {errors.airline && <p className="text-red-400 text-xs mt-1">{errors.airline}</p>}
            </div>
            <div>
              <label className="block text-xs tracking-wider text-slate-400 mb-1 uppercase">Mesajınız (Opsiyonel)</label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full bg-[#051024] border border-slate-700 rounded px-4 py-3 text-white text-sm focus:outline-none focus:border-[#BF953F] transition-colors resize-none"
                rows={3}
                placeholder="Mesajınız..."
              ></textarea>
            </div>
            <button
              type="submit"
              className="w-full py-3 font-bold text-[#051024] tracking-wider text-sm uppercase rounded-sm transition-all duration-300 hover:-translate-y-0.5"
              style={{ ...customStyles.bgGoldGradient, fontFamily: "'Montserrat', sans-serif" }}
            >
              Başvuruyu Gönder <i className="fa-solid fa-arrow-right ml-2"></i>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

const Footer = () => {
  const spinStyle = {
    animation: 'spin 20s linear infinite',
  };

  return (
    <footer className="relative z-10 w-full bg-[#030814]/80 backdrop-blur-md border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col items-center">
        <span className="text-[10px] md:text-xs font-bold tracking-[0.3em] uppercase text-slate-500 mb-6">Ana Sponsor</span>

        <div className="flex items-center gap-4 group cursor-pointer transition-transform duration-300 hover:scale-105">
          <span className="font-bold text-3xl md:text-4xl tracking-tight text-[#00529b] group-hover:brightness-110 transition-all">DenizBank</span>
          <i className="fa-solid fa-dharmachakra text-[#ed1c24] text-4xl md:text-5xl drop-shadow-lg" style={spinStyle}></i>
        </div>

        <div className="mt-12 w-full max-w-2xl flex flex-col md:flex-row justify-center items-center gap-6 md:gap-12 text-slate-400 text-sm font-light">
          {['Hakkımızda', 'Geçmiş Etkinlikler', 'Basın Odası', 'İletişim'].map((link) => (
            <a key={link} href="#" className="hover:text-[#BF953F] transition-colors relative group">
              {link}
              <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-[#BF953F] group-hover:w-full transition-all duration-300"></span>
            </a>
          ))}
        </div>

        <div className="mt-8 pt-8 w-full border-t border-slate-800/50 flex flex-col md:flex-row justify-between items-center text-[10px] text-slate-600">
          <p>© 2026 Türkiye Havayolu Pilotları Derneği. Tüm hakları saklıdır.</p>
          <div className="flex gap-4 mt-4 md:mt-0">
            {['twitter', 'instagram', 'linkedin', 'youtube'].map((social) => (
              <a key={social} href="#" className="hover:text-slate-400">
                <i className={`fa-brands fa-${social}`}></i>
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

const HomePage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <main className="relative z-10 flex-grow flex flex-col items-center justify-center px-4 md:px-8 max-w-7xl mx-auto w-full pt-4 pb-16">
        <HeroSection />
        <VideoPlayer />

        <div className="w-full max-w-5xl grid md:grid-cols-[1fr,auto] gap-8 items-center relative">
          <div className="hidden md:block absolute left-[-24px] top-2 bottom-2 w-[1px] bg-gradient-to-b from-transparent via-[#BF953F]/40 to-transparent"></div>

          <div className="text-center md:text-left space-y-4">
            <p className="text-xl md:text-2xl leading-relaxed text-slate-300" style={customStyles.fontPlayfair}>
              <span className="text-[#BF953F] text-4xl leading-none align-top opacity-50">"</span>
              Gökyüzünün kahramanları bir araya geliyor. <br className="hidden lg:block" />
              <span className="text-white font-medium">TALPA</span> öncülüğünde, havacılık tarihine saygı ve geleceğe vizyoner bir bakış.
              <span className="text-[#BF953F] text-4xl leading-none align-bottom opacity-50">"</span>
            </p>
          </div>

          <ApplyButton onClick={() => setIsModalOpen(true)} />
        </div>
      </main>

      <ApplyModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};

const App = () => {
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700;800&family=Montserrat:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&display=swap');

      body {
        font-family: 'Montserrat', sans-serif;
        background-color: #051024;
        color: #ffffff;
      }

      @keyframes shine {
        to { background-position: 200% center; }
      }

      @keyframes pulse-gold {
        0% { box-shadow: 0 0 0 0 rgba(191, 149, 63, 0.4); }
        70% { box-shadow: 0 0 0 20px rgba(191, 149, 63, 0); }
        100% { box-shadow: 0 0 0 0 rgba(191, 149, 63, 0); }
      }

      @keyframes spin {
        100% { transform: rotate(360deg); }
      }

      input:focus, textarea:focus {
        outline: none;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  return (
    <Router basename="/">
      <div className="min-h-screen flex flex-col relative overflow-x-hidden" style={{ backgroundColor: '#051024', color: '#ffffff', fontFamily: "'Montserrat', sans-serif" }}>
        <div className="fixed inset-0 bg-[#051024] z-0"></div>
        <div className="fixed inset-0 z-0" style={customStyles.nebulaBg}></div>
        <div className="fixed inset-0 z-0 opacity-20" style={customStyles.starPattern}></div>

        <Nav />

        <Routes>
          <Route path="/" element={<HomePage />} />
        </Routes>

        <Footer />
      </div>
    </Router>
  );
};

export default App;