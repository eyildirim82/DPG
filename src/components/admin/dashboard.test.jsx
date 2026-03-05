/**
 * Admin Dashboard — Component Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';

// ─── lucide-react mock ─────────────────────────
vi.mock('lucide-react', () => ({
  LayoutDashboard: (props) => <svg data-testid="layout-dashboard-icon" {...props} />,
  Users: (props) => <svg data-testid="users-icon" {...props} />,
  UserCheck: (props) => <svg data-testid="user-check-icon" {...props} />,
  Clock: (props) => <svg data-testid="clock-icon" {...props} />,
  ShieldCheck: (props) => <svg data-testid="shield-check-icon" {...props} />,
  Ticket: (props) => <svg data-testid="ticket-icon" {...props} />,
}));

// ─── Supabase mock (vi.hoisted) ────────────────
const { mockFrom, mockRpc, mockChannel, mockOn, mockSubscribe, mockRemoveChannel } = vi.hoisted(() => {
  const mockRpc = vi.fn();
  const mockSelect = vi.fn();
  const mockNot = vi.fn();
  const mockIn = vi.fn();
  const mockEq = vi.fn();
  const mockSubscribe = vi.fn(() => ({ topic: 'admin-dashboard-submissions' }));
  const mockOn = vi.fn(() => ({ subscribe: mockSubscribe }));
  const mockChannel = vi.fn(() => ({ on: mockOn }));
  const mockRemoveChannel = vi.fn();
  const mockFrom = vi.fn(() => ({
    select: (...args) => {
      mockSelect(...args);
      return {
        not: (...notArgs) => { mockNot(...notArgs); return Promise.resolve({ count: 10 }); },
        in: (...inArgs) => { mockIn(...inArgs); return Promise.resolve({ count: 5 }); },
        eq: (...eqArgs) => { mockEq(...eqArgs); return Promise.resolve({ count: 2 }); },
      };
    },
  }));
  return { mockFrom, mockRpc, mockSelect, mockNot, mockIn, mockEq, mockChannel, mockOn, mockSubscribe, mockRemoveChannel };
});

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: (...args) => mockFrom(...args),
    rpc: (...args) => mockRpc(...args),
    channel: (...args) => mockChannel(...args),
    removeChannel: (...args) => mockRemoveChannel(...args),
  },
}));

import Dashboard from './Dashboard';

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockFrom.mockImplementation((table) => {
      return {
        select: (columns, options) => {
          if (table === 'cf_whitelist') {
            return Promise.resolve({ count: 500 });
          }

          if (table === 'cf_submissions' && options?.head === true) {
            return {
              not: () => Promise.resolve({ count: 200 }),
              in: () => Promise.resolve({ count: 150 }),
              eq: () => Promise.resolve({ count: 30 }),
            };
          }

          return {
            not: () => Promise.resolve({ count: 0 }),
            in: () => Promise.resolve({ count: 0 }),
            eq: () => Promise.resolve({ count: 0 }),
          };
        },
      };
    });

    mockRpc.mockResolvedValue({
      data: {
        asil_capacity: 700,
        total_capacity: 1500,
        total_reserved: 180,
        yedek_capacity: 800,
        asil_returning_capacity: 500,
        asil_returning_reserved: 100,
        asil_new_capacity: 200,
        asil_new_reserved: 60,
        yedek_returning_reserved: 10,
        yedek_new_reserved: 10,
      },
      error: null,
    });
  });

  it('"Dashboard Özet" başlığını render eder', async () => {
    render(<Dashboard />);
    expect(screen.getByText('Dashboard Özet')).toBeInTheDocument();
  });

  it('yükleme sırasında spinner gösterir', () => {
    render(<Dashboard />);
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeTruthy();
  });

  it('yükleme tamamlandığında stat kartlarını gösterir', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Beyaz Liste Kayıtları')).toBeInTheDocument();
    });

    expect(screen.getByText('Gelen Başvurular')).toBeInTheDocument();
    expect(screen.getByText('Onaylanan Katılımcı')).toBeInTheDocument();
    expect(screen.getByText('Bekleyen Başvurular')).toBeInTheDocument();
  });

  it('asil eski katılımcı kartını gösterir', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Asil — Eski Katılımcı')).toBeInTheDocument();
    });
  });

  it('asil yeni katılımcı kartını gösterir', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Asil — Yeni Katılımcı')).toBeInTheDocument();
    });
  });

  it('toplam kota kartını gösterir', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Toplam Kota/)).toBeInTheDocument();
    });
  });

  it('yedek eski katılımcı kartını gösterir', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Yedek — Eski Katılımcı')).toBeInTheDocument();
    });
  });

  it('yedek yeni katılımcı kartını gösterir', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Yedek — Yeni Katılımcı')).toBeInTheDocument();
    });
  });

  it('RPC verilerini doğru kartlara yansıtır', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Asil — Eski Katılımcı')).toBeInTheDocument();
    });

    const asilEskiCard = screen.getByText('Asil — Eski Katılımcı').parentElement;
    const asilYeniCard = screen.getByText('Asil — Yeni Katılımcı').parentElement;
    const yedekEskiCard = screen.getByText('Yedek — Eski Katılımcı').parentElement;
    const yedekYeniCard = screen.getByText('Yedek — Yeni Katılımcı').parentElement;

    expect(within(asilEskiCard).getByText('100')).toBeInTheDocument();
    expect(within(asilYeniCard).getByText('60')).toBeInTheDocument();
    expect(within(yedekEskiCard).getByText('10')).toBeInTheDocument();
    expect(within(yedekYeniCard).getByText('10')).toBeInTheDocument();
    expect(screen.getByText('Toplam Asil Başvuru')).toBeInTheDocument();
    expect(screen.getByText('Toplam Yedek Başvuru')).toBeInTheDocument();
    expect(screen.getByText('160')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
  });

  it('supabase.from ve rpc çağrılır', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith('get_ticket_stats');
    });

    expect(mockFrom).toHaveBeenCalledWith('cf_whitelist');
    expect(mockFrom).toHaveBeenCalledWith('cf_submissions');
    expect(mockChannel).toHaveBeenCalledWith('admin-dashboard-submissions');
    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'cf_submissions' },
      expect.any(Function)
    );
    expect(mockSubscribe).toHaveBeenCalled();
  });

  it('unmount sırasında realtime channel temizlenir', async () => {
    const { unmount } = render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Dashboard Özet')).toBeInTheDocument();
    });

    unmount();
    expect(mockRemoveChannel).toHaveBeenCalledTimes(1);
  });
});
