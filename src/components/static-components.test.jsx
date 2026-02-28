/**
 * Static / Presentational Component — Render Tests
 *
 * framer-motion ve video/image bağımlılıklarını mock'layarak
 * tüm bileşenlerin smoke test'ini yapar.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// ─── framer-motion mock ────────────────────────
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }) => <>{children}</>,
  motion: new Proxy(
    {},
    {
      get: (_, tag) => {
        // motion.div, motion.section, etc. — render as plain HTML elements
        return React.forwardRef(({ children, initial, animate, exit, transition, whileInView, whileHover, viewport, variants, ...rest }, ref) => {
          const Tag = typeof tag === 'string' ? tag : 'div';
          return React.createElement(Tag, { ...rest, ref }, children);
        });
      },
    },
  ),
}));

// lucide-react mock (ArtistsList imports Music3)
vi.mock('lucide-react', () => ({
  Music3: () => <svg data-testid="music3-icon" />,
}));

// supabase mock (ContactForm uses it)
vi.mock('../lib/supabase', () => ({
  supabase: {
    functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: null }) },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

import Header from './layout/Header';
import Footer from './layout/Footer';
import Program from './Program';
import Timeline from './Timeline';
import Sponsor from './Sponsor';
import SponsorsList from './SponsorsList';
import ArtistsList from './ArtistsList';
import DocumentLinks from './DocumentLinks';
import Goldsponsor from './Goldsponsor';
import ProgramCard from './ui/ProgramCard';
import TimelineNode from './ui/TimelineNode';
import ContactForm from './ContactForm';
import Hero from './Hero';

// ──────────────────────────────────────────────
// Header
// ──────────────────────────────────────────────
describe('Header', () => {
  it('TALPA logosunu render eder', () => {
    render(<Header />);
    expect(screen.getByAltText(/TALPA/)).toBeInTheDocument();
  });

  it('altMode=false iken # linki kullanır', () => {
    render(<Header />);
    const link = screen.getByLabelText('TALPA Ana Sayfa');
    expect(link).toHaveAttribute('href', '#');
  });

  it('altMode=true iken ? linki kullanır', () => {
    render(<Header altMode={true} />);
    const link = screen.getByLabelText('TALPA Ana Sayfa');
    expect(link).toHaveAttribute('href', '?');
  });
});

// ──────────────────────────────────────────────
// Footer
// ──────────────────────────────────────────────
describe('Footer', () => {
  it('copyright metnini render eder', () => {
    render(<Footer />);
    expect(screen.getByText(/© 2026 TALPA/)).toBeInTheDocument();
  });

  it('footer elementini render eder', () => {
    const { container } = render(<Footer />);
    expect(container.querySelector('footer')).toBeTruthy();
  });
});

// ──────────────────────────────────────────────
// Program
// ──────────────────────────────────────────────
describe('Program', () => {
  it('"Etkinlik Programı" başlığını render eder', () => {
    render(<Program />);
    expect(screen.getByText('Etkinlik Programı')).toBeInTheDocument();
  });

  it('placeholder mesajını gösterir', () => {
    render(<Program />);
    expect(screen.getByText(/etkinlik programı netleşmedi/i)).toBeInTheDocument();
  });
});

// ──────────────────────────────────────────────
// Timeline
// ──────────────────────────────────────────────
describe('Timeline', () => {
  it('"Etkinlik Hakkında" başlığını render eder', () => {
    render(<Timeline />);
    expect(screen.getByText('Etkinlik Hakkında')).toBeInTheDocument();
  });

  it('timeline node\'larını render eder', () => {
    render(<Timeline />);
    expect(screen.getByText('2014')).toBeInTheDocument();
    expect(screen.getByText('2026')).toBeInTheDocument();
  });

  it('TALPA açıklama metnini gösterir', () => {
    render(<Timeline />);
    expect(screen.getByText(/TALPA.*tarafından düzenlenen/)).toBeInTheDocument();
  });
});

// ──────────────────────────────────────────────
// Sponsor
// ──────────────────────────────────────────────
describe('Sponsor', () => {
  it('"Ana Sponsor" başlığını render eder', () => {
    render(<Sponsor />);
    expect(screen.getByText('Ana Sponsor')).toBeInTheDocument();
  });

  it('DenizBank logosunu render eder', () => {
    render(<Sponsor />);
    expect(screen.getByAltText('DenizBank')).toBeInTheDocument();
  });
});

// ──────────────────────────────────────────────
// SponsorsList
// ──────────────────────────────────────────────
describe('SponsorsList', () => {
  it('"Sponsorlarımız" başlığını render eder', () => {
    render(<SponsorsList />);
    expect(screen.getByText('Sponsorlarımız')).toBeInTheDocument();
  });

  it('sponsor logolarını render eder', () => {
    render(<SponsorsList />);
    expect(screen.getByAltText('DenizBank')).toBeInTheDocument();
    expect(screen.getByAltText('NorthernLAND')).toBeInTheDocument();
    expect(screen.getByAltText('İGA PASS')).toBeInTheDocument();
    expect(screen.getByAltText('HAVAIST')).toBeInTheDocument();
  });
});

// ──────────────────────────────────────────────
// ArtistsList
// ──────────────────────────────────────────────
describe('ArtistsList', () => {
  it('"Sanatçılar" başlığını render eder', () => {
    render(<ArtistsList />);
    expect(screen.getByText('Sanatçılar')).toBeInTheDocument();
  });

  it('sanatçı isimlerini gösterir', () => {
    render(<ArtistsList />);
    expect(screen.getByText('Derya ULUĞ')).toBeInTheDocument();
    expect(screen.getByText('İlknur Tuncer')).toBeInTheDocument();
  });
});

// ──────────────────────────────────────────────
// DocumentLinks
// ──────────────────────────────────────────────
describe('DocumentLinks', () => {
  it('doküman linklerini render eder', () => {
    render(<DocumentLinks />);
    expect(screen.getByText('Acil Durum Planı')).toBeInTheDocument();
    expect(screen.getByText('Ulaşım Bilgileri')).toBeInTheDocument();
    expect(screen.getByText('Menü')).toBeInTheDocument();
  });
});

// ──────────────────────────────────────────────
// Goldsponsor
// ──────────────────────────────────────────────
describe('Goldsponsor', () => {
  it('"Altın Sponsor" başlığını render eder', () => {
    render(<Goldsponsor />);
    expect(screen.getByText('Altın Sponsor')).toBeInTheDocument();
  });

  it('NorthernLAND logosunu render eder', () => {
    render(<Goldsponsor />);
    expect(screen.getByAltText('NorthernLAND')).toBeInTheDocument();
  });
});

// ──────────────────────────────────────────────
// ProgramCard
// ──────────────────────────────────────────────
describe('ProgramCard', () => {
  it('time, title, desc render eder', () => {
    render(<ProgramCard time="10:00" title="Açılış" desc="Açılma saati" />);
    expect(screen.getByText('10:00')).toBeInTheDocument();
    expect(screen.getByText('Açılış')).toBeInTheDocument();
    expect(screen.getByText('Açılma saati')).toBeInTheDocument();
  });
});

// ──────────────────────────────────────────────
// TimelineNode
// ──────────────────────────────────────────────
describe('TimelineNode', () => {
  it('year, label, desc render eder', () => {
    render(<TimelineNode year="2026" label="Zirve" desc="İstanbul" active={true} />);
    expect(screen.getByText('2026')).toBeInTheDocument();
    expect(screen.getByText('Zirve')).toBeInTheDocument();
    expect(screen.getByText('İstanbul')).toBeInTheDocument();
  });

  it('aktif node\'da gold stili uygulanır', () => {
    const { container } = render(<TimelineNode year="2026" label="Zirve" desc="Test" active={true} />);
    const circle = container.querySelector('.bg-gradient-to-br');
    expect(circle.className).toContain('from-dpg-gold');
  });

  it('inaktif node\'da farklı stil uygulanır', () => {
    const { container } = render(<TimelineNode year="2018" label="Global" desc="Test" active={false} />);
    const circle = container.querySelector('.bg-gradient-to-br');
    expect(circle.className).toContain('from-[#2a4055]');
  });
});

// ──────────────────────────────────────────────
// Hero
// ──────────────────────────────────────────────
describe('Hero', () => {
  it('"Dünya Pilotlar Günü" başlığını render eder', () => {
    render(<Hero onScrollTo={vi.fn()} />);
    expect(screen.getByText('Dünya Pilotlar Günü')).toBeInTheDocument();
  });

  it('"26 Nisan 2026" tarihini gösterir', () => {
    render(<Hero onScrollTo={vi.fn()} />);
    expect(screen.getByText('26 Nisan 2026')).toBeInTheDocument();
  });

  it('"Etkinliğe Başvur" butonunu render eder', () => {
    render(<Hero onScrollTo={vi.fn()} />);
    expect(screen.getByText('Etkinliğe Başvur')).toBeInTheDocument();
  });

  it('buton tıklandığında onScrollTo çağrılır', () => {
    const onScrollTo = vi.fn();
    render(<Hero onScrollTo={onScrollTo} />);
    fireEvent.click(screen.getByText('Etkinliğe Başvur'));
    expect(onScrollTo).toHaveBeenCalledWith('basvur');
  });
});

// ──────────────────────────────────────────────
// ContactForm
// ──────────────────────────────────────────────
describe('ContactForm', () => {
  it('"İletişim" başlığını render eder', () => {
    render(<ContactForm />);
    expect(screen.getByText('İletişim')).toBeInTheDocument();
  });

  it('form alanlarını render eder', () => {
    render(<ContactForm />);
    expect(screen.getByText('Ad Soyad')).toBeInTheDocument();
    expect(screen.getByText('E-Posta Adresi')).toBeInTheDocument();
    expect(screen.getByText('Konu')).toBeInTheDocument();
  });

  it('"MESAJ GÖNDER" butonunu render eder', () => {
    render(<ContactForm />);
    expect(screen.getByText('MESAJ GÖNDER')).toBeInTheDocument();
  });
});
