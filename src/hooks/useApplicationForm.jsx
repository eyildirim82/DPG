import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { applicationFormSchema, isValidTCKimlikNo } from '../lib/validation';
import { supabase } from '../lib/supabase';

const defaultValues = {
  tcNo: '',
  name: '',
  airline: '',
  airlineOther: '',
  fleet: '',
  fleetOther: '',
  ageGroup: '',
  email: '',
  phone: '',
  bringGuest: false,
  guestName: '',
  kvkkApproval: false,
  paymentApproval: false,
};

export default function useApplicationForm({ onSubmitSuccess }) {
  const [step, setStep] = useState(1);
  const [tcInput, setTcInput] = useState('');
  const [tcError, setTcError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [quotaStats, setQuotaStats] = useState(null);
  const [isQuotaFull, setIsQuotaFull] = useState(false);
  const [attendedBefore, setAttendedBefore] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState(null);
  const [ticketType, setTicketType] = useState(null);
  const [selectedCluster, setSelectedCluster] = useState('Otomatik');
  const [submittingSeating, setSubmittingSeating] = useState(false);
  const [lockExpiresAt, setLockExpiresAt] = useState(null);
  const [remainingSeconds, setRemainingSeconds] = useState(null);
  const [timeLeft, setTimeLeft] = useState('');
  const [tableStats, setTableStats] = useState([]);
  const firstErrorRef = useRef(null);

  /* ───── Fetch table stats (step 3) ───── */
  useEffect(() => {
    if (step === 3) {
      const fetchTableStats = async () => {
        try {
          const { data, error } = await supabase.rpc('get_table_stats');
          if (!error && data) setTableStats(data);
        } catch (err) {
          console.error('Error fetching table stats:', err);
        }
      };
      fetchTableStats();
    }
  }, [step]);

  /* ───── Fetch quota on mount ───── */
  useEffect(() => {
    let mounted = true;
    const fetchQuota = async () => {
      try {
        const { data, error } = await supabase.rpc('get_ticket_stats');
        if (mounted && !error && data) {
          setQuotaStats(data);
          // total_capacity and total_reserved come from RPC
          if (typeof data.total_reserved === 'number' && typeof data.total_capacity === 'number') {
            setIsQuotaFull(data.total_reserved >= data.total_capacity);
          }
        }
      } catch (err) {
        console.error('Error fetching quota:', err);
      }
    };

    fetchQuota();
    const interval = setInterval(fetchQuota, 10000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  /* ───── Countdown timer (wall-clock based — no drift) ───── */
  useEffect(() => {
    if (!lockExpiresAt || step !== 2) return;

    const tick = () => {
      const diff = lockExpiresAt.getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('Süreniz doldu');
        setRemainingSeconds(0);
        setApiError('10 dakikalık kayıt süreniz dolmuştur. Lütfen tekrar TC giriniz.');
        setStep(1);
        return;
      }
      const totalSecs = Math.ceil(diff / 1000);
      setRemainingSeconds(totalSecs);
      const m = Math.floor(totalSecs / 60);
      const s = totalSecs % 60;
      setTimeLeft(`${m}:${s.toString().padStart(2, '0')}`);
    };

    tick(); // ilk render'da hemen göster
    const interval = setInterval(tick, 500); // 500ms — saniye sınırını kaçırmaz
    return () => clearInterval(interval);
  }, [lockExpiresAt, step]);

  /* ───── react-hook-form setup ───── */
  const form = useForm({
    defaultValues,
    resolver: zodResolver(applicationFormSchema),
  });

  const { setValue, watch, reset } = form;
  const bringGuest = watch('bringGuest');

  /* ───── TC Verification (Step 1 → Step 2) ───── */
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
            <span>
              TALPA üyesi değilsiniz, üyelik başvurusu için{' '}
              <a href="https://www.talpa.org/uyelik/" target="_blank" rel="noopener noreferrer" className="underline hover:text-red-300 transition-colors">
                tıklayınız
              </a>.
            </span>,
          );
        } else if (data?.error_type === 'debtor') {
          setTcError(
            <span>
              Aidat borcunuz bulunmaktadır, DPG etkinliği kayıt sistemini kullanabilmeniz için{' '}
              <a href="https://www.talpa.org/aidat/" target="_blank" rel="noopener noreferrer" className="underline hover:text-red-300 transition-colors">
                borcunuzu ödemeniz
              </a>{' '}
              gerekmektedir.
            </span>,
          );
        } else if (data?.error_type === 'quota_full') {
          const msg = 'Değerli Kaptanlarımız etkinliğe olan ilginizden dolayı teşekkür ederiz. Asil ve yedek kotalarımız tamamen dolmuştur.';
          setTcError(msg);
          setIsQuotaFull(true);
        } else {
          setTcError(data?.message || 'Sistemde bir hata oluştu. Lütfen tekrar deneyin.');
        }
        setSubmitting(false);
        return;
      }

      setAttendedBefore(!!data.is_attended_before);

      if (data.status === 'locked') {
        if (data.ticket_type) setTicketType(data.ticket_type);
        // lockExpiresAt'i her zaman mutlak zamandan hesapla (drift olmaz)
        if (data.lock_expires_at) {
          setLockExpiresAt(new Date(data.lock_expires_at));
        } else if (data.remaining_seconds !== undefined) {
          setLockExpiresAt(new Date(Date.now() + data.remaining_seconds * 1000));
        }
        // Anlık timeLeft gösterimi (effect ilk tick'ten önce görünür olsun)
        const secs = data.remaining_seconds ??
          (data.lock_expires_at ? Math.max(0, Math.ceil((new Date(data.lock_expires_at) - Date.now()) / 1000)) : 0);
        if (secs > 0) {
          const m = Math.floor(secs / 60);
          const s = secs % 60;
          setTimeLeft(`${m}:${s.toString().padStart(2, '0')}`);
          setRemainingSeconds(secs);
        }
      }

      if (data.status !== 'locked') {
        setTcError('Bu TC kimlik numarası ile daha önce başvuru yapılmıştır.');
        setSubmitting(false);
        return;
      }

      setValue('tcNo', trimmedTc);
      setStep(2);
    } catch (err) {
      console.error(err);
      setTcError('Sistemde bir iletişim hatası oluştu. Lütfen tekrar deneyin.');
    } finally {
      setSubmitting(false);
    }
  };

  /* ───── Seating preference (Step 3) ───── */
  const handleSeatingSubmit = async (e) => {
    e.preventDefault();
    setSubmittingSeating(true);
    setApiError(null);
    try {
      const tc = watch('tcNo');
      const prefsStr = JSON.stringify({ cluster: selectedCluster });
      const { data, error } = await supabase.rpc('update_seating_preference', {
        p_tc_no: tc,
        p_preferences: prefsStr,
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

  /* ───── Form submission (Step 2) ───── */
  const onValid = async (formData) => {
    setApiError(null);
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      // Strip unnecessary fields from payload (KVKK data minimization)
      const { tcNo, kvkkApproval, paymentApproval, ...cleanData } = formData;

      const { data, error } = await supabase.rpc('submit_application', {
        p_tc_no: formData.tcNo,
        p_data: cleanData,
        p_bring_guest: formData.bringGuest,
        p_user_id: session?.user?.id || null,
      });

      if (error) {
        const errMsg = error.message || (error?.toString && error.toString()) || '';
        if (errMsg.toLowerCase().includes('kota') || errMsg.toLowerCase().includes('dolmuştur') || errMsg.toLowerCase().includes('quota')) {
          const msg = 'Değerli Kaptanlarımız etkinliğe olan ilginizden dolayı teşekkür ederiz. Asil ve yedek kotalarımız tamamen dolmuştur.';
          setApiError(msg);
          setIsQuotaFull(true);
        } else {
          console.error('submit_application error:', error);
          setApiError('Başvuru gönderilemedi. Lütfen tekrar deneyin veya bizimle iletişime geçin.');
        }
        return;
      }

      // Background notification emails (errors won't block the flow)
      try {
        const resolvedTicketType = data?.ticket_type || ticketType || 'yedek';
        const isYedek = resolvedTicketType === 'yedek';
        const yedekSira = data?.yedek_sira;

        supabase.functions
          .invoke('send-bulk-email', {
            body: {
              email_type: 'application_received',
              recipients: [{ email: formData.email, name: formData.name }],
              extra_data: {
                ticket_label: isYedek ? 'YEDEK LİSTEDE' : 'ASİL LİSTEDE',
                yedek_sira_bilgisi: isYedek && yedekSira ? `Yedek Sıranız: #${yedekSira}` : '',
              },
            },
          })
          .catch((err) => console.error('Kullanıcı bildirim hatası:', err));

        supabase.functions
          .invoke('send-bulk-email', {
            body: {
              email_type: 'admin_new_application',
              recipients: [{ email: '__ADMIN__', name: 'Admin' }],
              extra_data: {
                name: formData.name,
                tc_no: formData.tcNo || '',
                email: formData.email || '-',
                phone: formData.phone || '-',
                airline: (formData.airline === 'Diğer' ? formData.airlineOther : formData.airline) || '-',
                fleet: (formData.fleet === 'Diğer' ? formData.fleetOther : formData.fleet) || '-',
                age_group: formData.ageGroup || '-',
                ticket_label: isYedek ? '🟡 Yedek' : '🟢 Asil',
                yedek_sira: isYedek && yedekSira ? `#${yedekSira}` : '-',
                guest_label: formData.bringGuest ? '✅ Evet (+1)' : '❌ Hayır',
                guest_name: formData.bringGuest && formData.guestName ? formData.guestName : '-',
              },
            },
          })
          .catch((err) => console.error('Admin bildirim hatası:', err));
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
      setApiError('Başvuru gönderilirken bir iletişim hatası oluştu.');
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

  const resetToStep1 = () => {
    setStep(1);
    setTcInput('');
    setValue('tcNo', '');
    setAttendedBefore(false);
    setSubmissionStatus(null);
    setTicketType(null);
  };

  return {
    // State
    step,
    setStep,
    tcInput,
    setTcInput,
    tcError,
    setTcError,
    submitting,
    apiError,
    quotaStats,
    isQuotaFull,
    attendedBefore,
    submissionStatus,
    ticketType,
    selectedCluster,
    setSelectedCluster,
    submittingSeating,
    remainingSeconds,
    timeLeft,
    tableStats,
    firstErrorRef,
    // Form
    form,
    bringGuest,
    // Handlers
    handleTcSubmit,
    handleSeatingSubmit,
    onValid,
    onInvalid,
    resetToStep1,
  };
}
