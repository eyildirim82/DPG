/**
 * CountdownTimer Component — Tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';

describe('CountdownTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('OPEN_DATE öncesinde geri sayım gösterir', async () => {
    // Set now to 1 day before OPEN_DATE (2 Mart 2026 10:00 UTC+3 = 07:00 UTC)
    vi.setSystemTime(new Date('2026-03-01T07:00:00Z'));

    // Fresh import so getTimeLeft() runs with mocked time
    vi.resetModules();
    const { default: CountdownTimer } = await import('./CountdownTimer');

    const onComplete = vi.fn();
    render(<CountdownTimer onComplete={onComplete} />);

    expect(screen.getByText('Gün')).toBeInTheDocument();
    expect(screen.getByText('Saat')).toBeInTheDocument();
    expect(screen.getByText('Dakika')).toBeInTheDocument();
    expect(screen.getByText('Saniye')).toBeInTheDocument();
    expect(screen.getByText('Başvurular Yakında Açılıyor')).toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('OPEN_DATE geçtiyse null render eder ve onComplete çağrılır', async () => {
    // Set now to after OPEN_DATE
    vi.setSystemTime(new Date('2026-03-03T10:00:00Z'));

    vi.resetModules();
    const { default: CountdownTimer } = await import('./CountdownTimer');

    const onComplete = vi.fn();
    const { container } = render(<CountdownTimer onComplete={onComplete} />);

    // Should render nothing
    expect(container.innerHTML).toBe('');
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('1 gün kalınca gün değeri 01 gösterir', async () => {
    // 1 day before: 2026-03-01T07:00:00Z → OPEN_DATE is 2026-03-02T07:00:00Z
    vi.setSystemTime(new Date('2026-03-01T07:00:00Z'));

    vi.resetModules();
    const { default: CountdownTimer } = await import('./CountdownTimer');

    render(<CountdownTimer onComplete={vi.fn()} />);

    // days = 1, hours = 0, minutes = 0, seconds = 0
    const blocks = screen.getAllByText('01');
    expect(blocks.length).toBeGreaterThanOrEqual(1); // At least the day block shows 01
  });

  it('4 blok (Gün/Saat/Dakika/Saniye) render eder', async () => {
    vi.setSystemTime(new Date('2026-02-28T12:00:00Z'));

    vi.resetModules();
    const { default: CountdownTimer } = await import('./CountdownTimer');

    render(<CountdownTimer onComplete={vi.fn()} />);

    expect(screen.getByText('Gün')).toBeInTheDocument();
    expect(screen.getByText('Saat')).toBeInTheDocument();
    expect(screen.getByText('Dakika')).toBeInTheDocument();
    expect(screen.getByText('Saniye')).toBeInTheDocument();
  });

  it('bilgi banner\'ını gösterir', async () => {
    vi.setSystemTime(new Date('2026-02-28T12:00:00Z'));

    vi.resetModules();
    const { default: CountdownTimer } = await import('./CountdownTimer');

    render(<CountdownTimer onComplete={vi.fn()} />);

    expect(screen.getByText(/Başvuru sistemi otomatik olarak açılacaktır/)).toBeInTheDocument();
  });

  it('tarih bilgisini gösterir', async () => {
    vi.setSystemTime(new Date('2026-02-28T12:00:00Z'));

    vi.resetModules();
    const { default: CountdownTimer } = await import('./CountdownTimer');

    render(<CountdownTimer onComplete={vi.fn()} />);

    expect(screen.getByText(/2 Mart 2026/)).toBeInTheDocument();
  });
});
