import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Button from './ui/Button';
import FormInput from './ui/FormInput';
import { supabase } from '../lib/supabase';

const TC_REGEX = /^\d{11}$/;
const OTP_REGEX = /^\d{6}$/;

export default function CheckinForm({ checkinActionsEnabled = false, otpBypassEnabled = false }) {
  const [step, setStep] = useState(1);
  const [tcNo, setTcNo] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [summary, setSummary] = useState(null);
  const [preferredPeopleInput, setPreferredPeopleInput] = useState('');
  const [preferredPeople, setPreferredPeople] = useState([]);

  const canRequestOtp = useMemo(() => TC_REGEX.test(tcNo.trim()), [tcNo]);
  const canVerifyOtp = useMemo(() => OTP_REGEX.test(otp.trim()), [otp]);

  const applyVerifiedSession = (data, successMessage) => {
    setSummary({
      fullName: data.full_name || data.application_data?.name || 'Üye',
      ticketType: data.ticket_type || '-',
      status: data.status || '-',
      token: data.checkin_token,
    });
    setPreferredPeople([]);
    setPreferredPeopleInput('');
    setStep(3);
    setInfo(successMessage);
  };

  const handleAddPreferredPerson = () => {
    const person = preferredPeopleInput.trim();
    if (!person) return;
    if (preferredPeople.includes(person)) {
      setPreferredPeopleInput('');
      return;
    }
    setPreferredPeople((prev) => [...prev, person]);
    setPreferredPeopleInput('');
  };

  const handleRemovePreferredPerson = (person) => {
    setPreferredPeople((prev) => prev.filter((item) => item !== person));
  };

  const handleRequestOtp = async () => {
    setError('');
    setInfo('');

    if (!canRequestOtp) {
      setError('Lütfen geçerli bir 11 haneli T.C. Kimlik Numarası giriniz.');
      return;
    }

    if (!supabase) {
      setError('Servis bağlantısı kurulamadı. Lütfen daha sonra tekrar deneyiniz.');
      return;
    }

    setLoading(true);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('send-bulk-email', {
        body: {
          email_type: 'checkin_otp',
          extra_data: {
            tc_no: tcNo.trim(),
          },
        },
      });

      if (invokeError) throw invokeError;

      if (!data?.success) {
        if (data?.error_type === 'cooldown' && data?.cooldown_seconds) {
          setCooldownSeconds(Number(data.cooldown_seconds));
          setMaskedEmail(data.masked_email || '');
          setError(`Yeni kod istemek için ${data.cooldown_seconds} saniye bekleyiniz.`);
          return;
        }

        setError(data?.message || 'OTP kodu gönderilemedi.');
        return;
      }

      setMaskedEmail(data.masked_email || '');
      setCooldownSeconds(60);
      setStep(2);
      setInfo('Doğrulama kodu e-posta adresinize gönderildi.');
    } catch (err) {
      console.error('OTP request failed:', err);
      setError('OTP kodu gönderilirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError('');
    setInfo('');

    if (!canVerifyOtp) {
      setError('Lütfen 6 haneli OTP kodunu giriniz.');
      return;
    }

    if (!supabase) {
      setError('Servis bağlantısı kurulamadı. Lütfen daha sonra tekrar deneyiniz.');
      return;
    }

    setLoading(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('verify_checkin_otp', {
        p_tc_no: tcNo.trim(),
        p_otp: otp.trim(),
      });

      if (rpcError) throw rpcError;
      if (!data?.success) {
        setError(data?.message || 'OTP doğrulaması başarısız.');
        return;
      }

      applyVerifiedSession(data, 'Doğrulama başarılı. Check-in ekranına hoş geldiniz.');
    } catch (err) {
      console.error('OTP verify failed:', err);
      setError('OTP doğrulaması sırasında hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleBypassOtp = async () => {
    setError('');
    setInfo('');

    if (!otpBypassEnabled) {
      setError('OTP bypass aktif değil.');
      return;
    }

    if (!canRequestOtp) {
      setError('Lütfen geçerli bir 11 haneli T.C. Kimlik Numarası giriniz.');
      return;
    }

    if (!supabase) {
      setError('Servis bağlantısı kurulamadı. Lütfen daha sonra tekrar deneyiniz.');
      return;
    }

    setLoading(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('bypass_checkin_otp', {
        p_tc_no: tcNo.trim(),
      });

      if (rpcError) throw rpcError;
      if (!data?.success) {
        setError(data?.message || 'OTP bypass başarısız.');
        return;
      }

      applyVerifiedSession(data, 'OTP bypass ile check-in ekranına geçildi.');
    } catch (err) {
      console.error('OTP bypass failed:', err);
      setError('OTP bypass sırasında bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckinContinue = async () => {
    setError('');
    setInfo('');

    if (!supabase) {
      setError('Servis bağlantısı kurulamadı. Lütfen daha sonra tekrar deneyiniz.');
      return;
    }

    if (!summary?.token) {
      setError('Geçerli bir check-in oturumu bulunamadı.');
      return;
    }

    if (preferredPeople.length === 0) {
      setError('Lütfen en az bir kişi tercihi ekleyiniz.');
      return;
    }

    setLoading(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('checkin_confirm_and_continue', {
        p_session_token: summary.token,
        p_table_preferences: {
          preferred_people: preferredPeople,
          source: 'people_preference_v1',
        },
      });

      if (rpcError) throw rpcError;
      if (!data?.success) {
        setError(data?.message || 'Check-in işlemi tamamlanamadı.');
        return;
      }

      setInfo('Check-in işleminiz tamamlandı. Kişi tercih listeniz kaydedildi.');
    } catch (err) {
      console.error('checkin_confirm_and_continue failed:', err);
      setError('Check-in işlemi sırasında bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    setError('');
    setInfo('');

    if (!supabase) {
      setError('Servis bağlantısı kurulamadı. Lütfen daha sonra tekrar deneyiniz.');
      return;
    }

    if (!summary?.token) {
      setError('Geçerli bir check-in oturumu bulunamadı.');
      return;
    }

    const nextEmail = window.prompt('Yeni e-posta adresinizi giriniz (boş bırakabilirsiniz):', '');
    const nextPhone = window.prompt('Yeni telefon numaranızı giriniz (boş bırakabilirsiniz):', '');

    if (!nextEmail && !nextPhone) {
      setInfo('Düzenleme iptal edildi.');
      return;
    }

    setLoading(true);
    try {
      const patch = {};
      if (nextEmail) patch.email = nextEmail.trim();
      if (nextPhone) patch.phone = nextPhone.trim();

      const { data, error: rpcError } = await supabase.rpc('checkin_update_application', {
        p_session_token: summary.token,
        p_patch: patch,
      });

      if (rpcError) throw rpcError;
      if (!data?.success) {
        setError(data?.message || 'Başvuru bilgileri güncellenemedi.');
        return;
      }

      setInfo('Başvuru bilgileriniz güncellendi.');
    } catch (err) {
      console.error('checkin_update_application failed:', err);
      setError('Düzenleme işlemi sırasında bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    setError('');
    setInfo('');

    if (!supabase) {
      setError('Servis bağlantısı kurulamadı. Lütfen daha sonra tekrar deneyiniz.');
      return;
    }

    if (!summary?.token) {
      setError('Geçerli bir check-in oturumu bulunamadı.');
      return;
    }

    const confirmed = window.confirm('Başvurunuzu iptal etmek istediğinize emin misiniz?');
    if (!confirmed) {
      return;
    }

    const reason = window.prompt('İptal sebebi (opsiyonel):', '') || '';

    setLoading(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('checkin_cancel_application', {
        p_session_token: summary.token,
        p_reason: reason,
      });

      if (rpcError) throw rpcError;
      if (!data?.success) {
        setError(data?.message || 'Başvuru iptal edilemedi.');
        return;
      }

      setInfo('Başvurunuz iptal edildi.');
      setStep(1);
      setOtp('');
      setSummary(null);
      setPreferredPeople([]);
      setPreferredPeopleInput('');
    } catch (err) {
      console.error('checkin_cancel_application failed:', err);
      setError('İptal işlemi sırasında bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.section
      id="checkin"
      className="py-6 md:py-10 max-w-[700px] mx-auto px-4 md:px-0"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.6 }}
    >
      <div className="text-center mb-6 md:mb-8">
        <h2 className="font-heading font-normal tracking-wide uppercase text-3xl md:text-4xl text-dpg-silver text-center mb-6 md:mb-8 relative inline-block">
          Check-in
          <span className="block w-[60px] h-px bg-dpg-gold mt-2.5 mx-auto" />
        </h2>
        <p className="text-dpg-text-muted text-sm md:text-base">
          T.C. Kimlik Numaranız ile doğrulama yaparak check-in işleminizi başlatın.
        </p>
      </div>

      {error && (
        <div className="mb-4 py-3 px-4 rounded border border-red-500/50 bg-red-500/10 text-red-300" role="alert">
          {error}
        </div>
      )}

      {info && (
        <div className="mb-4 py-3 px-4 rounded border border-dpg-gold/40 bg-dpg-gold/10 text-dpg-gold" role="status">
          {info}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <FormInput
            label="T.C. Kimlik Numarası"
            value={tcNo}
            onChange={(e) => setTcNo(e.target.value.replace(/\D/g, '').slice(0, 11))}
            placeholder="11 haneli T.C. Kimlik Numaranız"
            inputMode="numeric"
            maxLength={11}
          />

          <Button
            type="button"
            onClick={handleRequestOtp}
            disabled={loading || !canRequestOtp}
            fullWidth
          >
            {loading ? 'Kod Gönderiliyor...' : 'OTP Kodu Gönder'}
          </Button>

          {otpBypassEnabled && (
            <Button
              type="button"
              onClick={handleBypassOtp}
              disabled={loading || !canRequestOtp}
              secondary
              fullWidth
            >
              OTP'siz Devam Et (Test)
            </Button>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="text-sm text-dpg-text-muted">
            {maskedEmail ? `Kod ${maskedEmail} adresine gönderildi.` : 'Kod e-posta adresinize gönderildi.'}
          </div>
          {cooldownSeconds > 0 && (
            <div className="text-xs text-dpg-text-muted">Tekrar gönderim bekleme süresi: {cooldownSeconds} sn</div>
          )}

          <FormInput
            label="OTP Kodu"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="6 haneli OTP kodu"
            inputMode="numeric"
            maxLength={6}
          />

          <div className="flex flex-col md:flex-row gap-3">
            <Button type="button" onClick={handleVerifyOtp} disabled={loading || !canVerifyOtp} fullWidth>
              {loading ? 'Doğrulanıyor...' : 'OTP Doğrula'}
            </Button>
            <Button type="button" onClick={handleRequestOtp} disabled={loading || !canRequestOtp} fullWidth>
              Kodu Tekrar Gönder
            </Button>
          </div>
        </div>
      )}

      {step === 3 && summary && (
        <div className="space-y-4">
          <div className="rounded border border-dpg-gold/30 bg-dpg-gold/5 p-4">
            <p className="text-dpg-silver text-lg font-semibold">{summary.fullName}</p>
            <p className="text-dpg-text-muted mt-1">Bilet Tipi: <span className="text-dpg-gold font-semibold">{summary.ticketType}</span></p>
            <p className="text-dpg-text-muted">Başvuru Durumu: <span className="text-dpg-gold font-semibold">{summary.status}</span></p>
          </div>

          <div className="rounded border border-white/10 bg-white/5 p-4 space-y-3">
            <p className="text-sm text-dpg-text-muted">Birlikte oturmak istediğiniz kişileri ekleyin.</p>
            <div className="flex flex-col md:flex-row gap-2">
              <FormInput
                label="Kişi adı"
                value={preferredPeopleInput}
                onChange={(e) => setPreferredPeopleInput(e.target.value)}
                placeholder="Ad Soyad"
              />
              <Button type="button" onClick={handleAddPreferredPerson} disabled={!preferredPeopleInput.trim() || loading}>
                Ekle
              </Button>
            </div>

            {preferredPeople.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {preferredPeople.map((person) => (
                  <button
                    key={person}
                    type="button"
                    onClick={() => handleRemovePreferredPerson(person)}
                    className="px-3 py-1 rounded-full text-xs border border-dpg-gold/50 text-dpg-gold hover:bg-dpg-gold/10"
                  >
                    {person} ×
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-dpg-text-muted">Henüz kişi tercihi eklenmedi.</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button type="button" onClick={handleCheckinContinue} disabled={!checkinActionsEnabled || loading || preferredPeople.length === 0} fullWidth>
              Check-in yap ve Tercihleri Kaydet
            </Button>
            <Button type="button" onClick={handleUpdate} disabled={!checkinActionsEnabled || loading} fullWidth>
              Düzenle
            </Button>
            <Button type="button" onClick={handleCancel} disabled={!checkinActionsEnabled || loading} fullWidth>
              İptal et
            </Button>
          </div>

          {!checkinActionsEnabled && (
            <p className="text-xs text-dpg-text-muted">
              Check-in aksiyonları henüz aktif değil. Lütfen daha sonra tekrar deneyin.
            </p>
          )}
        </div>
      )}

    </motion.section>
  );
}
