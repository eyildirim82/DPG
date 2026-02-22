import React, { useState, useCallback } from 'react';
import { theme } from './styles/theme';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Hero from './components/Hero';
import Sponsor from './components/Sponsor';
import ApplicationForm from './components/ApplicationForm';
import Modal from './components/Modal';

export default function App() {
  const [modalOpen, setModalOpen] = useState(false);

  const scrollTo = useCallback((id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return (
    <div className="bg-dpg-navy text-dpg-text font-body overflow-x-hidden min-h-screen">
      {/* Arka plan deseni */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[#050914]"></div>
        <div
          className="absolute inset-0 opacity-20 mix-blend-screen"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1536514498073-50e69d39c6cf?q=80&w=2071&auto=format&fit=crop')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        ></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[800px] bg-[radial-gradient(circle_at_center,rgba(30,58,138,0.15)_0%,transparent_70%)]"></div>
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.03)_0%,transparent_70%)]"></div>
      </div>
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 lg:px-8 relative z-[2]">
        <Header />
        <Hero onScrollTo={scrollTo} />
        <Sponsor />
        <ApplicationForm onSubmitSuccess={() => setModalOpen(true)} />
        <Footer />
      </div>
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
