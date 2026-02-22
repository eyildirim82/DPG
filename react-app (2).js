import React, { useState, useEffect } from 'react';

const customStyles = {
  root: {
    '--c-indigo-deep': '#050A1F',
    '--c-indigo-mid': '#1A2B5E',
    '--c-blue-electric': '#2D5DA1',
    '--c-gold-metallic': '#CFAA6E',
    '--c-gold-light': '#FBE6B7',
    '--c-cloud-white': '#F0F4F8',
    '--c-cloud-shadow': '#AABBC9',
    '--c-void': '#000000',
  },
  atmosphereCanvas: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    zIndex: -1,
    background: `
      radial-gradient(circle at 10% 20%, #2D5DA1, transparent 40%),
      radial-gradient(circle at 80% 0%, #CFAA6E, transparent 30%),
      radial-gradient(circle at 90% 80%, #1A2B5E, transparent 50%),
      linear-gradient(145deg, #050A1F, #000)
    `,
    filter: 'contrast(120%) brightness(0.9)',
  },
  cloudTexture: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: -1,
    opacity: 0.15,
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
    pointerEvents: 'none',
    mixBlendMode: 'overlay',
  },
  orb: {
    position: 'absolute',
    borderRadius: '50%',
    filter: 'blur(80px)',
    opacity: 0.6,
  },
  orb1: {
    width: '60vw',
    height: '60vw',
    background: '#1A2B5E',
    top: '-20%',
    left: '-10%',
  },
  orb2: {
    width: '40vw',
    height: '40vw',
    background: '#6A4C93',
    bottom: '10%',
    right: '-10%',
  },
  orb3: {
    width: '20vw',
    height: '20vw',
    background: '#CFAA6E',
    top: '40%',
    left: '30%',
    mixBlendMode: 'overlay',
  },
  heroTitle: {
    fontFamily: "'Syne', sans-serif",
    fontWeight: 800,
    lineHeight: 0.85,
    textTransform: 'uppercase',
    letterSpacing: '-0.02em',
    fontSize: 'clamp(4rem, 18vw, 20rem)',
    zIndex: 2,
    position: 'relative',
    mixBlendMode: 'overlay',
    color: '#F0F4F8',
    opacity: 0.9,
  },
  heroTitleSpan: {
    display: 'block',
    marginLeft: '15vw',
    color: '#FBE6B7',
    mixBlendMode: 'normal',
  },
  abstractWing: {
    position: 'absolute',
    top: '30%',
    right: '5%',
    width: '40vw',
    height: '60vh',
    background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.2)',
    clipPath: 'polygon(10% 0, 100% 20%, 80% 100%, 0% 80%)',
    transform: 'rotate(-10deg)',
    zIndex: 1,
  },
  contrail: {
    position: 'absolute',
    height: '1px',
    background: 'linear-gradient(90deg, transparent, #CFAA6E, transparent)',
    width: '80%',
    top: '60%',
    left: '10%',
    opacity: 0.5,
    transform: 'rotate(-5deg)',
  },
  btnFlight: {
    background: 'transparent',
    border: '1px solid #CFAA6E',
    color: '#FBE6B7',
    fontFamily: "'Space Mono', monospace",
    fontSize: '1.1rem',
    padding: '1.5rem 3rem',
    cursor: 'pointer',
    position: 'relative',
    overflow: 'hidden',
    transition: 'all 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
    textTransform: 'uppercase',
    clipPath: 'polygon(10% 0, 100% 0, 100% 70%, 90% 100%, 0 100%, 0 30%)',
  },
  btnFlightHover: {
    background: '#CFAA6E',
    color: '#050A1F',
    paddingRight: '4rem',
  },
  conceptText: {
    gridColumn: '2 / 7',
    background: 'rgba(5, 10, 31, 0.4)',
    backdropFilter: 'blur(15px)',
    padding: '4rem',
    borderLeft: '1px solid #CFAA6E',
    position: 'relative',
  },
  conceptImage: {
    gridColumn: '7 / 13',
    height: '600px',
    position: 'relative',
    transform: 'translateY(100px)',
  },
  imgMask: {
    width: '100%',
    height: '100%',
    background: "url('https://images.unsplash.com/photo-1464037866556-6812c9d1c72e?q=80&w=2070&auto=format&fit=crop') center/cover",
    clipPath: 'polygon(20% 0%, 80% 0%, 100% 20%, 100% 80%, 80% 100%, 20% 100%, 0% 80%, 0% 20%)',
    filter: 'grayscale(40%) sepia(20%) hue-rotate(190deg)',
    transition: 'all 0.5s ease',
  },
  imgMaskHover: {
    filter: 'grayscale(0%) sepia(0%)',
    clipPath: 'polygon(25% 0%, 90% 5%, 100% 30%, 95% 90%, 70% 100%, 10% 95%, 0% 70%, 5% 15%)',
  },
  waypointContent: {
    background: 'rgba(255, 255, 255, 0.03)',
    padding: '2rem',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(5px)',
    transition: 'transform 0.3s',
  },
  waypointContentHover: {
    transform: 'translateY(-5px)',
    background: 'rgba(255, 255, 255, 0.07)',
  },
  cockpitPanel: {
    width: '100%',
    maxWidth: '800px',
    background: 'rgba(10, 20, 40, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    padding: '4rem',
    position: 'relative',
    backdropFilter: 'blur(20px)',
    clipPath: 'polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)',
  },
  formInput: {
    width: '100%',
    background: 'transparent',
    border: 'none',
    borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
    padding: '1rem 0',
    color: '#F0F4F8',
    fontFamily: "'Syne', sans-serif",
    fontSize: '1.5rem',
    transition: 'border-color 0.3s',
    outline: 'none',
  },
  formInputFocus: {
    borderBottom: '1px solid #CFAA6E',
  },
  instrumentSubmit: {
    width: '100%',
    padding: '2rem',
    background: 'rgba(255, 215, 0, 0.05)',
    border: '1px solid #CFAA6E',
    color: '#CFAA6E',
    fontFamily: "'Space Mono', monospace",
    textTransform: 'uppercase',
    letterSpacing: '0.2em',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    transition: 'all 0.3s',
  },
  instrumentSubmitHover: {
    background: '#CFAA6E',
    color: '#000',
  },
  radarDeco: {
    width: '20px',
    height: '20px',
    border: '1px dashed currentColor',
    borderRadius: '50%',
  },
  driftLink: {
    fontFamily: "'Space Mono', monospace",
    color: 'rgba(255, 255, 255, 0.4)',
    textDecoration: 'none',
    marginRight: '3rem',
    fontSize: '0.85rem',
    transition: 'color 0.3s',
  },
};

