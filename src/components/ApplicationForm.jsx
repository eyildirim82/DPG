import React, { useState, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import FormInput from './ui/FormInput';
import Button from './ui/Button';
import { theme } from '../styles/theme';
import { applicationFormSchema, isValidTCKimlikNo } from '../lib/validation';

const defaultValues = {
  tcNo: '',
  name: '',
  airline: '',
  email: '',
  phone: '',
  participation: '',
  kvkk: false,
};

export default function ApplicationForm({ onSubmitSuccess }) {
  const [step, setStep] = useState(1);
  const [tcInput, setTcInput] = useState('');
  const [tcError, setTcError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState(null);
  const firstErrorRef = useRef(null);

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

  const participation = watch('participation');
  const kvkk = watch('kvkk');

  const handleTcSubmit = (e) => {
    e.preventDefault();
    setTcError(null);
    const trimmed = tcInput.replace(/\D/g, '');
    if (trimmed.length !== 11) {
      setTcError('TC Kimlik No 11 rakamdan oluşmalıdır.');
      return;
    }
    if (!isValidTCKimlikNo(trimmed)) {
      setTcError('Geçerli bir TC Kimlik No giriniz.');
      return;
    }
    setValue('tcNo', trimmed);
    setStep(2);
  };

  const onValid = async () => {
    setApiError(null);
    setSubmitting(true);
    try {
      await new Promise((r) => setTimeout(r, 1200));
      onSubmitSuccess?.();
      reset(defaultValues);
      setStep(1);
      setTcInput('');
      setTcError(null);
    } catch (err) {
      setApiError(
        'Başvuru gönderilemedi. Lütfen tekrar deneyin veya bizimle iletişime geçin.'
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
      className="py-16 md:py-24 max-w-[700px] mx-auto px-4 md:px-0"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.6 }}
    >
      <div className="text-center mb-8 md:mb-12">
        <h2 className="font-heading font-normal tracking-wide uppercase text-3xl md:text-4xl text-dpg-silver text-center mb-8 md:mb-12 relative inline-block">
          Başvuru Formu
          <span className="block w-[60px] h-px bg-dpg-gold mt-2.5 mx-auto" />
        </h2>
      </div>

      {/* Ücret ve başvuru tarihi vurgusu */}
      <div
        className="border border-dpg-gold/60 rounded-sm py-4 px-4 md:py-5 md:px-6 mb-8 md:mb-10 text-center"
        style={{ backgroundColor: 'rgba(230, 194, 117, 0.06)' }}
      >
        <p className="font-heading text-dpg-gold text-lg md:text-xl font-semibold tracking-wide">
          Katılım ücreti: 3.000 TL
        </p>
        <p className="text-dpg-text-muted text-xs md:text-sm mt-1 font-body">
          Başvuru açılış: 2 Mart 2026, 15:00
        </p>
      </div>

      {apiError && (
        <div
          className="mb-6 py-3 px-4 rounded border border-red-500/50 bg-red-500/10 text-red-400 text-sm font-body"
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
          <div className="mb-8">
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
            <p className="text-dpg-text-muted text-sm font-body mt-2 px-1">
              11 haneli TC Kimlik Numaranızı girin. Geçerli ise başvuru formu açılacaktır.
            </p>
          </div>
          <Button type="submit" className="w-full min-h-[48px] mt-2">
            Devam
          </Button>
        </form>
      ) : (
        <form onSubmit={handleSubmit(onValid, onInvalid)} noValidate>
          <div className="mb-6 py-3 px-4 rounded border border-dpg-gold/30 bg-dpg-gold/5 text-dpg-text-muted text-sm font-body flex justify-between items-center">
            <span>TC Kimlik No: {(watch('tcNo') || '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1***$2**$3*$4')}</span>
            <button
              type="button"
              onClick={() => { setStep(1); setTcInput(''); setValue('tcNo', ''); }}
              className="text-dpg-gold text-xs underline hover:no-underline"
            >
              Değiştir
            </button>
          </div>
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

          <div className="mb-10 relative" data-field-error={!!errors.participation}>
            <Controller
              name="participation"
              control={control}
              render={({ field }) => (
                <>
                  <select
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                    onBlur={field.onBlur}
                    className="w-full bg-white/5 hover:bg-white/10 border border-white/20 rounded-md px-4 py-4 text-dpg-text font-heading text-base md:text-xl outline-none transition-colors duration-300 appearance-none cursor-pointer min-h-[56px]"
                    style={{
                      color: participation ? theme.colors.text : theme.colors.textMuted,
                      borderColor: errors.participation
                        ? '#b91c1c'
                        : participation
                          ? theme.colors.gold
                          : undefined,
                    }}
                  >
                    <option value="">Katılım Tipi Seçiniz</option>
                    <option value="physical">Fiziksel Katılım (İstanbul)</option>
                    <option value="online">Online Katılım</option>
                  </select>
                  {errors.participation && (
                    <p className="absolute -bottom-5 left-0 text-xs text-red-500 font-body">
                      {errors.participation.message}
                    </p>
                  )}
                </>
              )}
            />
          </div>

          {/* KVKK – vurgulu */}
          <div
            className="flex items-start gap-4 mb-12 p-4 rounded border"
            style={{
              borderColor: kvkk ? 'rgba(230, 194, 117, 0.5)' : 'rgba(230, 194, 117, 0.3)',
              backgroundColor: 'rgba(230, 194, 117, 0.04)',
            }}
            data-field-error={!!errors.kvkk}
          >
            <Controller
              name="kvkk"
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
                      onClick={() => field.onChange(!field.value)}
                      onKeyDown={(e) =>
                        e.key === 'Enter' && field.onChange(!field.value)
                      }
                      className="w-5 h-5 border border-dpg-gold flex items-center justify-center cursor-pointer flex-shrink-0 mt-0.5"
                      aria-checked={field.value}
                    >
                      {field.value && (
                        <span className="w-2.5 h-2.5 bg-dpg-gold block" />
                      )}
                    </span>
                    <span
                      className="ml-4 text-sm font-body font-medium"
                      style={{
                        color: errors.kvkk ? '#b91c1c' : theme.colors.textMuted,
                      }}
                    >
                      KVKK kapsamında kişisel verilerimin işlenmesini kabul ediyorum.
                    </span>
                  </label>
                  {errors.kvkk && (
                    <p className="text-xs text-red-500 font-body mt-1 ml-9">
                      {errors.kvkk.message}
                    </p>
                  )}
                </>
              )}
            />
          </div>

          <Button type="submit" className="w-full" style={{ opacity: submitting ? 0.7 : 1 }}>
            {submitting ? 'İşleniyor...' : 'Katılımımı Onayla'}
          </Button>
        </form>
      )}
    </motion.section>
  );
}
