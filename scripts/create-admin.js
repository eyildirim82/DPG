
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('❌ Hata: .env dosyasında VITE_SUPABASE_URL veya SUPABASE_SERVICE_ROLE eksik.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function createAdmin(email, password) {
    if (!email || !password) {
        console.log('Kullanım: node scripts/create-admin.js <email> <sifre>');
        return;
    }

    console.log(`🚀 Yeni admin kullanıcısı oluşturuluyor: ${email}...`);

    const { data: { user }, error } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true
    });

    if (error) {
        console.error('❌ Kullanıcı oluşturulamadı:', error.message);
        if (error.message.includes('schema')) {
            console.log('💡 Not: "Database error querying schema" hatası alıyorsanız Supabase Dashboard üzerinden Auth ayarlarını kontrol edin.');
        }
    } else {
        console.log('✅ Kullanıcı başarıyla oluşturuldu!');
        console.log('ID:', user.id);
        console.log('Email:', user.email);
    }
}

const [, , email, password] = process.argv;
createAdmin(email, password);