const OrbBackground = () => (
  <>
    <div style={customStyles.atmosphereCanvas} />
    <div style={customStyles.cloudTexture} />
    <div style={{ ...customStyles.orb, ...customStyles.orb1 }} />
    <div style={{ ...customStyles.orb, ...customStyles.orb2 }} />
    <div style={{ ...customStyles.orb, ...customStyles.orb3 }} />
  </>
);

const HeroSection = () => {
  const [btnHovered, setBtnHovered] = useState(false);

  const scrollToRegistration = () => {
    const el = document.getElementById('registration');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        position: 'relative',
        paddingTop: '10vh',
        padding: '10vh 4vw 0',
        maxWidth: '1600px',
        margin: '0 auto',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          overflow: 'hidden',
        }}
      >
        <div style={customStyles.abstractWing} />
        <div style={customStyles.contrail} />
      </div>

      <h1 style={customStyles.heroTitle}>
        WORLD<br />
        <span style={customStyles.heroTitleSpan}>PILOTS' DAY</span>
      </h1>

      <div
        style={{
          marginTop: '5vh',
          marginLeft: 'auto',
          marginRight: '10vw',
          zIndex: 5,
        }}
      >
        <span
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: '0.75rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#CFAA6E',
            display: 'block',
            marginBottom: '1rem',
          }}
        >
          Event Protocol: Alpha
        </span>
        <button
          style={btnHovered ? { ...customStyles.btnFlight, ...customStyles.btnFlightHover } : customStyles.btnFlight}
          onMouseEnter={() => setBtnHovered(true)}
          onMouseLeave={() => setBtnHovered(false)}
          onClick={scrollToRegistration}
        >
          Initialize Ascent
          {btnHovered && (
            <span style={{ position: 'absolute', right: '1.5rem', opacity: 1 }}>-&gt;</span>
          )}
        </button>
      </div>
    </section>
  );
};

