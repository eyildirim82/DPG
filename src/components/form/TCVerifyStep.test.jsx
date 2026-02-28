/**
 * TCVerifyStep — Unit Tests
 *
 * Havuza özel yedek banner'larının gösterilmesini test eder.
 *   - Eski katılımcı kotası doluysa → eski katılımcı mesajı
 *   - Yeni katılımcı kotası doluysa → yeni katılımcı mesajı
 *   - İkisi de doluysa → genel mesaj
 *   - İkisi de boşsa → banner yok
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import TCVerifyStep from './TCVerifyStep';

describe('TCVerifyStep', () => {
  const baseProps = {
    tcInput: '',
    setTcInput: vi.fn(),
    tcError: null,
    setTcError: vi.fn(),
    submitting: false,
    onSubmit: vi.fn(),
  };

  it('her iki havuz doluyken genel yedek banner gösterir', () => {
    render(<TCVerifyStep {...baseProps} isReturningFull={true} isNewFull={true} />);

    const banner = screen.getByTestId('yedek-banner');
    expect(banner).toBeTruthy();
    expect(banner.textContent).toContain('Tüm asil kontenjanlar dolmuştur');
    expect(banner.textContent).toContain('Yedek Liste');
  });

  it('sadece eski katılımcı havuzu doluyken havuza özel mesaj gösterir', () => {
    render(<TCVerifyStep {...baseProps} isReturningFull={true} isNewFull={false} />);

    const banner = screen.getByTestId('yedek-banner');
    expect(banner).toBeTruthy();
    expect(banner.textContent).toContain('Eski katılımcılar için');
    expect(banner.textContent).toContain('Yedek Liste');
  });

  it('sadece yeni katılımcı havuzu doluyken havuza özel mesaj gösterir', () => {
    render(<TCVerifyStep {...baseProps} isReturningFull={false} isNewFull={true} />);

    const banner = screen.getByTestId('yedek-banner');
    expect(banner).toBeTruthy();
    expect(banner.textContent).toContain('Yeni katılımcılar için');
    expect(banner.textContent).toContain('Yedek Liste');
  });

  it('her iki havuz da boşken yedek banner göstermez', () => {
    render(<TCVerifyStep {...baseProps} isReturningFull={false} isNewFull={false} />);

    expect(screen.queryByTestId('yedek-banner')).toBeNull();
  });

  it('prop verilmediğinde yedek banner göstermez', () => {
    render(<TCVerifyStep {...baseProps} />);

    expect(screen.queryByTestId('yedek-banner')).toBeNull();
  });

  it('TC Kimlik No input alanını her zaman gösterir', () => {
    render(<TCVerifyStep {...baseProps} isReturningFull={true} isNewFull={true} />);

    expect(screen.getByText('11 haneli TC Kimlik Numaranızı giriniz.')).toBeTruthy();
  });
});
