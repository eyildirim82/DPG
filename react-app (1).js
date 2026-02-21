import React, { useState, useEffect, useRef } from 'react';

const customStyles = {
  root: {
    '--color-bg': '#051424',
    '--color-bg-light': '#0A2239',
    '--color-gold': '#E6C275',
    '--color-gold-dim': '#9E8245',
    '--color-silver': '#C4CCD4',
    '--color-text': '#F0F4F8',
    '--color-text-muted': '#8B9BB4',
  },
  bgEtching: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: 0,
    opacity: 0.15,
    backgroundImage: `url("data:image/svg+xml,%3Csvg width='100%25' height='100%25' viewBox='0 0 1000 1000' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0,500 Q250,400 500,500 T1000,500' fill='none' stroke='%23ffffff' stroke-width='1' stroke-dasharray='10,10'/%3E%3Cpath d='M0,600 Q250,500 500,600 T1000,600' fill='none' stroke='%23ffffff' stroke-width='0.5' stroke-dasharray='5,5'/%3E%3C/svg%3E")`,
    backgroundSize: 'cover',
    mixBlendMode: 'overlay',
  },
  heroGraphic: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '120%',
    height: '100%',
    background: `radial-gradient(circle at center, transparent 30%, #051424 90%), url('https://images.unsplash.com/photo-1506899736830-466d338f0c29?q=80&w=2070&auto=format&fit=crop')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    opacity: 0.4,
    zIndex: -1,
    filter: 'grayscale(100%) sepia(20%) hue-rotate(180deg) contrast(1.2)',
    WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 40%, black 60%, transparent)',
    maskImage: 'linear-gradient(to bottom, transparent, black 40%, black 60%, transparent)',
  },
  h1: {
    fontFamily: "'Cormorant Garamond', serif",
    fontWeight: 400,
    letterSpacing: '0.02em',
    textTransform: 'uppercase',
    fontSize: '4.5rem',
    lineHeight: 1,
    background: 'linear-gradient(to bottom, #E6C275, #9E8245)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '1rem',
    textAlign: 'center',
  },
  h2: {
    fontFamily: "'Cormorant Garamond', serif",
    fontWeight: 400,
    letterSpacing: '0.02em',
    textTransform: 'uppercase',
    fontSize: '2.5rem',
    color: '#C4CCD4',
    textAlign: 'center',
    marginBottom: '3rem',
    position: 'relative',
    display: 'inline-block',
  },
  h2Wrapper: {
    textAlign: 'center',
    marginBottom: '3rem',
  },
  timelineLine: {
    position: 'absolute',
    top: '50%',
    left: 0,
    width: '100%',
    height: '1px',
    background: 'linear-gradient(90deg, transparent, #E6C275, transparent)',
    zIndex: 1,
  },
  timelineLineUnderline: {
    display: 'block',
    width: '60px',
    height: '1px',
    background: '#E6C275',
    margin: '10px auto 0',
  },
  sponsorBox: {
    border: '1px solid #9E8245',
    padding: '4rem',
    maxWidth: '800px',
    margin: '0 auto',
    position: 'relative',
    textAlign: 'center',
  },
  formInput: {
    width: '100%',
    background: 'transparent',
    border: 'none',
    borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
    padding: '1rem 0',
    color: '#F0F4F8',
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: '1.5rem',
    transition: 'border-color 0.3s ease',
    outline: 'none',
  },
  formInputFocused: {
    borderBottomColor: '#E6C275',
  },
  formLabel: {
    position: 'absolute',
    top: 0,
    left: 0,
    fontFamily: "'Inter', sans-serif",
    fontSize: '0.8rem',
    color: '#8B9BB4',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    pointerEvents: 'none',
    transition: 'all 0.3s ease',
  },
  formLabelActive: {
    top: '-20px',
    color: '#E6C275',
    fontSize: '0.7rem',
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'rgba(5, 20, 36, 0.95)',
    backdropFilter: 'blur(10px)',
    zIndex: 100,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0,
    pointerEvents: 'none',
    transition: 'opacity 0.5s ease',
  },
  modalActive: {
    opacity: 1,
    pointerEvents: 'all',
  },
  modalContent: {
    textAlign: 'center',
    border: '1px solid #E6C275',
    padding: '4rem',
    maxWidth: '500px',
    background: '#051424',
    transform: 'translateY(20px)',
    transition: 'transform 0.5s ease',
  },
  modalContentActive: {
    transform: 'translateY(0)',
  },
  qrPattern: {
    width: '100%',
    height: '100%',
    backgroundImage: 'radial-gradient(#000 2px, transparent 2px)',
    backgroundSize: '10px 10px',
  },
};

const FormInput = ({ type = 'text', placeholder = ' ', required, value, onChange, onFocus, onBlur, focused, label, style }) => {
  const hasValue = value && value.length > 0;
  const isActive = focused || hasValue;
  return (
    <div style={{ marginBottom: '2.5rem', position: 'relative' }}>
      <input
        type={type}
        placeholder={placeholder}
        required={required}
        value={value}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        style={{
          ...customStyles.formInput,
          ...(focused ? customStyles.formInputFocused : {}),
          ...(style || {}),
        }}
      />
      <label style={{
        ...customStyles.formLabel,
        ...(isActive ? customStyles.formLabelActive : {}),
      }}>
        {label}
      </label>
    </div>
  );
};

const ProgramCard = ({ time, title, desc }) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => { if (ref.current) observer.unobserve(ref.current); };
  }, []);

  return (
    <div
      ref={ref}
      style={{
        border: '1px solid rgba(196, 204, 212, 0.2)',
        padding: '2rem',
        transition: 'all 0.6s ease',
        position: 'relative',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        cursor: 'default',
        backgroundColor: 'transparent',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = '#E6C275';
        e.currentTarget.style.background = 'rgba(230, 194, 117, 0.05)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'rgba(196, 204, 212, 0.2)';
        e.currentTarget.style.background = 'transparent';
      }}
    >
      <span style={{
        fontFamily: "'Inter', sans-serif",
        fontSize: '0.8rem',
        color: '#E6C275',
        border: '1px solid #E6C275',
        padding: '0.25rem 0.75rem',
        borderRadius: '50px',
        display: 'inline-block',
        marginBottom: '1rem',
      }}>{time}</span>
      <h3 style={{
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: '1.5rem',
        color: '#F0F4F8',
        marginBottom: '0.5rem',
        fontWeight: 400,
        textTransform: 'uppercase',
        letterSpacing: '0.02em',
      }}>{title}</h3>
      <p style={{ color: '#8B9BB4', fontWeight: 300 }}>{desc}</p>
    </div>
  );
};

const TimelineNode = ({ year, label, desc, active }) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => { if (ref.current) observer.unobserve(ref.current); };
  }, []);

  return (
    <div
      ref={ref}
      style={{
        width: '180px',
        textAlign: 'center',
        opacity: visible ? (active ? 1 : 0.5) : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 0.6s ease, transform 0.6s ease',
        cursor: 'pointer',
      }}
      onMouseEnter={e => { e.currentTarget.style.opacity = 1; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.opacity = 0.5; }}
    >
      <div style={{
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        background: active
          ? 'radial-gradient(circle at 30% 30%, #E6C275, #9E8245)'
          : 'radial-gradient(circle at 30% 30%, #2a4055, #051424)',
        border: active ? '1px solid #fff' : '1px solid #E6C275',
        margin: '0 auto 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Cormorant Garamond', serif",
        color: active ? '#051424' : '#E6C275',
        fontSize: '1.2rem',
        boxShadow: active ? '0 0 30px rgba(230, 194, 117, 0.4)' : '0 0 20px rgba(230, 194, 117, 0.1)',
        transform: active ? 'scale(1.1)' : 'scale(1)',
        transition: 'all 0.3s ease',
      }}>{year}</div>
      <span style={{
        display: 'block',
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: '1.5rem',
        marginBottom: '0.5rem',
        color: '#C4CCD4',
        fontWeight: 400,
        textTransform: 'uppercase',
        letterSpacing: '0.02em',
      }}>{label}</span>
      <div style={{ fontSize: '0.85rem', lineHeight: 1.4, color: '#8B9BB4', fontWeight: 300 }}>{desc}</div>
    </div>
  );
};

const Btn = ({ children, onClick, secondary, style, type }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type={type || 'button'}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? (secondary ? '#C4CCD4' : '#E6C275') : 'transparent',
        border: secondary ? '1px solid #C4CCD4' : '1px solid #E6C275',
        color: hovered ? '#051424' : (secondary ? '#C4CCD4' : '#E6C275'),
        padding: '1rem 2.5rem',
        fontFamily: "'Inter', sans-serif",
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        fontSize: '0.8rem',
        cursor: 'pointer',
        transition: 'all 0.4s cubic-bezier(0.25, 1, 0.5, 1)',
        position: 'relative',
        overflow: 'hidden',
        textDecoration: 'none',
        display: 'inline-block',
        ...(style || {}),
      }}
    >
      {children}
    </button>
  );
};

const App = () => {
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500&display=swap');
      * { box-sizing: border-box; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
      body { background-color: #051424; overflow-x: hidden; }
      ::-webkit-scrollbar { width: 6px; }
      ::-webkit-scrollbar-track { background: #051424; }
      ::-webkit-scrollbar-thumb { background: #9E8245; }
      select option { background: #051424; color: #F0F4F8; }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checked, setChecked] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    airline: '',
    email: '',
    phone: '',
    participation: '',
  });
  const [focused, setFocused] = useState({
    name: false,
    airline: false,
    email: false,
    phone: false,
    participation: false,
  });

  const handleFocus = (field) => setFocused(f => ({ ...f, [field]: true }));
  const handleBlur = (field) => setFocused(f => ({ ...f, [field]: false }));
  const handleChange = (field, val) => setFormData(d => ({ ...d, [field]: val }));

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setModalOpen(true);
      setSubmitting(false);
      setFormData({ name: '', airline: '', email: '', phone: '', participation: '' });
      setChecked(false);
    }, 1200);
  };

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div style={{
      backgroundColor: '#051424',
      color: '#F0F4F8',
      fontFamily: "'Inter', sans-serif",
      lineHeight: 1.6,
      overflowX: 'hidden',
      minHeight: '100vh',
    }}>
      <div style={customStyles.bgEtching}></div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem', position: 'relative', zIndex: 2 }}>

        {/* Header */}
        <header style={{
          position: 'absolute',
          top: 0,
          width: 'calc(100% - 4rem)',
          padding: '2rem 0',
          zIndex: 10,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <a href="#" style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: '1.5rem',
            color: '#F0F4F8',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}>
            <div style={{
              width: '30px',
              height: '30px',
              border: '1px solid #E6C275',
              borderRadius: '50%',
            }}></div>
            TALPA
          </a>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", color: '#E6C275' }}>
            26 NİSAN
          </div>
        </header>

        {/* Hero */}
        <section style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          position: 'relative',
          paddingTop: '4rem',
        }}>
          <div style={customStyles.heroGraphic}></div>

          <div style={{
            fontSize: '1.25rem',
            letterSpacing: '0.2em',
            color: '#C4CCD4',
            marginBottom: '2rem',
            textTransform: 'uppercase',
            fontFamily: "'Inter', sans-serif",
            fontWeight: 300,
          }}>26 Nisan 2026</div>

          <h1 style={customStyles.h1}>
            Dünya Pilotlar<br />Günü 2026
          </h1>

          <p style={{
            maxWidth: '600px',
            margin: '0 auto 3rem',
            fontSize: '1.1rem',
            borderLeft: '1px solid #E6C275',
            paddingLeft: '1.5rem',
            textAlign: 'left',
            color: '#8B9BB4',
            fontWeight: 300,
          }}>
            Gökyüzünün kahramanları bir araya geliyor. TALPA öncülüğünde, havacılık tarihine saygı ve geleceğe vizyoner bir bakış.
          </p>

          <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center' }}>
            <Btn onClick={() => scrollTo('basvur')}>Etkinliğe Başvur</Btn>
            <Btn secondary onClick={() => scrollTo('program')}>Programı İncele</Btn>
          </div>

          <div style={{ marginTop: '4rem', opacity: 0.6, fontSize: '0.8rem', letterSpacing: '0.1em', color: '#C4CCD4' }}>
            ANA SPONSOR<br />
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.2rem', color: '#fff' }}>DenizBank</span>
          </div>
        </section>

        {/* About */}
        <section style={{ padding: '8rem 0', position: 'relative' }}>
          <div style={customStyles.h2Wrapper}>
            <h2 style={customStyles.h2}>
              Etkinlik Hakkında
              <span style={customStyles.timelineLineUnderline}></span>
            </h2>
          </div>
          <p style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto', color: '#8B9BB4', fontWeight: 300 }}>
            2014 yılından bu yana Türkiye Havayolu Pilotları Derneği (TALPA) tarafından düzenlenen Dünya Pilotlar Günü, havacılık camiasını birleştiren en prestijli buluşmadır. Bu yıl, gökyüzündeki sınırları kaldıranlara adanmıştır.
          </p>

          <div style={{ position: 'relative', marginTop: '4rem', padding: '2rem 0' }}>
            <div style={customStyles.timelineLine}></div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              position: 'relative',
              zIndex: 2,
              flexWrap: 'wrap',
              gap: '1rem',
            }}>
              <TimelineNode year="2014" label="Başlangıç" desc="İlk resmi kutlama" active={false} />
              <TimelineNode year="2018" label="Global" desc="Uluslararası katılım" active={false} />
              <TimelineNode year="2026" label="Zirve" desc="İstanbul Buluşması" active={true} />
              <TimelineNode year="∞" label="Gelecek" desc="Vizyoner Projeler" active={false} />
            </div>
          </div>
        </section>

        {/* Program */}
        <section id="program" style={{ padding: '6rem 0', background: 'linear-gradient(to bottom, #051424, #0A2239)' }}>
          <div style={customStyles.h2Wrapper}>
            <h2 style={customStyles.h2}>
              Etkinlik Programı
              <span style={customStyles.timelineLineUnderline}></span>
            </h2>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '2rem',
          }}>
            <ProgramCard time="09:00" title="Kayıt ve Karşılama" desc="Atatürk Kültür Merkezi Fuaye Alanı" />
            <ProgramCard time="10:30" title="Açılış Konuşması" desc="TALPA Yönetim Kurulu Başkanı" />
            <ProgramCard time="12:00" title="Panel: Sivil Havacılığın Geleceği" desc="Uluslararası Konuklar Eşliğinde" />
            <ProgramCard time="14:00" title="Ödül Töreni" desc="Yılın Pilotu ve Onur Ödülleri" />
            <ProgramCard time="16:00" title="Kokteyl & Networking" desc="DenizBank Lounge" />
            <ProgramCard time="19:30" title="Gala Yemeği" desc="Boğaz Salonu" />
          </div>
        </section>

        {/* Sponsor */}
        <section style={{ padding: '6rem 0', textAlign: 'center' }}>
          <div style={customStyles.sponsorBox}>
            <div style={{
              position: 'absolute',
              top: '-1px',
              left: '-1px',
              width: '10px',
              height: '10px',
              borderTop: '1px solid #E6C275',
              borderLeft: '1px solid #E6C275',
            }}></div>
            <div style={{
              position: 'absolute',
              bottom: '-1px',
              right: '-1px',
              width: '10px',
              height: '10px',
              borderBottom: '1px solid #E6C275',
              borderRight: '1px solid #E6C275',
            }}></div>
            <p style={{ textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '1rem', fontSize: '0.8rem', color: '#E6C275', fontWeight: 300 }}>
              Değerli Destekleriyle
            </p>
            <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.05em', marginBottom: '1.5rem', display: 'inline-block' }}>
              Deniz<span style={{ color: '#E6C275' }}>Bank</span>
            </div>
            <p style={{ fontStyle: 'italic', color: '#C4CCD4', fontWeight: 300 }}>
              "Gökyüzünde güvenle yol alan tüm pilotlarımızın yanındayız. 2026 Dünya Pilotlar Günü'ne ana sponsor olmaktan gurur duyuyoruz."
            </p>
          </div>
        </section>

        {/* Form */}
        <section id="basvur" style={{ padding: '6rem 0', maxWidth: '700px', margin: '0 auto' }}>
          <div style={customStyles.h2Wrapper}>
            <h2 style={customStyles.h2}>
              Başvuru Formu
              <span style={customStyles.timelineLineUnderline}></span>
            </h2>
          </div>
          <form onSubmit={handleSubmit}>
            <FormInput
              type="text"
              placeholder=" "
              required
              value={formData.name}
              onChange={e => handleChange('name', e.target.value)}
              onFocus={() => handleFocus('name')}
              onBlur={() => handleBlur('name')}
              focused={focused.name}
              label="Ad Soyad"
            />
            <FormInput
              type="text"
              placeholder=" "
              required
              value={formData.airline}
              onChange={e => handleChange('airline', e.target.value)}
              onFocus={() => handleFocus('airline')}
              onBlur={() => handleBlur('airline')}
              focused={focused.airline}
              label="Havayolu Şirketi"
            />
            <FormInput
              type="email"
              placeholder=" "
              required
              value={formData.email}
              onChange={e => handleChange('email', e.target.value)}
              onFocus={() => handleFocus('email')}
              onBlur={() => handleBlur('email')}
              focused={focused.email}
              label="E-Posta Adresi"
            />
            <FormInput
              type="tel"
              placeholder=" "
              required
              value={formData.phone}
              onChange={e => handleChange('phone', e.target.value)}
              onFocus={() => handleFocus('phone')}
              onBlur={() => handleBlur('phone')}
              focused={focused.phone}
              label="Telefon Numarası"
            />

            <div style={{ marginBottom: '2.5rem', position: 'relative' }}>
              <select
                required
                value={formData.participation}
                onChange={e => handleChange('participation', e.target.value)}
                style={{
                  ...customStyles.formInput,
                  color: formData.participation ? '#F0F4F8' : '#8B9BB4',
                }}
              >
                <option value="" disabled>Katılım Tipi Seçiniz</option>
                <option value="physical">Fiziksel Katılım (İstanbul)</option>
                <option value="online">Online Katılım</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '3rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  required
                  checked={checked}
                  onChange={e => setChecked(e.target.checked)}
                  style={{ display: 'none' }}
                />
                <span
                  onClick={() => setChecked(c => !c)}
                  style={{
                    width: '20px',
                    height: '20px',
                    border: '1px solid #E6C275',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  {checked && <span style={{ width: '10px', height: '10px', background: '#E6C275', display: 'block' }}></span>}
                </span>
                <span style={{ marginLeft: '1rem', fontSize: '0.8rem', color: '#8B9BB4', fontWeight: 300 }}>
                  KVKK kapsamında kişisel verilerimin işlenmesini kabul ediyorum.
                </span>
              </label>
            </div>

            <Btn type="submit" style={{ width: '100%', opacity: submitting ? 0.7 : 1 }}>
              {submitting ? 'İşleniyor...' : 'Katılımımı Onayla'}
            </Btn>
          </form>
        </section>

        <footer style={{
          textAlign: 'center',
          padding: '4rem 0',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          fontSize: '0.8rem',
          color: '#8B9BB4',
          fontWeight: 300,
        }}>
          © 2026 TALPA - Türkiye Havayolu Pilotları Derneği. Tüm hakları saklıdır.
        </footer>
      </div>

      {/* Modal */}
      <div style={{
        ...customStyles.modal,
        ...(modalOpen ? customStyles.modalActive : {}),
      }}>
        <div style={{
          ...customStyles.modalContent,
          ...(modalOpen ? customStyles.modalContentActive : {}),
        }}>
          <h3 style={{
            fontFamily: "'Cormorant Garamond', serif",
            color: '#E6C275',
            fontSize: '2rem',
            marginBottom: '1rem',
            fontWeight: 400,
            textTransform: 'uppercase',
            letterSpacing: '0.02em',
          }}>Başvurunuz Alınmıştır</h3>
          <p style={{ color: '#8B9BB4', fontWeight: 300 }}>Kaydınız başarıyla oluşturuldu. Giriş kartınız aşağıdadır.</p>
          <div style={{
            width: '150px',
            height: '150px',
            background: 'white',
            margin: '2rem auto',
            padding: '10px',
            display: 'grid',
            placeItems: 'center',
          }}>
            <div style={customStyles.qrPattern}></div>
          </div>
          <Btn secondary onClick={() => setModalOpen(false)}>Takvime Ekle</Btn>
          <br /><br />
          <a
            href="#"
            onClick={e => { e.preventDefault(); setModalOpen(false); }}
            style={{ color: '#8B9BB4', textDecoration: 'none', fontSize: '0.8rem' }}
          >Kapat</a>
        </div>
      </div>
    </div>
  );
};

export default App;