const ConceptSection = () => {
  const [imgHovered, setImgHovered] = useState(false);

  return (
    <section
      style={{
        position: 'relative',
        padding: '15vh 0',
        overflow: 'hidden',
        maxWidth: '1600px',
        margin: '0 auto',
        paddingLeft: '4vw',
        paddingRight: '4vw',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: '5vw',
          fontFamily: "'Syne', sans-serif",
          fontSize: '4vw',
          color: 'rgba(255,255,255,0.05)',
          pointerEvents: 'none',
          zIndex: -1,
          whiteSpace: 'nowrap',
          fontWeight: 800,
          textTransform: 'uppercase',
        }}
      >
        TO BREAK THE BONDS OF EARTH
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(12, 1fr)',
          gap: '20px',
        }}
      >
        <div style={customStyles.conceptText}>
          <span
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: '0.75rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#CFAA6E',
              display: 'block',
              marginBottom: '1rem',
            }}
          >
            01 // The Vision
          </span>
          <h2
            style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 800,
              lineHeight: 0.85,
              textTransform: 'uppercase',
              letterSpacing: '-0.02em',
              fontSize: 'clamp(2rem, 4vw, 5rem)',
            }}
          >
            Atmospheric<br />
            <span
              style={{
                background: 'linear-gradient(180deg, #F0F4F8 20%, #FBE6B7 100%)',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Liberation
            </span>
          </h2>
          <br />
          <p
            style={{
              fontSize: '1.25rem',
              marginBottom: '2rem',
              fontWeight: 300,
              fontFamily: "'Space Mono', monospace",
              lineHeight: 1.6,
            }}
          >
            We are not gathering to stand on the ground. We are gathering to dissolve the horizon.
            World Pilots' Day is an experimental convergence of aerodynamics, digital art, and human ambition.
          </p>
          <p
            style={{
              fontSize: '1.25rem',
              marginBottom: '2rem',
              fontWeight: 300,
              fontFamily: "'Space Mono', monospace",
              lineHeight: 1.6,
            }}
          >
            Forget the tarmac. This is about the feeling of lift. The moment gravity surrenders to velocity.
            An immersive exploration of what it means to navigate the void.
          </p>
        </div>

        <div style={customStyles.conceptImage}>
          <div
            style={imgHovered ? { ...customStyles.imgMask, ...customStyles.imgMaskHover } : customStyles.imgMask}
            onMouseEnter={() => setImgHovered(true)}
            onMouseLeave={() => setImgHovered(false)}
          />
        </div>
      </div>
    </section>
  );
};

const WaypointItem = ({ time, title, description, isEven }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '2rem',
        width: '50%',
        marginLeft: isEven ? '45%' : '10%',
        position: 'relative',
      }}
    >
      <div
        style={{
          width: '12px',
          height: '12px',
          border: '1px solid #CFAA6E',
          background: '#050A1F',
          transform: 'rotate(45deg)',
          marginTop: '1rem',
          flexShrink: 0,
          boxShadow: '0 0 15px #CFAA6E',
        }}
      />
      <div
        style={hovered ? { ...customStyles.waypointContent, ...customStyles.waypointContentHover } : customStyles.waypointContent}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <span
          style={{
            fontFamily: "'Space Mono', monospace",
            color: '#CFAA6E',
            fontSize: '0.9rem',
            marginBottom: '0.5rem',
            display: 'block',
          }}
        >
          {time}
        </span>
        <h3
          style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 400,
            lineHeight: 0.85,
            textTransform: 'uppercase',
            letterSpacing: '-0.02em',
            fontSize: '2rem',
            marginBottom: '1rem',
          }}
        >
          {title}
        </h3>
        <p style={{ fontFamily: "'Space Mono', monospace", lineHeight: 1.6 }}>{description}</p>
      </div>
    </div>
  );
};

