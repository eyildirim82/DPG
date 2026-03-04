import { describe, it, expect } from 'vitest';
import { fetchPublicRuntimeFlags, DEFAULT_RUNTIME_FLAGS } from './runtimeFlags';

describe('runtime flags helper', () => {
  it('client yoksa default değer döner', async () => {
    const flags = await fetchPublicRuntimeFlags(null);
    expect(flags).toEqual(DEFAULT_RUNTIME_FLAGS);
  });

  it('rpc başarılıysa runtime flagleri döner', async () => {
    const mockClient = {
      rpc: async () => ({
        data: {
          countdown_enabled: false,
          applications_closed: true,
          checkin_enabled: true,
          otp_enabled: true,
          otp_bypass_enabled: true,
          checkin_actions_enabled: false,
        },
        error: null,
      }),
    };

    const flags = await fetchPublicRuntimeFlags(mockClient);
    expect(flags).toEqual({
      countdown_enabled: false,
      applications_closed: true,
      checkin_enabled: true,
      otp_enabled: true,
      otp_bypass_enabled: true,
      checkin_actions_enabled: false,
    });
  });

  it('rpc hata verirse default değerlere düşer', async () => {
    const mockClient = {
      rpc: async () => ({ data: null, error: new Error('rpc failed') }),
    };

    const flags = await fetchPublicRuntimeFlags(mockClient);
    expect(flags).toEqual(DEFAULT_RUNTIME_FLAGS);
  });
});
