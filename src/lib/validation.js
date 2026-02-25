import { z } from 'zod';

/** Türkiye TC Kimlik No doğrulama (11 hane, resmi algoritma) */
export function isValidTCKimlikNo(val) {
  if (!val || typeof val !== 'string') return false;
  const digits = val.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  if (digits[0] === '0') return false;
  const d = digits.split('').map(Number);
  const sum13579 = d[0] + d[2] + d[4] + d[6] + d[8];
  const sum2468 = d[1] + d[3] + d[5] + d[7];
  const digit10 = (sum13579 * 7 - sum2468) % 10;
  if (digit10 < 0) return false;
  if (d[9] !== digit10) return false;
  const digit11 = (d.slice(0, 10).reduce((a, b) => a + b, 0)) % 10;
  if (d[10] !== digit11) return false;
  return true;
}

const tcNoSchema = z
  .string()
  .min(1, 'TC Kimlik No zorunludur.')
  .refine(
    (val) => /^\d{11}$/.test((val || '').replace(/\s/g, '')),
    'TC Kimlik No 11 rakamdan oluşmalıdır.'
  )
  .refine((val) => isValidTCKimlikNo(val), 'Geçerli bir TC Kimlik No giriniz.');

const fullNameMinWords = (val) => {
  if (!val || typeof val !== 'string') return false;
  const trimmed = val.trim();
  const words = trimmed.split(/\s+/).filter(Boolean);
  return words.length >= 2;
};

export const FLEET_OPTIONS = [
  { value: 'B737', label: 'B737' },
  { value: 'B777/787', label: 'B777/787' },
  { value: 'A320', label: 'A320' },
  { value: 'A330/350', label: 'A330/350' },
  { value: 'Diğer', label: 'Diğer' },
];

export const applicationFormSchema = z
  .object({
    tcNo: tcNoSchema,
    name: z
      .string()
      .min(1, 'Ad Soyad zorunludur.')
      .refine(fullNameMinWords, 'Lütfen en az ad ve soyad giriniz.'),
    airline: z.string().min(1, 'Havayolu şirketi zorunludur.'),
    fleet: z.string().min(1, 'Filo bilgisi zorunludur.'),
    fleetOther: z.string().optional(),
    email: z.string().min(1, 'E-posta zorunludur.').email('Geçerli bir e-posta adresi giriniz.'),
    phone: z
      .string()
      .min(1, 'Telefon numarası zorunludur.')
      .refine(
        (val) => (val && val.replace(/\D/g, '').length >= 10) || false,
        'Geçerli bir telefon numarası giriniz (en az 10 hane).'
      ),
    birthYear: z.string().refine((val) => {
      const year = parseInt(val, 10);
      return !isNaN(year) && year > 1900 && year <= new Date().getFullYear();
    }, 'Geçerli bir doğum yılı giriniz.'),
    bringGuest: z.boolean().optional().default(false),
    guestName: z.string().optional(),
    paymentApproval: z.literal(true, {
      errorMap: () => ({ message: 'Ödeme tahsilatını onaylamanız gerekmektedir.' }),
    }),
  })
  .refine(
    (data) => {
      if (data.bringGuest) {
        return data.guestName && data.guestName.trim().length > 0;
      }
      return true;
    },
    {
      message: 'Lütfen misafirinizin adını ve soyadını giriniz.',
      path: ['guestName'],
    }
  )
  .refine(
    (data) => {
      if (data.fleet === 'Diğer') {
        return data.fleetOther && data.fleetOther.trim().length > 0;
      }
      return true;
    },
    {
      message: 'Lütfen filo bilginizi giriniz.',
      path: ['fleetOther'],
    }
  );

export { tcNoSchema };