const JourneySection = () => {
  const waypoints = [
    {
      time: '0900 ZULU // PRE-FLIGHT',
      title: 'Aural Ascension',
      description: 'A soundscape experience mimicking the climb from sea level to stratosphere. Headphones mandatory.',
      isEven: false,
    },
    {
      time: '1200 ZULU // CRUISE',
      title: 'The Cockpit of Tomorrow',
      description: 'Interactive deconstruction of flight instrumentation using generative AI interfaces.',
      isEven: true,
    },
    {
      time: '1600 ZULU // DESCENT',
      title: 'Vertical Horizons',
      description: 'Keynote on the future of supersonic travel and breaking the sound barrier of design.',
      isEven: false,
    },
  ];

  return (
    <section
      style={{
        padding: '10vh 4vw',
        position: 'relative',
        maxWidth: '1600px',
        margin: '0 auto',
      }}
    >
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 0,
        }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M100,0 C100,200 600,300 600,500 S200,800 200,1000"
          style={{
            fill: 'none',
            stroke: '#CFAA6E',
            strokeWidth: 1,
            strokeDasharray: '5, 10',
            opacity: 0.4,
          }}
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '15vh',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {waypoints.map((wp, i) => (
          <WaypointItem key={i} {...wp} />
        ))}
      </div>
    </section>
  );
};

const RegistrationSection = () => {
  const [formData, setFormData] = useState({ name: '', email: '', org: '' });
  const [focusedField, setFocusedField] = useState(null);
  const [submitHovered, setSubmitHovered] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (field) => (e) => {
    setFormData({ ...formData, [field]: e.target.value });
  };

  const handleSubmit = () => {
    if (formData.name && formData.email) {
      setSubmitted(true);
    }
  };

  return (
    <section
      id="registration"
      style={{
        padding: '20vh 4vw',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div style={customStyles.cockpitPanel}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginBottom: '3rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            paddingBottom: '1rem',
          }}
        >
          <h2
            style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 800,
              lineHeight: 0.85,
              textTransform: 'uppercase',
              letterSpacing: '-0.02em',
              fontSize: 'clamp(2rem, 4vw, 5rem)',
            }}
          >
            Flight Manifest
          </h2>
          <span
            style={{
              fontFamily: "'Space Mono', monospace",
              color: '#CFAA6E',
              opacity: 0.5,
              fontSize: '0.7rem',
            }}
          >
            LAT 34.0522 N / LON 118.2437 W
          </span>
        </div>

        {submitted ? (
          <div
            style={{
              textAlign: 'center',
              padding: '3rem 0',
              fontFamily: "'Space Mono', monospace",
            }}
          >
            <p style={{ color: '#CFAA6E', fontSize: '1.2rem', marginBottom: '1rem', letterSpacing: '0.1em' }}>
              CLEARANCE GRANTED
            </p>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>
              Your flight manifest has been received. Stand by for further communications.
            </p>
          </div>
        ) : (
          <form onSubmit={(e) => e.preventDefault()}>
            {[
              { label: 'Callsign / Name', type: 'text', placeholder: 'Maverick', field: 'name' },
              { label: 'Frequency / Email', type: 'email', placeholder: 'pilot@airspace.com', field: 'email' },
              { label: 'Vector / Organization', type: 'text', placeholder: 'Civil Air Patrol', field: 'org' },
            ].map(({ label, type, placeholder, field }) => (
              <div key={field} style={{ marginBottom: '2.5rem', position: 'relative' }}>
                <label
                  style={{
                    position: 'absolute',
                    top: '-10px',
                    left: 0,
                    fontFamily: "'Space Mono', monospace",
                    fontSize: '0.75rem',
                    color: 'rgba(255, 255, 255, 0.5)',
                    textTransform: 'uppercase',
                  }}
                >
                  {label}
                </label>
                <input
                  type={type}
                  placeholder={placeholder}
                  value={formData[field]}
                  onChange={handleChange(field)}
                  onFocus={() => setFocusedField(field)}
                  onBlur={() => setFocusedField(null)}
                  style={{
                    ...customStyles.formInput,
                    borderBottom: focusedField === field
                      ? '1px solid #CFAA6E'
                      : '1px solid rgba(255, 255, 255, 0.2)',
                  }}
                />
              </div>
            ))}

            <button
              type="button"
              style={submitHovered ? { ...customStyles.instrumentSubmit, ...customStyles.instrumentSubmitHover } : customStyles.instrumentSubmit}
              onMouseEnter={() => setSubmitHovered(true)}
              onMouseLeave={() => setSubmitHovered(false)}
              onClick={handleSubmit}
            >
              <span>Request Clearance</span>
              <div style={customStyles.radarDeco} />
            </button>
          </form>
        )}
      </div>
    </section>
  );
};

