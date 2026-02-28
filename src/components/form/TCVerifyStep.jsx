import React from 'react';
import FormInput from '../ui/FormInput';
import Button from '../ui/Button';

export default function TCVerifyStep({ tcInput, setTcInput, tcError, setTcError, submitting, onSubmit, isReturningFull, isNewFull }) {
  return (
    <form onSubmit={onSubmit} noValidate>
      {(isReturningFull || isNewFull) && (
        <div
          className="mb-6 py-4 px-5 rounded border border-yellow-500/50 bg-yellow-500/10 text-yellow-200 text-base md:text-lg font-body"
          role="status"
          data-testid="yedek-banner"
        >
          <strong>Bilgilendirme:</strong>{' '}
          {isReturningFull && isNewFull
            ? 'Tüm asil kontenjanlar dolmuştur. Yeni başvurular Yedek Liste üzerinden değerlendirilecektir.'
            : isReturningFull
              ? 'Eski katılımcılar için ayrılan asil kontenjan dolmuştur. Daha önce etkinliğe katılmış üyelerimizin başvuruları Yedek Liste üzerinden değerlendirilecektir.'
              : 'Yeni katılımcılar için ayrılan asil kontenjan dolmuştur. İlk kez katılacak üyelerimizin başvuruları Yedek Liste üzerinden değerlendirilecektir.'
          }
        </div>
      )}
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
      <Button
        type="submit"
        className="w-full min-h-[48px] mt-2 mb-8"
        style={{ opacity: submitting ? 0.7 : 1 }}
      >
        {submitting ? 'Sorgulanıyor...' : 'TC KİMLİK NUMARASINI DOĞRULA VE DEVAM ET'}
      </Button>
    </form>
  );
}
