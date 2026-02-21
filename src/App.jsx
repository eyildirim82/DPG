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
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-[0.15] bg-cover mix-blend-overlay"
        style={{
          backgroundImage: theme.bgEtching,
        }}
      />
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