const Footer = () => {
  const [hoveredLink, setHoveredLink] = useState(null);
  const links = ['Radar', 'Telemetry', 'Communications'];

  return (
    <footer
      style={{
        padding: '5vh 4vw',
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
      }}
    >
      <div>
        {links.map((link) => (
          <a
            key={link}
            href="#"
            style={{
              ...customStyles.driftLink,
              color: hoveredLink === link ? '#FBE6B7' : 'rgba(255, 255, 255, 0.4)',
            }}
            onMouseEnter={() => setHoveredLink(link)}
            onMouseLeave={() => setHoveredLink(null)}
          >
            {link}
          </a>
        ))}
      </div>
      <div>
        <span
          style={{
            fontFamily: "'Space Mono', monospace",
            color: '#CFAA6E',
            opacity: 0.5,
            fontSize: '0.7rem',
          }}
        >
          DESIGNED IN THE CLOUDS // EST. 2024
        </span>
      </div>
    </footer>
  );
};

const App = () => {
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Syne:wght@400;700;800&display=swap');
      
      * { box-sizing: border-box; margin: 0; padding: 0; }
      
      body {
        background-color: #050A1F;
        color: #F0F4F8;
        font-family: 'Space Mono', monospace;
        overflow-x: hidden;
        font-size: 16px;
        line-height: 1.6;
      }

      @keyframes drift {
        0% { transform: translate(0, 0) scale(1); }
        100% { transform: translate(5%, 10%) scale(1.1); }
      }

      @keyframes radar-spin {
        to { transform: rotate(360deg); }
      }

      .orb-animate-1 {
        animation: drift 25s infinite alternate cubic-bezier(0.45, 0, 0.55, 1);
      }
      .orb-animate-2 {
        animation: drift 30s infinite alternate cubic-bezier(0.45, 0, 0.55, 1);
        animation-delay: -5s;
      }
      .orb-animate-3 {
        animation: drift 15s infinite alternate cubic-bezier(0.45, 0, 0.55, 1);
      }
      .radar-spin {
        animation: radar-spin 2s linear infinite;
      }

      input::placeholder {
        color: rgba(240, 244, 248, 0.3);
      }

      @media (max-width: 768px) {
        .concept-grid-responsive {
          display: flex !important;
          flex-direction: column !important;
        }
        .concept-image-responsive {
          height: 300px !important;
          transform: none !important;
          margin-bottom: 2rem;
        }
        .concept-text-responsive {
          grid-column: unset !important;
        }
        .waypoint-responsive {
          width: 100% !important;
          margin-left: 0 !important;
          padding-left: 20px;
          border-left: 1px dashed #CFAA6E;
        }
        .waypoint-marker-responsive {
          display: none !important;
        }
        .cockpit-panel-responsive {
          padding: 2rem !important;
        }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  return (
    <div
      style={{
        backgroundColor: '#050A1F',
        color: '#F0F4F8',
        fontFamily: "'Space Mono', monospace",
        overflowX: 'hidden',
        fontSize: '16px',
        lineHeight: 1.6,
        minHeight: '100vh',
        position: 'relative',
      }}
    >
      <OrbBackground />

      <div className="orb-animate-1" style={{ ...customStyles.orb, ...customStyles.orb1 }} />
      <div className="orb-animate-2" style={{ ...customStyles.orb, ...customStyles.orb2 }} />
      <div className="orb-animate-3" style={{ ...customStyles.orb, ...customStyles.orb3 }} />

      <main>
        <HeroSection />
        <ConceptSection />
        <JourneySection />
        <RegistrationSection />
        <Footer />
      </main>
    </div>
  );
};

export default App;