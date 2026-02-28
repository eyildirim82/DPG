/**
 * TCVerifyStep & SeatingStep — Component Tests
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import TCVerifyStep from './TCVerifyStep';
import SeatingStep from './SeatingStep';

// ──────────────────────────────────────────────
// TCVerifyStep
// ──────────────────────────────────────────────
describe('TCVerifyStep', () => {
  const defaultProps = {
    tcInput: '',
    setTcInput: vi.fn(),
    tcError: null,
    setTcError: vi.fn(),
    submitting: false,
    onSubmit: vi.fn((e) => e.preventDefault()),
  };

  it('input ve buton render eder', () => {
    render(<TCVerifyStep {...defaultProps} />);
    expect(screen.getByText(/TC KİMLİK NUMARASINI DOĞRULA VE DEVAM ET/)).toBeInTheDocument();
    expect(screen.getByText(/11 haneli TC Kimlik Numaranızı giriniz/)).toBeInTheDocument();
  });

  it('submitting true iken "Sorgulanıyor..." gösterir', () => {
    render(<TCVerifyStep {...defaultProps} submitting={true} />);
    expect(screen.getByText('Sorgulanıyor...')).toBeInTheDocument();
  });

  it('tcError varsa hata mesajı gösterir', () => {
    render(<TCVerifyStep {...defaultProps} tcError="Test hata mesajı" />);
    expect(screen.getByText('Test hata mesajı')).toBeInTheDocument();
  });

  it('input değiştiğinde setTcInput çağrılır (sadece rakam)', () => {
    const setTcInput = vi.fn();
    const setTcError = vi.fn();
    render(<TCVerifyStep {...defaultProps} setTcInput={setTcInput} setTcError={setTcError} />);

    const input = screen.getByLabelText('TC Kimlik No');
    fireEvent.change(input, { target: { value: '123abc456' } });

    // setTcInput should be called with digits only, sliced to 11
    expect(setTcInput).toHaveBeenCalledWith('123456');
    expect(setTcError).toHaveBeenCalledWith(null);
  });

  it('input 11 haneden uzun değer kabul etmez', () => {
    const setTcInput = vi.fn();
    render(<TCVerifyStep {...defaultProps} setTcInput={setTcInput} />);

    const input = screen.getByLabelText('TC Kimlik No');
    fireEvent.change(input, { target: { value: '123456789012345' } });

    expect(setTcInput).toHaveBeenCalledWith('12345678901');
  });

  it('form submit edildiğinde onSubmit çağrılır', () => {
    const onSubmit = vi.fn((e) => e.preventDefault());
    render(<TCVerifyStep {...defaultProps} onSubmit={onSubmit} />);

    const button = screen.getByText(/TC KİMLİK NUMARASINI DOĞRULA/);
    fireEvent.click(button);

    expect(onSubmit).toHaveBeenCalled();
  });

  it('tcInput prop değeri inputta gösterilir', () => {
    render(<TCVerifyStep {...defaultProps} tcInput="10000000146" />);
    const input = screen.getByLabelText('TC Kimlik No');
    expect(input).toHaveValue('10000000146');
  });
});

// ──────────────────────────────────────────────
// SeatingStep
// ──────────────────────────────────────────────
describe('SeatingStep', () => {
  const defaultProps = {
    selectedCluster: 'Otomatik',
    setSelectedCluster: vi.fn(),
    submittingSeating: false,
    tableStats: [],
    onSubmit: vi.fn((e) => e.preventDefault()),
  };

  it('5 küme seçeneği render eder', () => {
    render(<SeatingStep {...defaultProps} />);
    expect(screen.getByText(/Beni Otomatik Yerleştir/)).toBeInTheDocument();
    expect(screen.getByText('A Kümesi')).toBeInTheDocument();
    expect(screen.getByText('B Kümesi')).toBeInTheDocument();
    expect(screen.getByText('C Kümesi')).toBeInTheDocument();
    expect(screen.getByText('D Kümesi')).toBeInTheDocument();
  });

  it('başvuru onay mesajını gösterir', () => {
    render(<SeatingStep {...defaultProps} />);
    expect(screen.getByText('Başvurunuz Onaylanmıştır!')).toBeInTheDocument();
  });

  it('submit butonunu render eder', () => {
    render(<SeatingStep {...defaultProps} />);
    expect(screen.getByText('Küme Tercihimi Kaydet')).toBeInTheDocument();
  });

  it('submittingSeating true iken "Kaydediliyor..." gösterir', () => {
    render(<SeatingStep {...defaultProps} submittingSeating={true} />);
    expect(screen.getByText('Kaydediliyor...')).toBeInTheDocument();
  });

  it('küme tıklandığında setSelectedCluster çağrılır', () => {
    const setSelectedCluster = vi.fn();
    render(<SeatingStep {...defaultProps} setSelectedCluster={setSelectedCluster} />);

    fireEvent.click(screen.getByText('B Kümesi'));
    expect(setSelectedCluster).toHaveBeenCalledWith('KumeB');
  });

  it('tableStats varsa istatistik gösterir', () => {
    const stats = [
      { cluster: 'KumeA', airline: 'THY', count: 15 },
      { cluster: 'KumeA', airline: 'PGT', count: 8 },
    ];
    render(<SeatingStep {...defaultProps} tableStats={stats} />);
    expect(screen.getByText(/THY: 15/)).toBeInTheDocument();
    expect(screen.getByText(/PGT: 8/)).toBeInTheDocument();
  });

  it('Otomatik kümesinde istatistik göstermez', () => {
    const stats = [{ cluster: 'Otomatik', airline: 'THY', count: 10 }];
    render(<SeatingStep {...defaultProps} tableStats={stats} />);
    expect(screen.queryByText(/THY: 10/)).not.toBeInTheDocument();
  });

  it('form submit edildiğinde onSubmit çağrılır', () => {
    const onSubmit = vi.fn((e) => e.preventDefault());
    render(<SeatingStep {...defaultProps} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByText('Küme Tercihimi Kaydet'));
    expect(onSubmit).toHaveBeenCalled();
  });
});
