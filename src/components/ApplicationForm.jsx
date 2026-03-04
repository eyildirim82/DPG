import React, { useState, useEffect } from 'react';
import { Controller } from 'react-hook-form';
import { motion } from 'framer-motion';
import FormInput from './ui/FormInput';
import FormSelect from './ui/FormSelect';
import Button from './ui/Button';
import { theme } from '../styles/theme';
import { FLEET_OPTIONS, AGE_GROUP_OPTIONS, AIRLINE_OPTIONS, formatPhoneNumber } from '../lib/validation';
import useApplicationForm from '../hooks/useApplicationForm.jsx';
import TCVerifyStep from './form/TCVerifyStep';
import { OPEN_DATE } from './CountdownTimer';
import { fetchPublicRuntimeFlags } from '../lib/runtimeFlags';

const envCountdownEnabled = import.meta.env.VITE_ENABLE_APPLICATION_COUNTDOWN !== 'false';

export default function ApplicationForm({ onSubmitSuccess }) {
  /* ───── Countdown state (başvuru açılış: 2 Mart 2026, 10:00) ───── */
  const [countdownEnabled, setCountdownEnabled] = useState(envCountdownEnabled);
  const [isOpen, setIsOpen] = useState(() => !envCountdownEnabled || new Date() >= OPEN_DATE);
  const [countdown, setCountdown] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchCountdownSetting = async () => {
      try {
        const flags = await fetchPublicRuntimeFlags();
        if (isMounted && typeof flags.countdown_enabled === 'boolean') {
          setCountdownEnabled(flags.countdown_enabled);
        }
      } catch (err) {
        console.error('Countdown setting could not be loaded, env fallback will be used:', err);
      }
    };

    fetchCountdownSetting();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!countdownEnabled) {
      setIsOpen(true);
      setCountdown(null);
      return;
    }

    setIsOpen(new Date() >= OPEN_DATE);
  }, [countdownEnabled]);

  useEffect(() => {
    if (!countdownEnabled || isOpen) return;

    const tick = () => {
      const now = new Date();
      const diff = OPEN_DATE - now;
      if (diff <= 0) {
        setIsOpen(true);
        setCountdown(null);
        return null;
      }
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / (1000 * 60)) % 60);
      const s = Math.floor((diff / 1000) % 60);
      setCountdown({ days: d, hours: h, minutes: m, seconds: s });
      return diff;
    };

    tick();
    const timer = setInterval(() => {
      if (tick() === null) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, countdownEnabled]);

  const {
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
    remainingSeconds,
    timeLeft,
    firstErrorRef,
    form,
    bringGuest,
    handleTcSubmit,
    onValid,
    onInvalid,
    resetToStep1,
  } = useApplicationForm({ onSubmitSuccess });

  // Havuza özel kota doluluk kontrolleri
  const isReturningFull = quotaStats &&
    quotaStats.asil_returning_reserved >= quotaStats.asil_returning_capacity;
  const isNewFull = quotaStats &&
    quotaStats.asil_new_reserved >= quotaStats.asil_new_capacity;

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
    watch,
  } = form;

  const fleetValue = watch('fleet');
  const airlineValue = watch('airline');
  const paymentApproval = watch('paymentApproval');

  return (
    <motion.section
      id="basvur"
      className="py-6 md:py-10 max-w-[700px] mx-auto px-4 md:px-0"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.6 }}
    >
      {/* ───── Title ───── */}
      <div className="text-center mb-6 md:mb-8">
        <h2 className="font-heading font-normal tracking-wide uppercase text-3xl md:text-4xl text-dpg-silver text-center mb-6 md:mb-8 relative inline-block">
          Başvuru Formu
          <span className="block w-[60px] h-px bg-dpg-gold mt-2.5 mx-auto" />
        </h2>
      </div>

      {/* ───── Pricing ───── */}
      <div
        className="border border-dpg-gold/60 rounded-sm py-4 px-4 md:py-6 md:px-8 mb-8 text-center"
        style={{ backgroundColor: 'rgba(230, 194, 117, 0.06)' }}
      >
        <p className="font-heading text-dpg-gold text-xl md:text-2xl font-semibold tracking-wide">
          Katılım ücreti: {bringGuest ? '6.000 ₺ (2 Kişi)' : '3.000 ₺'}
        </p>
        <p className="text-dpg-text-muted text-sm md:text-base mt-2 font-body">
          Başvuru açılış: 2 Mart 2026, 10:00
        </p>
      </div>

      {/* ───── API Error ───── */}
      {apiError && (
        <div
          className="mb-6 py-4 px-5 rounded border border-red-500/50 bg-red-500/10 text-red-400 text-base md:text-lg font-body"
          role="alert"
        >
          {apiError}
        </div>
      )}

      {/* ───── Accessibility ───── */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {step === 2 && 'T.C. Kimlik No doğrulandı. Başvuru formu açıldı. Lütfen bilgilerinizi eksiksiz doldurun.'}
      </div>

      {/* ═══════════════ STEP 1 — TC Verification ═══════════════ */}
      {/* ═══════════════ COUNTDOWN — Başvuru henüz açılmadıysa ═══════════════ */}
      {step === 1 && countdownEnabled && !isOpen && countdown ? (
        <div className="text-center">
          <div className="grid grid-cols-4 gap-3 md:gap-4 mb-6">
            {[
              { label: 'Gün', value: countdown.days },
              { label: 'Saat', value: countdown.hours },
              { label: 'Dakika', value: countdown.minutes },
              { label: 'Saniye', value: countdown.seconds },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col items-center">
                <div
                  className="w-full py-4 md:py-5 rounded-lg shadow-lg"
                  style={{
                    background: 'linear-gradient(180deg, rgba(230,194,117,0.18) 0%, rgba(230,194,117,0.06) 100%)',
                    border: '1px solid rgba(230,194,117,0.3)',
                  }}
                >
                  <span className="text-3xl md:text-5xl font-bold tabular-nums text-dpg-gold">
                    {String(value).padStart(2, '0')}
                  </span>
                </div>
                <span className="mt-2 text-xs md:text-sm font-medium text-dpg-text-muted uppercase tracking-wider">
                  {label}
                </span>
              </div>
            ))}
          </div>
          <p className="text-dpg-text-muted text-sm md:text-base">
            Başvuru sistemi otomatik olarak açılacaktır, lütfen bekleyiniz.
          </p>
        </div>
      ) : isQuotaFull ? (
        <div className="mb-8">
          <div
            role="status"
            className="max-w-xl mx-auto p-8 rounded-2xl border-2 border-blue-800 bg-gradient-to-br from-blue-600 to-blue-900 text-white text-center shadow-lg"
          >
            <div className="flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold mb-2">Bilgilendirme</h3>
            <p className="text-base leading-relaxed">
              Değerli Kaptanlarımız etkinliğe olan ilginizden dolayı teşekkür ederiz. Asil ve yedek kotalarımız tamamen dolmuştur.
            </p>
          </div>
        </div>
      ) : step === 1 ? (
        <TCVerifyStep
          tcInput={tcInput}
          setTcInput={setTcInput}
          tcError={tcError}
          setTcError={setTcError}
          submitting={submitting}
          onSubmit={handleTcSubmit}
          isReturningFull={isReturningFull}
          isNewFull={isNewFull}
        />
      ) : (
        /* ═══════════════ STEP 2 — Application Form ═══════════════ */
        <form onSubmit={handleSubmit(onValid, onInvalid)} noValidate>
          {/* Timer */}
          {remainingSeconds > 0 && timeLeft && !submissionStatus && (
            <div className="mb-6 py-6 px-4 rounded-xl border-2 border-dpg-gold/60 bg-dpg-gold/10 text-dpg-gold text-center font-bold text-2xl flex flex-col items-center gap-3 shadow-[0_0_20px_rgba(230,194,117,0.2)] animate-pulse-slow">
              <span className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Geçici Rezervasyon Süreniz
              </span>
              <span className="text-4xl text-white tracking-widest bg-dpg-gold/20 px-4 py-2 rounded-lg border border-dpg-gold/30">
                {timeLeft}
              </span>
              <span className="text-sm text-dpg-gold/80 font-normal">
                Değerli Kaptanımız yeriniz geçici olarak ayrılmıştır. Lütfen kaydınızı tamamlayınız.
              </span>
            </div>
          )}

          {/* TC Display */}
          <div className="mb-6 py-4 px-5 rounded border border-dpg-gold/30 bg-dpg-gold/5 text-dpg-text-muted text-xl font-body flex justify-between items-center">
            <span>
              TC Kimlik No:{' '}
              {((tc) => (tc ? tc.slice(0, 3) + '****' + tc.slice(7) : ''))(watch('tcNo') || '')}
            </span>
            <button
              type="button"
              onClick={resetToStep1}
              className="text-dpg-gold text-base md:text-lg ml-4 underline hover:no-underline"
            >
              Değiştir
            </button>
          </div>

          {/* Status Banners */}
          {submissionStatus === 'approved' || submissionStatus === 'asil' ? (
            <div className="mb-6 py-4 px-5 rounded border border-green-500/50 bg-green-500/10 flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                <strong className="block text-green-400 text-lg md:text-xl mb-1">Başvurunuz Onaylanmıştır!</strong>
                <span className="text-green-200 text-base md:text-lg font-body">
                  Bilgilerinizi aşağıdaki formdan güncelleyebilirsiniz.
                </span>
              </div>
            </div>
          ) : submissionStatus ? (
            <div className="mb-6 py-4 px-5 rounded border border-blue-500/50 bg-blue-500/10 text-blue-200 text-base md:text-lg font-body">
              <strong>Bilgilendirme:</strong> Başvurunuz daha önce başarıyla alınmıştır. Aşağıdaki formdan bilgilerinizi güncelleyebilirsiniz.
            </div>
          ) : null}

          {ticketType === 'yedek' && !submissionStatus && (
            <div className="mb-6 py-4 px-5 rounded border border-yellow-500/50 bg-yellow-500/10 text-yellow-200 text-base md:text-lg font-body" data-testid="yedek-step2-banner">
              <strong>Bilgilendirme:</strong>{' '}
              {attendedBefore
                ? 'Eski katılımcılar için ayrılan asil kontenjan dolduğu için'
                : 'Yeni katılımcılar için ayrılan asil kontenjan dolduğu için'}{' '}
              başvurunuz <strong>Yedek Liste</strong> üzerinden değerlendirilecektir.
              Asil listeden iptal olması durumunda sıranıza göre asil listeye alınacaksınız.
            </div>
          )}

          {/* ───── Form Fields ───── */}
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
                <FormSelect
                  label="Havayolu Şirketi"
                  options={AIRLINE_OPTIONS}
                  value={field.value}
                  onChange={(e) => {
                    field.onChange(e);
                    if (e.target.value !== 'Diğer') setValue('airlineOther', '');
                  }}
                  onBlur={field.onBlur}
                  error={error?.message}
                />
              )}
            />
            {airlineValue === 'Diğer' && (
              <div className="mt-3" data-field-error={!!errors.airlineOther}>
                <Controller
                  name="airlineOther"
                  control={control}
                  render={({ field: otherField, fieldState: { error } }) => (
                    <FormInput
                      type="text"
                      placeholder=" "
                      value={otherField.value}
                      onChange={otherField.onChange}
                      onBlur={otherField.onBlur}
                      label="Havayolu Şirketi (Diğer)"
                      error={error?.message}
                    />
                  )}
                />
              </div>
            )}
          </div>

          <div data-field-error={!!errors.fleet}>
            <Controller
              name="fleet"
              control={control}
              render={({ field, fieldState: { error } }) => (
                <FormSelect
                  label="Filo Bilgisi"
                  options={FLEET_OPTIONS}
                  value={field.value}
                  onChange={(e) => {
                    field.onChange(e);
                    if (e.target.value !== 'Diğer') setValue('fleetOther', '');
                  }}
                  onBlur={field.onBlur}
                  error={error?.message}
                />
              )}
            />
            {fleetValue === 'Diğer' && (
              <div className="mt-3" data-field-error={!!errors.fleetOther}>
                <Controller
                  name="fleetOther"
                  control={control}
                  render={({ field: otherField, fieldState: { error } }) => (
                    <FormInput
                      type="text"
                      placeholder=" "
                      value={otherField.value}
                      onChange={otherField.onChange}
                      onBlur={otherField.onBlur}
                      label="Filo Bilgisi (Diğer)"
                      error={error?.message}
                    />
                  )}
                />
              </div>
            )}
          </div>

          <div data-field-error={!!errors.ageGroup}>
            <Controller
              name="ageGroup"
              control={control}
              render={({ field, fieldState: { error } }) => (
                <FormSelect
                  label="Yaş Grubu"
                  options={AGE_GROUP_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
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
                  onChange={(e) => {
                    const formatted = formatPhoneNumber(e.target.value);
                    field.onChange(formatted);
                  }}
                  onBlur={field.onBlur}
                  focused={undefined}
                  label="Telefon Numarası"
                  error={error?.message}
                  maxLength={13}
                />
              )}
            />
          </div>

          {/* ───── Guest Toggle ───── */}
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

          {/* ───── KVKK & Payment Consent ───── */}
          <div className="flex flex-col gap-6 mb-12">
            {/* KVKK */}
            <div
              className="flex items-start gap-4 p-4 rounded border transition-colors duration-300"
              style={{
                borderColor: watch('kvkkApproval') ? 'rgba(230, 194, 117, 0.5)' : 'rgba(230, 194, 117, 0.3)',
                backgroundColor: 'rgba(230, 194, 117, 0.04)',
              }}
              data-field-error={!!errors.kvkkApproval}
            >
              <Controller
                name="kvkkApproval"
                control={control}
                render={({ field }) => (
                  <div className="flex flex-col w-full">
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
                        {field.value && <span className="w-4 h-4 bg-dpg-gold block" />}
                      </span>
                      <span
                        className="ml-4 text-base md:text-lg font-body font-medium"
                        style={{ color: errors.kvkkApproval ? '#b91c1c' : theme.colors.textMuted }}
                      >
                        <a
                          href="https://www.talpa.org/wp-content/uploads/2019/12/opark-aydinlatma-metni-kodlu.pdf"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-dpg-gold underline hover:no-underline font-semibold"
                          onClick={(e) => e.stopPropagation()}
                        >
                          KVKK Aydınlatma Metni
                        </a>
                        'ni okudum, onaylıyorum.
                      </span>
                    </label>
                    {errors.kvkkApproval && (
                      <p className="text-xs text-red-500 font-body mt-2 ml-11">{errors.kvkkApproval.message}</p>
                    )}
                  </div>
                )}
              />
            </div>

            {/* Payment */}
            <div
              className="flex items-start gap-4 p-4 rounded border transition-colors duration-300"
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
                  <div className="flex flex-col w-full">
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
                        {field.value && <span className="w-4 h-4 bg-dpg-gold block" />}
                      </span>
                      <span
                        className="ml-4 text-base md:text-lg font-body font-medium"
                        style={{ color: errors.paymentApproval ? '#b91c1c' : theme.colors.textMuted }}
                      >
                        {ticketType === 'yedek'
                          ? `Yedek listede olduğumu anlıyorum. Asıl listeye geçmem durumunda ${bringGuest ? '6.000 ₺' : '3.000 ₺'} ödemenin tahsil edilmesini onaylıyorum.`
                          : `${bringGuest ? '6.000 ₺' : '3.000 ₺'} ödemenin TALPA'ya kayıtlı kredi kartımdan tahsil edilmesini onaylıyorum.`}
                      </span>
                    </label>
                    {errors.paymentApproval && (
                      <p className="text-xs text-red-500 font-body mt-2 ml-11">{errors.paymentApproval.message}</p>
                    )}
                  </div>
                )}
              />
            </div>
          </div>

          <Button type="submit" className="w-full" style={{ opacity: submitting ? 0.7 : 1 }} disabled={submitting}>
            {submitting ? 'İşleniyor...' : 'Katılımımı Onayla'}
          </Button>
        </form>
      )}
    </motion.section>
  );
}
