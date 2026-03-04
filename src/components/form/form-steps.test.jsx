/**
 * TCVerifyStep — Component Tests
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import TCVerifyStep from './TCVerifyStep';

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
