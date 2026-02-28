/**
 * Supabase Client — Unit Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('supabase client', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('env değişkenleri tanımlıysa client oluşturur', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-key-123');

    const { supabase } = await import('../lib/supabase');
    expect(supabase).not.toBeNull();
    expect(supabase).toBeDefined();

    vi.unstubAllEnvs();
  });

  it('env değişkenleri yoksa null döndürür', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');

    const { supabase } = await import('../lib/supabase');
    expect(supabase).toBeNull();

    vi.unstubAllEnvs();
  });
});
