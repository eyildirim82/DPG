import React, { useState, useRef, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import FormInput from './ui/FormInput';
import Button from './ui/Button';
import { theme } from '../styles/theme';
import { applicationFormSchema, isValidTCKimlikNo } from '../lib/validation';
import { supabase } from '../lib/supabase';

const defaultValues = {
  tcNo: '',
  name: '',
  airline: '',
  birthYear: '',
  email: '',
  phone: '',
  bringGuest: false,
  guestName: '',
  paymentApproval: false,
};

export default function ApplicationForm({ onSubmitSuccess }) {
  const [step, setStep] = useState(1);
  const [tcInput, setTcInput] = useState('');
  const [tcError, setTcError] = useState(null);
  const [emailInput, setEmailInput] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [quotaStats, setQuotaStats] = useState(null);
  const [attendedBefore, setAttendedBefore] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState(null);
  const [ticketType, setTicketType] = useState(null);
  const [selectedCluster, setSelectedCluster] = useState('Otomatik');
  const [submittingSeating, setSubmittingSeating] = useState(false);
  const [lockExpiresAt, setLockExpiresAt] = useState(null);
  const [remainingSeconds, setRemainingSeconds] = useState(null);
  const [timeLeft, setTimeLeft] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [tableStats, setTableStats] = useState([]);
  const [cancelToken, setCancelToken] = useState(() => localStorage.getItem('dpg_cancel_token') || null);
  const firstErrorRef = useRef(null);

  useEffect(() => {
    if (step === 3) {
      const fetchTableStats = async () => {
        try {
          const { data, error } = await supabase.rpc('get_table_stats');
          if (!error && data) {
            setTableStats(data);
          }
        } catch (err) {
          console.error('Error fetching table stats:', err);
        }
      };
      fetchTableStats();
    }
  }, [step]);

  useEffect(() => {
    const fetchQuota = async () => {
      try {
        const { data, error } = await supabase.rpc('get_ticket_stats');
        if (!error && data) {
          setQuotaStats(data);
        }
      } catch (err) {
        console.error('Error fetching quota:', err);
      }
    };
    fetchQuota();
  }, []);

  useEffect(() => {
    if (remainingSeconds === null || step !== 2) return;

    if (remainingSeconds <= 0) {
      setTimeLeft('Süreniz doldu');
      setApiError('15 dakikalık kayıt süreniz dolmuştur. Lütfen tekrar TC giriniz.');
      setStep(1); // Redirect to start
      return;
    }

    const interval = setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setTimeLeft('Süreniz doldu');
          setApiError('15 dakikalık kayıt süreniz dolmuştur. Lütfen tekrar TC giriniz.');
          setStep(1);
          return 0;
        }
        const newSecs = prev - 1;
        const m = Math.floor(newSecs / 60);
        const s = Math.floor(newSecs % 60);
        setTimeLeft(`${m}:${s.toString().padStart(2, '0')}`);
        return newSecs;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [remainingSeconds, step]);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
    watch,
    reset,
  } = useForm({
    defaultValues,
    resolver: zodResolver(applicationFormSchema),
  });

  const bringGuest = watch('bringGuest');
  const paymentApproval = watch('paymentApproval');

  const handleTcSubmit = async (e) => {
    e.preventDefault();
    setTcError(null);
    setSubmitting(true);

    const trimmedTc = tcInput.replace(/\D/g, '');

    if (trimmedTc.length !== 11) {
      setTcError('TC Kimlik No 11 rakamdan oluşmalıdır.');
      setSubmitting(false);
      return;
    }
    if (!isValidTCKimlikNo(trimmedTc)) {
      setTcError('Geçerli bir TC Kimlik No giriniz.');
      setSubmitting(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('check_and_lock_slot', { p_tc_no: trimmedTc });

      if (error || !data || !data.success) {
        if (data?.error_type === 'not_found' || (!data && error)) {
          setTcError(
            <span>TALPA üyesi değilsiniz, üyelik başvurusu için <a href="https://www.talpa.org/uyelik/" target="_blank" rel="noopener noreferrer" className="underline hover:text-red-300 transition-colors">tıklayınız</a>.</span>
          );
        } else if (data?.error_type === 'debtor') {
          setTcError(
            <span>Aidat borcunuz bulunmaktadır, DPG etkinliği kayıt sistemini kullanabilmeniz için <a href="https://www.talpa.org/aidat/" target="_blank" rel="noopener noreferrer" className="underline hover:text-red-300 transition-colors">borcunuzu ödemeniz</a> gerekmektedir.</span>
          );
        } else if (data?.error_type === 'quota_full') {
          setTcError('Maalesef kotalarımız dolmuştur. İlginize teşekkür ederiz.');
        } else {
          setTcError(data?.message || 'Sistemde bir hata oluştu. Lütfen tekrar deneyin.');
        }
        setSubmitting(false);
        return;
      }

      const isAttendedBefore = !!data.is_attended_before;
      setAttendedBefore(isAttendedBefore);

      if (data.status === 'locked') {
        if (data.lock_expires_at) {
          setLockExpiresAt(new Date(data.lock_expires_at));
        }
        if (data.ticket_type) {
          setTicketType(data.ticket_type);
        }
        if (data.cancel_token) {
          setCancelToken(data.cancel_token);
          localStorage.setItem('dpg_cancel_token', data.cancel_token);
        }
        if (data.remaining_seconds !== undefined) {
          setRemainingSeconds(data.remaining_seconds);
          const m = Math.floor(data.remaining_seconds / 60);
          const s = Math.floor(data.remaining_seconds % 60);
          setTimeLeft(`${m}:${s.toString().padStart(2, '0')}`);
        } else if (data.lock_expires_at) {
          // Fallback if backend hasn't updated yet
          const diff = new Date(data.lock_expires_at) - new Date();
          const secs = Math.max(0, Math.floor(diff / 1000));
          setRemainingSeconds(secs);
        }
      }

      // If they already have an application process beyond "locked", retrieve email + OTP
      if (data.status !== 'locked') {
        // Set state from existing submission data for edit/cancel flow
        if (data.ticket_type) setTicketType(data.ticket_type);
        if (data.cancel_token) {
          setCancelToken(data.cancel_token);
          localStorage.setItem('dpg_cancel_token', data.cancel_token);
        }
        setSubmissionStatus(data.status);

        const { data: emailData, error: emailError } = await supabase.rpc('get_submission_email', { p_tc_no: trimmedTc });

        if (emailData && emailData.exists && emailData.email) {
          const registeredEmail = emailData.email;
          const { error: signInError } = await supabase.auth.signInWithOtp({
            email: registeredEmail,
            options: { shouldCreateUser: true }
          });

          if (signInError) {
            console.error("Supabase Auth OTP error:", signInError);
            setTcError(signInError.message.includes('rate limit')
              ? 'Çok fazla kod istediniz. Lütfen bir süre bekleyip tekrar deneyin.'
              : 'Doğrulama kodu gönderilemedi. Lütfen tekrar deneyin.');
            setSubmitting(false);
            return;
          }

          setValue('tcNo', trimmedTc);
          setEmailInput(registeredEmail);

          const [local, domain] = registeredEmail.split('@');
          if (local && domain) {
            const maskedLocal = local.length > 2 ? local.substring(0, 2) + '*'.repeat(local.length - 2) : local;
            const maskedDomain = domain.length > 5 ? domain.substring(0, 1) + '*'.repeat(domain.length - 5) + domain.substring(domain.length - 4) : domain;
            setMaskedEmail(`${maskedLocal}@${maskedDomain}`);
          } else {
            setMaskedEmail('*****@*****.***');
          }
          setStep(1.5);
        } else {
          // Fallback if status is approved but somehow email missing
          setValue('tcNo', trimmedTc);
          setStep(2);
        }
      } else {
        // Just locked, go straight to form
        setValue('tcNo', trimmedTc);
        setStep(2);
      }
    } catch (err) {
      console.error(err);
      setTcError('Sistemde bir iletişim hatası oluştu. Lütfen tekrar deneyin.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setOtpError(null);
    setSubmitting(true);

    if (otpInput.length !== 8) {
      setOtpError('Lütfen 8 haneli doğrulama kodunu giriniz.');
      setSubmitting(false);
      return;
    }

    try {
      const { data: { session }, error } = await supabase.auth.verifyOtp({
        email: emailInput.trim(),
        token: otpInput,
        type: 'email'
      });

      if (error || !session) {
        setOtpError('Hatalı veya süresi dolmuş doğrulama kodu.');
        setSubmitting(false);
        return;
      }

      const tc = watch('tcNo');

      // Check for existing application
      // TC numarası eşsiz ve OTP doğrulamasından geçildi, user_id filtresi gereksiz
      // (ilk başvuruda user_id null olabilir, bu yüzden eşleşmezdi)
      const { data: existingApp, error: fetchError } = await supabase
        .from('cf_submissions')
        .select('data, status, seating_preference, ticket_type')
        .eq('tc_no', tc)
        .maybeSingle();

      if (existingApp) {
        setSubmissionStatus(existingApp.status);
        if (existingApp.ticket_type) setTicketType(existingApp.ticket_type);
        if (existingApp.seating_preference) {
          try {
            const prefs = JSON.parse(existingApp.seating_preference);
            if (prefs && prefs.cluster) setSelectedCluster(prefs.cluster);
          } catch (e) {
            setSelectedCluster(existingApp.seating_preference);
          }
        }

        // Always show form (Step 2) to allow editing
        reset({ ...defaultValues, ...existingApp.data, email: emailInput.trim(), tcNo: tc });
        setStep(2);
      } else {
        // Just empty form prepopulated with email
        setSubmissionStatus(null);
        reset({ ...defaultValues, tcNo: tc, email: emailInput.trim() });
        setStep(2);
      }
    } catch (err) {
      console.error(err);
      setOtpError('Sistem hatası.');
    } finally {
      setSubmitting(false);
    }
  };



  const handleSeatingSubmit = async (e) => {
    e.preventDefault();
    setSubmittingSeating(true);
    setApiError(null);
    try {
      const tc = watch('tcNo');
      const prefsStr = JSON.stringify({ cluster: selectedCluster });
      const { data, error } = await supabase.rpc('update_seating_preference', {
        p_tc_no: tc,
        p_preferences: prefsStr
      });
      if (error || !data.success) {
        setApiError(error?.message || data?.message || 'Kaydedilemedi.');
      } else {
        alert('Tercihleriniz başarıyla kaydedildi!');
      }
    } catch (err) {
      console.error(err);
      setApiError('Bir hata oluştu.');
    } finally {
      setSubmittingSeating(false);
    }
  };

  const handleCancel = async () => {
    const firstConfirm = window.confirm("Dikkat: Başvurunuzu iptal ederseniz mevcut rezervasyonunuzu/sıranızı kaybedeceksiniz.\n\nBaşvurunuzu iptal etmek istediğinize emin misiniz?");
    if (!firstConfirm) {
      return;
    }

    const secondConfirm = window.confirm("Son Onay: Başvurunuz iptal edilecek ve bu işlem geri alınamaz. Onaylıyor musunuz?");
    if (!secondConfirm) {
      return;
    }

    setDeleting(true);
    setApiError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setApiError('Oturum süresi dolmuş. Lütfen sayfayı yenileyip tekrar giriş yapın.');
        setDeleting(false);
        return;
      }

      const tc = watch('tcNo');
      const { data, error } = await supabase.rpc('cancel_application', {
        p_tc_no: tc,
        p_cancel_token: cancelToken
      });

      if (error || !data?.success) {
        setApiError(error?.message || data?.message || 'Başvuru iptal edilirken hata oluştu.');
      } else {
        alert('Başvurunuz başarıyla iptal edilmiştir.');
        setStep(1);
        setTcInput('');
        setValue('tcNo', '');
        setSubmissionStatus(null);
        setTicketType(null);
        setAttendedBefore(false);
        setCancelToken(null);
        localStorage.removeItem('dpg_cancel_token');
      }
    } catch (err) {
      console.error(err);
      setApiError('İletişim hatası oluştu.');
    } finally {
      setDeleting(false);
    }
  };

  const onValid = async (formData) => {
    setApiError(null);
    setSubmitting(true);
    try {
      // Get current auth session to attach user_id
      const { data: { session } } = await supabase.auth.getSession();

      const { data, error } = await supabase.rpc('submit_application', {
        p_tc_no: formData.tcNo,
        p_data: formData,
        p_bring_guest: formData.bringGuest,
        p_user_id: session?.user?.id || null
      });

      if (error) {
        if (error.message && error.message.includes('Kota dolmuştur')) {
          setApiError('Maalesef kotalarımız dolmuştur. İlginize teşekkür ederiz.');
        } else {
          console.error(error);
          setApiError('Başvuru gönderilemedi. Lütfen tekrar deneyin veya bizimle iletişime geçin.');
        }
        return;
      }

      // Başvuru alındı bildirimi gönder (arka planda, hata olsa bile form akışını bozma)
      try {
        // Kullanıcıya bildirim
        supabase.functions.invoke('send-bulk-email', {
          body: {
            email_type: 'application_received',
            recipients: [{ email: formData.email, name: formData.name }],
            extra_data: { ticket_type: ticketType || 'yedek' }
          }
        }).catch(err => console.error('Kullanıcı bildirim hatası:', err));

        // Admin'e bildirim
        supabase.functions.invoke('send-bulk-email', {
          body: {
            email_type: 'admin_new_application',
            recipients: [{ email: '__ADMIN__', name: 'Admin' }],
            extra_data: {
              name: formData.name,
              tc_no: formData.tcNo?.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1***$3**'),
              airline: formData.airline || '-',
              ticket_type: ticketType || 'yedek',
              has_guest: formData.bringGuest
            }
          }
        }).catch(err => console.error('Admin bildirim hatası:', err));
      } catch (emailErr) {
        console.error('Bildirim e-postaları gönderilemedi:', emailErr);
      }

      onSubmitSuccess?.(!!submissionStatus);
      reset(defaultValues);
      setStep(1);
      setTcInput('');
      setTcError(null);
    } catch (err) {
      console.error(err);
      setApiError(
        'Başvuru gönderilirken bir iletişim hatası oluştu.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const onInvalid = () => {
    setApiError(null);
    setTimeout(() => {
      const first = document.querySelector('[data-field-error="true"]');
      first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  };

  return (
    <motion.section
      id="basvur"
      className="py-10 md:py-16 max-w-[700px] mx-auto px-4 md:px-0"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.6 }}
    >
      <div className="text-center mb-6 md:mb-8">
        <h2 className="font-heading font-normal tracking-wide uppercase text-3xl md:text-4xl text-dpg-silver text-center mb-6 md:mb-8 relative inline-block">
          Başvuru Formu
          <span className="block w-[60px] h-px bg-dpg-gold mt-2.5 mx-auto" />
        </h2>
      </div>

      {/* Ücret ve başvuru tarihi vurgusu */}
      <div
        className="border border-dpg-gold/60 rounded-sm py-4 px-4 md:py-6 md:px-8 mb-8 text-center"
        style={{ backgroundColor: 'rgba(230, 194, 117, 0.06)' }}
      >
        <p className="font-heading text-dpg-gold text-xl md:text-2xl font-semibold tracking-wide">
          Katılım ücreti: {bringGuest ? '6.000 TL (2 Kişi)' : '3.000 TL'}
        </p>
        <p className="text-dpg-text-muted text-sm md:text-base mt-2 font-body">
          Başvuru açılış: 2 Mart 2026, 15:00
        </p>

      </div>

      {apiError && (
        <div
          className="mb-6 py-4 px-5 rounded border border-red-500/50 bg-red-500/10 text-red-400 text-base md:text-lg font-body"
          role="alert"
        >
          {apiError}
        </div>
      )}

      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {step === 2 && "T.C. Kimlik No doğrulandı. Başvuru formu açıldı. Lütfen bilgilerinizi eksiksiz doldurun."}
      </div>

      {step === 1 ? (
        <form onSubmit={handleTcSubmit} noValidate>
          <div className="mb-4">
            <FormInput
              type="text"
              inputMode="numeric"
              placeholder=" "
              value={tcInput}
              onChange={(e) => {
                setTcInput(e.target.value.replace(/\D/g, '').slice(0, 11));
                setTcError(null);
              }}
              label="TC Kimlik No"
              error={tcError}
            />
            <p className="text-dpg-text-muted text-base md:text-lg font-body mt-2 px-1">
              11 haneli TC Kimlik Numaranızı giriniz.
            </p>
          </div>
          <Button type="submit" className="w-full min-h-[48px] mt-2 mb-8" style={{ opacity: submitting ? 0.7 : 1 }}>
            {submitting ? 'Sorgulanıyor...' : 'TC KİMLİK NUMARASINI DOĞRULA VE DEVAM ET'}
          </Button>
        </form>
      ) : step === 1.5 ? (
        <form onSubmit={handleOtpSubmit} noValidate>
          <div className="mb-8">
            <p className="text-dpg-text-muted text-base md:text-lg font-body mb-4 px-1 leading-relaxed">
              Katılım kaydınızdaki <strong className="text-dpg-gold">{maskedEmail}</strong> adresine gönderilen 8 haneli doğrulama kodunu giriniz. (E-postayı göremiyorsanız Gereksiz (Spam) kutusunu kontrol ediniz.)
            </p>
            <FormInput
              type="text"
              inputMode="numeric"
              maxLength={8}
              placeholder=" "
              value={otpInput}
              onChange={(e) => {
                setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 8));
                setOtpError(null);
              }}
              label="8 Haneli Doğrulama Kodu"
              error={otpError}
            />
          </div>
          <div className="flex gap-4 mt-2">
            <Button type="button" secondary onClick={() => { setStep(1); setOtpInput(''); }} className="w-1/3 min-h-[48px]">
              Geri
            </Button>
            <Button type="submit" className="w-2/3 min-h-[48px]" style={{ opacity: submitting ? 0.7 : 1 }}>
              {submitting ? 'Doğrulanıyor...' : 'Doğrula'}
            </Button>
          </div>
        </form>
      ) : step === 3 ? (
        <form onSubmit={handleSeatingSubmit} noValidate>
          <div className="mb-6 py-4 px-5 rounded border border-green-500/30 bg-green-500/10 text-green-100 text-base md:text-lg font-body">
            <h3 className="text-xl md:text-2xl font-bold text-green-400 mb-2">Başvurunuz Onaylanmıştır!</h3>
            <p className="text-lg text-gray-200">Aşağıdaki oturma kümelerinden birini seçerek Gala alanındaki yerinizi belirtebilirsiniz. Arkadaşlarınızla aynı kümeyi seçerek yan yana oturabilirsiniz.</p>
          </div>

          <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { id: 'Otomatik', name: 'Beni Otomatik Yerleştir (Önerilen)', desc: 'Ekibimiz sizi ve sevdiklerinizi meslektaşlarınızla en uygun şekilde yerleştirecektir.' },
              { id: 'KumeA', name: 'A Kümesi', desc: 'Sahne Önü ve Protokol Çevresi' },
              { id: 'KumeB', name: 'B Kümesi', desc: 'Salonun Orta Kısımları' },
              { id: 'KumeC', name: 'C Kümesi', desc: 'Geniş Alan ve Yan Koridorlar' },
              { id: 'KumeD', name: 'D Kümesi', desc: 'Arka Localar ve Dinlenme Alanı' }
            ].map(cluster => {
              const clusterStats = tableStats.filter(s => s.cluster === cluster.id);
              return (
                <div
                  key={cluster.id}
                  onClick={() => setSelectedCluster(cluster.id)}
                  className={`cursor-pointer border-2 rounded-lg p-5 transition-all duration-300 ${selectedCluster === cluster.id
                    ? 'border-dpg-gold bg-dpg-gold/20 shadow-[0_0_15px_rgba(230,194,117,0.3)]'
                    : 'border-white/10 bg-white/5 hover:bg-white/10 border-dashed'
                    }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`mt-1 flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedCluster === cluster.id ? 'border-dpg-gold' : 'border-gray-500'}`}>
                      {selectedCluster === cluster.id && <div className="w-3 h-3 bg-dpg-gold rounded-full"></div>}
                    </div>
                    <div className="flex-1">
                      <h4 className={`text-xl font-bold font-heading mb-1 ${selectedCluster === cluster.id ? 'text-dpg-gold' : 'text-gray-300'}`}>{cluster.name}</h4>
                      <p className="text-base md:text-lg font-body text-gray-400">{cluster.desc}</p>
                      {cluster.id !== 'Otomatik' && clusterStats.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {clusterStats.map((stat, idx) => (
                            <span key={idx} className="bg-white/10 px-3 py-1.5 rounded text-sm md:text-base text-gray-300 flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-dpg-gold/70"></span>
                              {stat.airline}: {stat.count}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <Button type="submit" disabled={!selectedCluster} className="w-full" style={{ opacity: submittingSeating || !selectedCluster ? 0.7 : 1 }}>
            {submittingSeating ? 'Kaydediliyor...' : 'Küme Tercihimi Kaydet'}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleSubmit(onValid, onInvalid)} noValidate>
          {remainingSeconds > 0 && timeLeft && !submissionStatus && (
            <div className="mb-6 py-6 px-4 rounded-xl border-2 border-dpg-gold/60 bg-dpg-gold/10 text-dpg-gold text-center font-bold text-2xl flex flex-col items-center gap-3 shadow-[0_0_20px_rgba(230,194,117,0.2)] animate-pulse-slow">
              <span className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Geçici Rezervasyon Süreniz
              </span>
              <span className="text-4xl text-white tracking-widest bg-dpg-gold/20 px-4 py-2 rounded-lg border border-dpg-gold/30">{timeLeft}</span>
              <span className="text-sm text-dpg-gold/80 font-normal">Değerli Kaptanımız yeriniz geçici olarak ayrılmıştır. Lütfen kaydınızı tamamlayın.</span>
            </div>
          )}

          <div className="mb-6 py-4 px-5 rounded border border-dpg-gold/30 bg-dpg-gold/5 text-dpg-text-muted text-xl font-body flex justify-between items-center">
            <span>TC Kimlik No: {(watch('tcNo') || '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1***$2**$3*$4')}</span>
            <button
              type="button"
              onClick={() => { setStep(1); setTcInput(''); setValue('tcNo', ''); setAttendedBefore(false); setSubmissionStatus(null); setTicketType(null); }}
              className="text-dpg-gold text-base md:text-lg ml-4 underline hover:no-underline"
            >
              Değiştir
            </button>
          </div>

          {(submissionStatus === 'approved' || submissionStatus === 'asil') ? (
            <div className="mb-6 py-4 px-5 rounded border border-green-500/50 bg-green-500/10 flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                <strong className="block text-green-400 text-lg md:text-xl mb-1">Başvurunuz Onaylanmıştır!</strong>
                <span className="text-green-200 text-base md:text-lg font-body">Masa düzeni tercihinizi yapmak için aşağıdaki butonu kullanabilirsiniz. Bilgilerinizi de aşağıdan güncelleyebilirsiniz.</span>
              </div>
              <Button type="button" onClick={() => setStep(3)} className="whitespace-nowrap min-h-[44px] bg-green-600 hover:bg-green-500 text-white">
                Masa Seçimi
              </Button>
            </div>
          ) : submissionStatus ? (
            <div className="mb-6 py-4 px-5 rounded border border-blue-500/50 bg-blue-500/10 text-blue-200 text-base md:text-lg font-body">
              <strong>Bilgilendirme:</strong> Başvurunuz daha önce başarıyla alınmıştır. Aşağıdaki formdan bilgilerinizi güncelleyebilirsiniz.
            </div>
          ) : null}

          {attendedBefore && (
            <div className="mb-6 py-4 px-5 rounded border border-blue-500/50 bg-blue-500/10 text-blue-200 text-base md:text-lg font-body">
              <strong>Bilgilendirme:</strong> Geçmiş yıllardaki DPG etkinliklerimize katıldığınız tespit edilmiştir. Başvurunuz <strong>Eski Katılımcı Asil Kotası</strong> üzerinden değerlendirilecektir.
            </div>
          )}

          <div ref={errors.name ? firstErrorRef : null} data-field-error={!!errors.name}>
            <Controller
              name="name"
              control={control}
              render={({ field, fieldState: { error } }) => (
                <FormInput
                  type="text"
                  placeholder=" "
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  focused={undefined}
                  label="Ad Soyad"
                  error={error?.message}
                />
              )}
            />
          </div>

          <div data-field-error={!!errors.airline}>
            <Controller
              name="airline"
              control={control}
              render={({ field, fieldState: { error } }) => (
                <FormInput
                  type="text"
                  placeholder=" "
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  focused={undefined}
                  label="Havayolu Şirketi"
                  error={error?.message}
                />
              )}
            />
          </div>

          <div data-field-error={!!errors.birthYear}>
            <Controller
              name="birthYear"
              control={control}
              render={({ field, fieldState: { error } }) => (
                <FormInput
                  type="text"
                  inputMode="numeric"
                  maxLength="4"
                  placeholder=" "
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ''))}
                  onBlur={field.onBlur}
                  focused={undefined}
                  label="Doğum Yılı"
                  error={error?.message}
                />
              )}
            />
          </div>

          <div data-field-error={!!errors.email}>
            <Controller
              name="email"
              control={control}
              render={({ field, fieldState: { error } }) => (
                <FormInput
                  type="email"
                  placeholder=" "
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  focused={undefined}
                  label="E-Posta Adresi"
                  error={error?.message}
                />
              )}
            />
          </div>

          <div data-field-error={!!errors.phone}>
            <Controller
              name="phone"
              control={control}
              render={({ field, fieldState: { error } }) => (
                <FormInput
                  type="tel"
                  placeholder=" "
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  focused={undefined}
                  label="Telefon Numarası"
                  error={error?.message}
                />
              )}
            />
          </div>

          {/* +1 Misafir Seçeneği */}
          <div
            className="flex flex-col gap-4 mb-8 p-4 rounded border transition-colors duration-300"
            style={{
              borderColor: bringGuest ? 'rgba(230, 194, 117, 0.5)' : 'rgba(255, 255, 255, 0.2)',
              backgroundColor: bringGuest ? 'rgba(230, 194, 117, 0.05)' : 'rgba(255, 255, 255, 0.02)',
            }}
          >
            <Controller
              name="bringGuest"
              control={control}
              render={({ field }) => (
                <label className="flex items-start cursor-pointer flex-1">
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={(e) => {
                      field.onChange(e.target.checked);
                      if (!e.target.checked) setValue('guestName', '');
                    }}
                    onBlur={field.onBlur}
                    className="sr-only"
                  />
                  <span
                    role="checkbox"
                    tabIndex={0}
                    onClick={(e) => {
                      e.preventDefault();
                      field.onChange(!field.value);
                      if (field.value) setValue('guestName', '');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        field.onChange(!field.value);
                        if (field.value) setValue('guestName', '');
                      }
                    }}
                    className="w-7 h-7 border border-dpg-gold flex items-center justify-center cursor-pointer flex-shrink-0 mt-0.5"
                    aria-checked={field.value}
                  >
                    {field.value && <span className="w-4 h-4 bg-dpg-gold block" />}
                  </span>
                  <span className="ml-4 text-base md:text-lg font-body font-medium" style={{ color: theme.colors.gold }}>
                    Yanımda bir misafir getirmek istiyorum (+1 Bilet)
                  </span>
                </label>
              )}
            />

            {bringGuest && (
              <div data-field-error={!!errors.guestName} className="mt-2 text-left">
                <Controller
                  name="guestName"
                  control={control}
                  render={({ field, fieldState: { error } }) => (
                    <FormInput
                      type="text"
                      placeholder=" "
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      label="Misafir Adı Soyadı"
                      error={error?.message}
                    />
                  )}
                />
              </div>
            )}
          </div>

          {/* Ödeme Onay */}
          <div
            className="flex items-start gap-4 mb-12 p-4 rounded border"
            style={{
              borderColor: paymentApproval ? 'rgba(230, 194, 117, 0.5)' : 'rgba(230, 194, 117, 0.3)',
              backgroundColor: 'rgba(230, 194, 117, 0.04)',
            }}
            data-field-error={!!errors.paymentApproval}
          >
            <Controller
              name="paymentApproval"
              control={control}
              render={({ field }) => (
                <>
                  <label className="flex items-start cursor-pointer flex-1">
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      onBlur={field.onBlur}
                      className="sr-only"
                    />
                    <span
                      role="checkbox"
                      tabIndex={0}
                      onClick={(e) => {
                        e.preventDefault();
                        field.onChange(!field.value);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          field.onChange(!field.value);
                        }
                      }}
                      className="w-7 h-7 border border-dpg-gold flex items-center justify-center cursor-pointer flex-shrink-0 mt-0.5"
                      aria-checked={field.value}
                    >
                      {field.value && (
                        <span className="w-4 h-4 bg-dpg-gold block" />
                      )}
                    </span>
                    <span
                      className="ml-4 text-base md:text-lg font-body font-medium"
                      style={{
                        color: errors.paymentApproval ? '#b91c1c' : theme.colors.textMuted,
                      }}
                    >
                      {ticketType === 'yedek'
                        ? `Yedek listede olduğumu anlıyorum. Asıl listeye geçmem durumunda ${bringGuest ? '6.000 TL' : '3.000 TL'} ödemenin tahsil edilmesini onaylıyorum.`
                        : `${bringGuest ? '6.000 TL' : '3.000 TL'} ödemenin TALPA'ya kayıtlı kredi kartımdan tahsil edilmesini onaylıyorum.`}
                    </span>
                  </label>
                  {errors.paymentApproval && (
                    <p className="text-xs text-red-500 font-body mt-1 ml-9">
                      {errors.paymentApproval.message}
                    </p>
                  )}
                </>
              )}
            />
          </div>

          <Button type="submit" className="w-full" style={{ opacity: submitting || deleting ? 0.7 : 1 }} disabled={submitting || deleting}>
            {submitting ? 'İşleniyor...' : submissionStatus ? 'Bilgilerimi Güncelle' : ticketType === 'asil' ? 'Katılımımı Onayla (ASİL)' : ticketType === 'yedek' ? 'Katılımımı Onayla (YEDEK)' : 'Katılımımı Onayla'}
          </Button>

          {submissionStatus && submissionStatus !== 'cancelled' && (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={handleCancel}
                disabled={submitting || deleting}
                className="text-red-400 hover:text-red-300 text-sm md:text-base font-body underline transition-colors"
                style={{ opacity: submitting || deleting ? 0.5 : 1 }}
              >
                {deleting ? 'İptal Ediliyor...' : 'Başvurumu İptal Et'}
              </button>
            </div>
          )}
        </form>
      )}
    </motion.section>
  );
}
