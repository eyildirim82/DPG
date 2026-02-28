/**
 * Modal Component — Tests
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import Modal from './Modal';

// framer-motion mock — AnimatePresence & motion.div basit div olarak render edilir
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }) => <div {...Object.fromEntries(
      Object.entries(props).filter(([k]) => !['initial', 'animate', 'exit', 'transition'].includes(k))
    )}>{children}</div>,
  },
}));

describe('Modal', () => {
  it('isOpen=false iken hiçbir şey render etmez', () => {
    render(<Modal isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByText('Başvurunuz Alınmıştır')).not.toBeInTheDocument();
  });

  it('isOpen=true iken "Başvurunuz Alınmıştır" gösterir', () => {
    render(<Modal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Başvurunuz Alınmıştır')).toBeInTheDocument();
  });

  it('isUpdate=true iken "Başvurunuz Güncellenmiştir" gösterir', () => {
    render(<Modal isOpen={true} onClose={vi.fn()} isUpdate={true} />);
    expect(screen.getByText('Başvurunuz Güncellenmiştir')).toBeInTheDocument();
  });

  it('isUpdate=false iken kayıt oluşturma mesajı gösterir', () => {
    render(<Modal isOpen={true} onClose={vi.fn()} isUpdate={false} />);
    expect(screen.getByText(/Kaydınız başarıyla oluşturulmuştur/)).toBeInTheDocument();
  });

  it('isUpdate=true iken güncelleme mesajı gösterir', () => {
    render(<Modal isOpen={true} onClose={vi.fn()} isUpdate={true} />);
    expect(screen.getByText(/Kayıt bilgileriniz başarıyla güncellenmiştir/)).toBeInTheDocument();
  });

  it('"Takvime Ekle" butonu render eder', () => {
    render(<Modal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Takvime Ekle')).toBeInTheDocument();
  });

  it('"Kapat" linki render eder', () => {
    render(<Modal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Kapat')).toBeInTheDocument();
  });

  it('"Kapat" tıklandığında onClose çağrılır', () => {
    const onClose = vi.fn();
    render(<Modal isOpen={true} onClose={onClose} />);
    fireEvent.click(screen.getByText('Kapat'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('"Takvime Ekle" tıklandığında onClose çağrılır', () => {
    const onClose = vi.fn();
    render(<Modal isOpen={true} onClose={onClose} />);
    fireEvent.click(screen.getByText('Takvime Ekle'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
