/**
 * Admin Dashboard — Component Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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
const { mockFrom, mockRpc } = vi.hoisted(() => {
  const mockRpc = vi.fn();
  const mockSelect = vi.fn();
  const mockNot = vi.fn();
  const mockIn = vi.fn();
  const mockEq = vi.fn();
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
  return { mockFrom, mockRpc, mockSelect, mockNot, mockIn, mockEq };
});

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: (...args) => mockFrom(...args),
    rpc: (...args) => mockRpc(...args),
  },
}));

import Dashboard from './Dashboard';

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Whitelist count
    let callCount = 0;
    mockFrom.mockImplementation((table) => {
      return {
        select: () => {
          callCount++;
          if (table === 'cf_whitelist') {
            return Promise.resolve({ count: 500 });
          }
          // cf_submissions — different queries based on chain
          return {
            not: () => Promise.resolve({ count: 200 }),
            in: () => Promise.resolve({ count: 150 }),
            eq: () => Promise.resolve({ count: 30 }),
          };
        },
      };
    });

    mockRpc.mockResolvedValue({
      data: {
        asil_capacity: 700,
        total_capacity: 1500,
        total_reserved: 180,
        asil_returning_capacity: 400,
        asil_returning_reserved: 100,
        asil_new_capacity: 300,
        asil_new_reserved: 80,
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

  it('supabase.from ve rpc çağrılır', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith('get_ticket_stats');
    });

    expect(mockFrom).toHaveBeenCalledWith('cf_whitelist');
    expect(mockFrom).toHaveBeenCalledWith('cf_submissions');
  });
});
