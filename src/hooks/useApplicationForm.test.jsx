/**
 * useApplicationForm Hook — Unit Tests
 *
 * Hook'un tüm iş mantığını test eder:
 *   - Başlangıç state'leri
 *   - TC doğrulama (step 1 → step 2 geçişi)
 *   - Hata senaryoları (not_found, debtor, quota_full, already_applied, network)
 *   - Zamanlayıcı (countdown) mantığı
 *   - resetToStep1
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ─── vi.hoisted — mock fonksiyonları hoisted scope'a taşır ───
const { mockRpc } = vi.hoisted(() => {
  const mockRpc = vi.fn();
  return { mockRpc };
});

vi.mock('../lib/supabase', () => ({
  supabase: {
    rpc: (...args) => mockRpc(...args),
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
    functions: { invoke: vi.fn().mockResolvedValue({}) },
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    })),
  },
}));

import useApplicationForm from './useApplicationForm';

describe('useApplicationForm', () => {
  const onSubmitSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Default: get_ticket_stats happy path
    mockRpc.mockImplementation((name) => {
      if (name === 'get_ticket_stats') {
        return Promise.resolve({
          data: { total_capacity: 1500, total_reserved: 100, asil_capacity: 700 },
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ──────────────────────────────────────────────
  // Başlangıç state'leri
  // ──────────────────────────────────────────────
  describe('başlangıç state\'leri', () => {
    it('step 1 ile başlar', () => {
      const { result } = renderHook(() => useApplicationForm({ onSubmitSuccess }));
      expect(result.current.step).toBe(1);
    });

    it('submitting false ile başlar', () => {
      const { result } = renderHook(() => useApplicationForm({ onSubmitSuccess }));
      expect(result.current.submitting).toBe(false);
    });

    it('tcInput boş ile başlar', () => {
      const { result } = renderHook(() => useApplicationForm({ onSubmitSuccess }));
      expect(result.current.tcInput).toBe('');
    });

    it('tcError null ile başlar', () => {
      const { result } = renderHook(() => useApplicationForm({ onSubmitSuccess }));
      expect(result.current.tcError).toBeNull();
    });

    it('apiError null ile başlar', () => {
      const { result } = renderHook(() => useApplicationForm({ onSubmitSuccess }));
      expect(result.current.apiError).toBeNull();
    });

    it('attendedBefore false ile başlar', () => {
      const { result } = renderHook(() => useApplicationForm({ onSubmitSuccess }));
      expect(result.current.attendedBefore).toBe(false);
    });

    it('mount sırasında get_ticket_stats çağrılır', async () => {
      renderHook(() => useApplicationForm({ onSubmitSuccess }));
      await vi.advanceTimersByTimeAsync(100);
      expect(mockRpc).toHaveBeenCalledWith('get_ticket_stats');
    });

    it('her iki asil havuzu dolduğunda quotaStats dual pool verisini döndürür', async () => {
      mockRpc.mockImplementation((name) => {
        if (name === 'get_ticket_stats') {
          return Promise.resolve({
            data: {
              total_capacity: 1500, total_reserved: 800, asil_capacity: 700,
              yedek_capacity: 800,
              asil_returning_capacity: 400, asil_returning_reserved: 400,
              asil_new_capacity: 300, asil_new_reserved: 300,
            },
            error: null,
          });
        }
        return Promise.resolve({ data: [], error: null });
      });

      const { result } = renderHook(() => useApplicationForm({ onSubmitSuccess }));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      expect(result.current.quotaStats).toBeTruthy();
      expect(result.current.quotaStats.asil_returning_reserved).toBeGreaterThanOrEqual(result.current.quotaStats.asil_returning_capacity);
      expect(result.current.quotaStats.asil_new_reserved).toBeGreaterThanOrEqual(result.current.quotaStats.asil_new_capacity);
    });

    it('sadece bir havuz doluysa diğer havuzda hâlâ asil yer vardır', async () => {
      mockRpc.mockImplementation((name) => {
        if (name === 'get_ticket_stats') {
          return Promise.resolve({
            data: {
              total_capacity: 1500, total_reserved: 500, asil_capacity: 700,
              yedek_capacity: 800,
              asil_returning_capacity: 400, asil_returning_reserved: 400,
              asil_new_capacity: 300, asil_new_reserved: 100,
            },
            error: null,
          });
        }
        return Promise.resolve({ data: [], error: null });
      });

      const { result } = renderHook(() => useApplicationForm({ onSubmitSuccess }));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      expect(result.current.quotaStats).toBeTruthy();
      // Returning havuzu dolu
      expect(result.current.quotaStats.asil_returning_reserved).toBeGreaterThanOrEqual(result.current.quotaStats.asil_returning_capacity);
      // New havuzunda hâlâ yer var → isAsilFull false olmalı
      expect(result.current.quotaStats.asil_new_reserved).toBeLessThan(result.current.quotaStats.asil_new_capacity);
    });

    it('her iki havuz da boşken asil yer vardır', async () => {
      mockRpc.mockImplementation((name) => {
        if (name === 'get_ticket_stats') {
          return Promise.resolve({
            data: {
              total_capacity: 1500, total_reserved: 100, asil_capacity: 700,
              yedek_capacity: 800,
              asil_returning_capacity: 400, asil_returning_reserved: 50,
              asil_new_capacity: 300, asil_new_reserved: 50,
            },
            error: null,
          });
        }
        return Promise.resolve({ data: [], error: null });
      });

      const { result } = renderHook(() => useApplicationForm({ onSubmitSuccess }));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      expect(result.current.quotaStats).toBeTruthy();
      expect(result.current.quotaStats.asil_returning_reserved).toBeLessThan(result.current.quotaStats.asil_returning_capacity);
      expect(result.current.quotaStats.asil_new_reserved).toBeLessThan(result.current.quotaStats.asil_new_capacity);
    });
  });

  // ──────────────────────────────────────────────
  // TC Doğrulama (Step 1)
  // ──────────────────────────────────────────────
  describe('handleTcSubmit', () => {
    it('11 haneden kısa TC ile hata verir', async () => {
      const { result } = renderHook(() => useApplicationForm({ onSubmitSuccess }));

      act(() => { result.current.setTcInput('1234567890'); }); // 10 hane

      await act(async () => {
        await result.current.handleTcSubmit({ preventDefault: vi.fn() });
      });

      expect(result.current.tcError).toBe('TC Kimlik No 11 rakamdan oluşmalıdır.');
      expect(result.current.step).toBe(1);
    });

    it('algoritma geçersiz TC ile hata verir', async () => {
      const { result } = renderHook(() => useApplicationForm({ onSubmitSuccess }));

      act(() => { result.current.setTcInput('12345678901'); });

      await act(async () => {
        await result.current.handleTcSubmit({ preventDefault: vi.fn() });
      });

      expect(result.current.tcError).toBe('Geçerli bir TC Kimlik No giriniz.');
      expect(result.current.step).toBe(1);
    });

    it('whitelist\'te olmayan TC ile hata verir', async () => {
      mockRpc.mockImplementation((name) => {
        if (name === 'check_and_lock_slot') {
          return Promise.resolve({
            data: { success: false, error_type: 'not_found' },
            error: null,
          });
        }
        return Promise.resolve({ data: {}, error: null });
      });

      const { result } = renderHook(() => useApplicationForm({ onSubmitSuccess }));
      act(() => { result.current.setTcInput('10000000146'); });

      await act(async () => {
        await result.current.handleTcSubmit({ preventDefault: vi.fn() });
      });

      expect(result.current.tcError).toBeTruthy();
      expect(result.current.step).toBe(1);
    });

    it('borçlu üye ile hata verir', async () => {
      mockRpc.mockImplementation((name) => {
        if (name === 'check_and_lock_slot') {
          return Promise.resolve({
            data: { success: false, error_type: 'debtor' },
            error: null,
          });
        }
        return Promise.resolve({ data: {}, error: null });
      });

      const { result } = renderHook(() => useApplicationForm({ onSubmitSuccess }));
      act(() => { result.current.setTcInput('10000000146'); });

      await act(async () => {
        await result.current.handleTcSubmit({ preventDefault: vi.fn() });
      });

      expect(result.current.tcError).toBeTruthy();
      expect(result.current.step).toBe(1);
    });

    it('kota dolu ile "kotalarımız dolmuştur" hatası', async () => {
      mockRpc.mockImplementation((name) => {
        if (name === 'check_and_lock_slot') {
          return Promise.resolve({
            data: { success: false, error_type: 'quota_full' },
            error: null,
          });
        }
        return Promise.resolve({ data: {}, error: null });
      });

      const { result } = renderHook(() => useApplicationForm({ onSubmitSuccess }));
      act(() => { result.current.setTcInput('10000000146'); });

      await act(async () => {
        await result.current.handleTcSubmit({ preventDefault: vi.fn() });
      });

      expect(result.current.tcError).toBe('Değerli Kaptanlarımız etkinliğe olan ilginizden dolayı teşekkür ederiz. Asil ve yedek kotalarımız tamamen dolmuştur.');
      expect(result.current.step).toBe(1);
    });

    it('başarılı lock ile step 2\'ye geçiş yapar', async () => {
      mockRpc.mockImplementation((name) => {
        if (name === 'check_and_lock_slot') {
          return Promise.resolve({
            data: {
              success: true,
              status: 'locked',
              ticket_type: 'asil',
              remaining_seconds: 600,
              is_attended_before: false,
              cancel_token: 'test-token',
            },
            error: null,
          });
        }
        return Promise.resolve({ data: {}, error: null });
      });

      const { result } = renderHook(() => useApplicationForm({ onSubmitSuccess }));
      act(() => { result.current.setTcInput('10000000146'); });

      await act(async () => {
        await result.current.handleTcSubmit({ preventDefault: vi.fn() });
      });

      expect(result.current.step).toBe(2);
      expect(result.current.ticketType).toBe('asil');
      expect(result.current.tcError).toBeNull();
    });

    it('attended_before=true olunca state güncellenir', async () => {
      mockRpc.mockImplementation((name) => {
        if (name === 'check_and_lock_slot') {
          return Promise.resolve({
            data: {
              success: true,
              status: 'locked',
              ticket_type: 'asil',
              remaining_seconds: 600,
              is_attended_before: true,
            },
            error: null,
          });
        }
        return Promise.resolve({ data: {}, error: null });
      });

      const { result } = renderHook(() => useApplicationForm({ onSubmitSuccess }));
      act(() => { result.current.setTcInput('10000000146'); });

      await act(async () => {
        await result.current.handleTcSubmit({ preventDefault: vi.fn() });
      });

      expect(result.current.attendedBefore).toBe(true);
    });

    it('daha önce başvuru yapılmışsa hata mesajı gösterir', async () => {
      mockRpc.mockImplementation((name) => {
        if (name === 'check_and_lock_slot') {
          return Promise.resolve({
            data: {
              success: true,
              status: 'pending',
            },
            error: null,
          });
        }
        return Promise.resolve({ data: {}, error: null });
      });

      const { result } = renderHook(() => useApplicationForm({ onSubmitSuccess }));
      act(() => { result.current.setTcInput('10000000146'); });

      await act(async () => {
        await result.current.handleTcSubmit({ preventDefault: vi.fn() });
      });

      expect(result.current.tcError).toBe('Bu TC kimlik numarası ile daha önce başvuru yapılmıştır.');
      expect(result.current.step).toBe(1);
    });

    it('ağ hatası durumunda iletişim hatası mesajı gösterir', async () => {
      mockRpc.mockImplementation((name) => {
        if (name === 'check_and_lock_slot') {
          return Promise.reject(new Error('Network Error'));
        }
        return Promise.resolve({ data: {}, error: null });
      });

      const { result } = renderHook(() => useApplicationForm({ onSubmitSuccess }));
      act(() => { result.current.setTcInput('10000000146'); });

      await act(async () => {
        await result.current.handleTcSubmit({ preventDefault: vi.fn() });
      });

      expect(result.current.tcError).toBe('Sistemde bir iletişim hatası oluştu. Lütfen tekrar deneyin.');
    });

    it('harf içeren TC\'den rakamları çıkarır ve doğrular', async () => {
      mockRpc.mockImplementation((name) => {
        if (name === 'check_and_lock_slot') {
          return Promise.resolve({
            data: { success: true, status: 'locked', ticket_type: 'yedek', remaining_seconds: 600 },
            error: null,
          });
        }
        return Promise.resolve({ data: {}, error: null });
      });

      const { result } = renderHook(() => useApplicationForm({ onSubmitSuccess }));
      act(() => { result.current.setTcInput('100-000-001-46'); });

      await act(async () => {
        await result.current.handleTcSubmit({ preventDefault: vi.fn() });
      });

      expect(result.current.step).toBe(2);
    });
  });

  // ──────────────────────────────────────────────
  // Countdown Timer
  // ──────────────────────────────────────────────
  describe('countdown timer', () => {
    it('remainingSeconds set edildiğinde timeLeft formatlanır', async () => {
      mockRpc.mockImplementation((name) => {
        if (name === 'check_and_lock_slot') {
          return Promise.resolve({
            data: {
              success: true,
              status: 'locked',
              ticket_type: 'asil',
              remaining_seconds: 125, // 2:05
            },
            error: null,
          });
        }
        return Promise.resolve({ data: {}, error: null });
      });

      const { result } = renderHook(() => useApplicationForm({ onSubmitSuccess }));
      act(() => { result.current.setTcInput('10000000146'); });

      await act(async () => {
        await result.current.handleTcSubmit({ preventDefault: vi.fn() });
      });

      expect(result.current.timeLeft).toBe('2:05');
    });
  });

  // ──────────────────────────────────────────────
  // resetToStep1
  // ──────────────────────────────────────────────
  describe('resetToStep1', () => {
    it('state\'i sıfırlar ve step 1\'e döner', async () => {
      mockRpc.mockImplementation((name) => {
        if (name === 'check_and_lock_slot') {
          return Promise.resolve({
            data: {
              success: true,
              status: 'locked',
              ticket_type: 'asil',
              remaining_seconds: 600,
              is_attended_before: true,
            },
            error: null,
          });
        }
        return Promise.resolve({ data: {}, error: null });
      });

      const { result } = renderHook(() => useApplicationForm({ onSubmitSuccess }));
      act(() => { result.current.setTcInput('10000000146'); });
      await act(async () => {
        await result.current.handleTcSubmit({ preventDefault: vi.fn() });
      });
      expect(result.current.step).toBe(2);

      act(() => { result.current.resetToStep1(); });

      expect(result.current.step).toBe(1);
      expect(result.current.tcInput).toBe('');
      expect(result.current.attendedBefore).toBe(false);
    });
  });

  // ──────────────────────────────────────────────
  // Döndürülen arayüz
  // ──────────────────────────────────────────────
  describe('döndürülen arayüz', () => {
    it('tüm gerekli state ve handler\'ları döndürür', () => {
      const { result } = renderHook(() => useApplicationForm({ onSubmitSuccess }));

      // State
      expect(result.current).toHaveProperty('step');
      expect(result.current).toHaveProperty('tcInput');
      expect(result.current).toHaveProperty('tcError');
      expect(result.current).toHaveProperty('submitting');
      expect(result.current).toHaveProperty('apiError');
      expect(result.current).toHaveProperty('quotaStats');
      expect(result.current).toHaveProperty('attendedBefore');
      expect(result.current).toHaveProperty('ticketType');
      expect(result.current).toHaveProperty('timeLeft');

      // Handlers
      expect(typeof result.current.handleTcSubmit).toBe('function');
      expect(typeof result.current.onValid).toBe('function');
      expect(typeof result.current.onInvalid).toBe('function');
      expect(typeof result.current.resetToStep1).toBe('function');
      expect(typeof result.current.setTcInput).toBe('function');

      // Form
      expect(result.current.form).toBeDefined();
    });
  });
});
