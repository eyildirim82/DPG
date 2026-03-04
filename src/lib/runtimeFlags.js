import { supabase } from './supabase';

export const DEFAULT_RUNTIME_FLAGS = {
  countdown_enabled: true,
  applications_closed: false,
  checkin_enabled: false,
  otp_enabled: false,
  otp_bypass_enabled: false,
  checkin_actions_enabled: false,
};

export async function fetchPublicRuntimeFlags(client = supabase) {
  if (!client) {
    return DEFAULT_RUNTIME_FLAGS;
  }

  try {
    const { data, error } = await client.rpc('get_public_runtime_flags');
    if (error) throw error;

    if (!data || typeof data !== 'object') {
      return DEFAULT_RUNTIME_FLAGS;
    }

    return {
      countdown_enabled: data.countdown_enabled ?? DEFAULT_RUNTIME_FLAGS.countdown_enabled,
      applications_closed: data.applications_closed ?? DEFAULT_RUNTIME_FLAGS.applications_closed,
      checkin_enabled: data.checkin_enabled ?? DEFAULT_RUNTIME_FLAGS.checkin_enabled,
      otp_enabled: data.otp_enabled ?? DEFAULT_RUNTIME_FLAGS.otp_enabled,
      otp_bypass_enabled: data.otp_bypass_enabled ?? DEFAULT_RUNTIME_FLAGS.otp_bypass_enabled,
      checkin_actions_enabled: data.checkin_actions_enabled ?? DEFAULT_RUNTIME_FLAGS.checkin_actions_enabled,
    };
  } catch (error) {
    console.warn('Runtime flags could not be loaded, defaults will be used:', error);
    return DEFAULT_RUNTIME_FLAGS;
  }
}
