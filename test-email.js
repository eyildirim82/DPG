import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testEmail() {
    console.log('--- Email Test Start ---');
    console.log('URL:', supabaseUrl);

    try {
        const { data, error } = await supabase.functions.invoke('send-bulk-email', {
            body: {
                subject: 'Test Email - DPG Verification',
                message: 'SMTP ayarları başarıyla yapılandırıldı.',
                recipients: [{ email: 'dpg@talpa.org', name: 'DPG Admin' }],
                target_group: 'Verification Test'
            }
        });

        if (error) {
            console.error('Invoke Error:', error);
            if (error.context) {
                const text = await error.context.text();
                console.error('Error Context:', text);
            }
        } else {
            console.log('Response Data:', JSON.stringify(data, null, 2));
        }
    } catch (err) {
        console.error('Fatal Error:', err);
    }
    console.log('--- Email Test End ---');
}

testEmail();
