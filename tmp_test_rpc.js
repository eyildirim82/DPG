
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testPublicRPC() {
    console.log('Testing public RPC: get_ticket_stats...');
    const { data, error } = await supabase.rpc('get_ticket_stats');

    if (error) {
        console.error('❌ RPC failed:', error.message);
        console.error('Full Error:', JSON.stringify(error, null, 2));
    } else {
        console.log('✅ RPC successful!');
        console.log('Stats:', JSON.stringify(data, null, 2));
    }
}

testPublicRPC();
