// supabase/functions/send-bulk-email/index.ts
// Supabase Edge Function — SMTP ile e-posta gönderimi (nodemailer)
// Deno runtime (Supabase Edge Functions) — v21

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import nodemailer from "npm:nodemailer@6";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  from_name: string;
  from_email: string;
  tls_ciphers: string | null;
  is_active: boolean;
  admin_emails: string | null;
}

function getSupabaseAdmin() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
}

async function getSmtpConfig(): Promise<SmtpConfig> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('cf_smtp_settings')
    .select('*')
    .eq('is_active', true)
    .limit(1)
    .single();

  if (error || !data) {
    console.warn('DB SMTP config not found, falling back to env vars:', error?.message);
    return {
      host: Deno.env.get('SMTP_HOST') || 'smtp.office365.com',
      port: parseInt(Deno.env.get('SMTP_PORT') || '587'),
      secure: Deno.env.get('SMTP_SECURE') === 'true',
      username: Deno.env.get('SMTP_USER') || '',
      password: Deno.env.get('SMTP_PASS') || '',
      from_name: Deno.env.get('SMTP_FROM_NAME') || 'DPG - TALPA',
      from_email: Deno.env.get('SMTP_USER') || '',
      tls_ciphers: null,
      is_active: true,
      admin_emails: null,
    };
  }

  return {
    host: data.host,
    port: data.port,
    secure: data.secure,
    username: data.username,
    password: data.password,
    from_name: data.from_name || 'DPG - TALPA',
    from_email: data.from_email || data.username,
    tls_ciphers: data.tls_ciphers,
    is_active: data.is_active,
    admin_emails: data.admin_emails || null,
  };
}

async function getEmailTemplate(emailType: string): Promise<{ subject: string; body_html: string } | null> {
  if (!emailType) return null;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('cf_email_templates')
    .select('subject, body_html')
    .eq('slug', emailType)
    .eq('is_active', true)
    .limit(1)
    .single();
  if (error || !data) return null;
  return data;
}

function renderTemplate(html: string, vars: Record<string, string>): string {
  return html.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
}

async function logEmail(payload: Record<string, unknown>) {
  try {
    const supabase = getSupabaseAdmin();
    await supabase.from('cf_email_logs').insert([payload]);
  } catch (e) {
    console.error('Email log error:', e);
  }
}

async function resolveAdminEmails(smtp: SmtpConfig): Promise<string[]> {
  if (smtp.admin_emails) {
    const list = String(smtp.admin_emails).split(',').map(e => e.trim()).filter(Boolean);
    if (list.length > 0) return list;
  }
  return smtp.from_email ? [smtp.from_email] : smtp.username ? [smtp.username] : [];
}

// ── Fallback templates ────────────────────────
const FALLBACK: Record<string, { subject: string; body: string }> = {
  smtp_test: {
    subject: 'DPG SMTP Test — {{test_time}}',
    body: '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;"><h2 style="color:#1a365d;">DPG - SMTP Test ✅</h2><p>SMTP bağlantısı başarıyla doğrulandı.</p><p><strong>Sunucu:</strong> {{smtp_host}}:{{smtp_port}}</p><p><strong>Zaman:</strong> {{test_time}}</p></div>',
  },
  contact_form: {
    subject: 'Yeni İletişim Formu — {{subject}}',
    body: '<h2 style="color:#051424;">📩 Yeni İletişim Mesajı</h2><table style="width:100%;border-collapse:collapse;margin:16px 0;"><tr><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600;width:120px;">Gönderen</td><td style="padding:8px 12px;border:1px solid #e2e8f0;">{{sender_name}}</td></tr><tr><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600;">E-posta</td><td style="padding:8px 12px;border:1px solid #e2e8f0;"><a href="mailto:{{sender_email}}">{{sender_email}}</a></td></tr><tr><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600;">Konu</td><td style="padding:8px 12px;border:1px solid #e2e8f0;">{{subject}}</td></tr></table><div style="background:#f8fafc;border-left:4px solid #E6C275;padding:16px;margin:16px 0;border-radius:4px;"><p style="margin:0;color:#333;font-size:15px;line-height:1.6;white-space:pre-wrap;">{{message}}</p></div>',
  },
  status_approved: {
    subject: 'Başvurunuz Onaylandı — DPG 2026',
    body: '<h2 style="color:#051424;">🎉 Tebrikler, {{name}}!</h2><p style="color:#333;font-size:15px;line-height:1.6;">DPG 2026 etkinlik başvurunuz <strong style="color:#16a34a;">onaylanmıştır</strong>.</p><p style="color:#333;font-size:15px;">Liste: <strong>{{ticket_label}}</strong></p><p style="color:#666;font-size:14px;">Detaylar için <a href="https://dpg.talpa.org" style="color:#E6C275;">dpg.talpa.org</a> adresini ziyaret edebilirsiniz.</p>',
  },
  status_rejected: {
    subject: 'Başvurunuz Hakkında — DPG 2026',
    body: '<h2 style="color:#051424;">Sayın {{name}},</h2><p style="color:#333;font-size:15px;line-height:1.6;">DPG 2026 etkinlik başvurunuz değerlendirilmiş olup, maalesef <strong style="color:#dc2626;">reddedilmiştir</strong>.</p><p style="color:#666;font-size:14px;">Sorularınız için <a href="mailto:dpg@talpa.org" style="color:#E6C275;">dpg@talpa.org</a> adresinden bize ulaşabilirsiniz.</p>',
  },
  status_cancelled: {
    subject: 'Başvurunuz İptal Edildi — DPG 2026',
    body: '<h2 style="color:#051424;">Sayın {{name}},</h2><p style="color:#333;font-size:15px;line-height:1.6;">DPG 2026 etkinlik başvurunuz <strong style="color:#d97706;">iptal edilmiştir</strong>.</p><p style="color:#666;font-size:14px;">Sorularınız için <a href="mailto:dpg@talpa.org" style="color:#E6C275;">dpg@talpa.org</a> adresinden bize ulaşabilirsiniz.</p>',
  },
};

// ── Email wrapper ────────────────────────
const WRAP_HEAD = `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>TALPA DPG 2026</title></head><body style="margin:0;padding:0;background:#f4f6f9;font-family:'Segoe UI',Tahoma,sans-serif;"><table role="presentation" width="100%" style="background:#f4f6f9;"><tr><td align="center" style="padding:24px 10px;"><table role="presentation" width="600" style="max-width:600px;width:100%;"><tr><td style="background:#051424;padding:28px 40px;text-align:center;border-radius:12px 12px 0 0;"><img src="https://dpg.talpa.org/talpa-logo.png" alt="TALPA" width="160" style="display:block;max-width:160px;height:auto;margin:0 auto;"/><p style="margin:12px 0 0;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#E6C275;">Dünya Pilotlar Günü 2026</p></td></tr><tr><td style="background:#fff;padding:32px 40px;">`;

const WRAP_FOOT = `</td></tr><tr><td style="background:#051424;padding:32px 40px;border-radius:0 0 12px 12px;text-align:center;"><p style="margin:0 0 8px;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#E6C275;">TALPA</p><p style="margin:0;color:#5a6d83;font-size:11px;">&copy; 2026 Türk Hava Yolu Pilotları Derneği (TALPA)</p></td></tr></table></td></tr></table></body></html>`;

function wrapHtml(body: string): string {
  return WRAP_HEAD + body + WRAP_FOOT;
}

// ── Main handler ────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { subject, message, recipients, email_type, extra_data, target_group } = body;

    if (!recipients || recipients.length === 0) {
      return jsonRes({ success: false, message: 'Alıcı belirtilmedi.' }, 400);
    }

    // 1. Get SMTP config
    const smtp = await getSmtpConfig();
    if (!smtp.is_active) {
      return jsonRes({ success: false, message: 'E-posta gönderimi devre dışı.' });
    }
    if (!smtp.username || !smtp.password) {
      return jsonRes({ success: false, message: 'SMTP kimlik bilgileri eksik. Admin panelinden yapılandırın.' }, 500);
    }

    // 2. Resolve subject & body
    let finalSubject = subject || '';
    let finalBody = message || '';

    if (email_type) {
      const tpl = await getEmailTemplate(email_type);
      if (tpl) {
        const vars: Record<string, string> = { ...extra_data };
        if (recipients[0]?.name && !vars.name) vars.name = recipients[0].name;
        if (recipients[0]?.email && !vars.email) vars.email = recipients[0].email;
        finalSubject = renderTemplate(tpl.subject, vars);
        finalBody = renderTemplate(tpl.body_html, vars);
      } else if (FALLBACK[email_type]) {
        const fb = FALLBACK[email_type];
        const vars: Record<string, string> = { ...extra_data };
        if (!vars.name) vars.name = recipients[0]?.name || '';
        if (!vars.email) vars.email = recipients[0]?.email || '';
        finalSubject = renderTemplate(fb.subject, vars);
        finalBody = renderTemplate(fb.body, vars);
      } else {
        return jsonRes({ success: false, message: `Bilinmeyen email_type: ${email_type}` }, 400);
      }
    }

    if (!finalSubject && !finalBody) {
      return jsonRes({ success: false, message: 'Konu veya içerik belirtilmedi.' }, 400);
    }

    // Wrap body with email template chrome
    const wrappedHtml = wrapHtml(finalBody);

    // 3. From address
    const fromAddr = smtp.from_email || smtp.username;
    const fromDisplay = `${smtp.from_name || 'DPG - TALPA'} <${fromAddr}>`;

    console.log(`SMTP: ${smtp.host}:${smtp.port} (${smtp.username}) -> ${recipients.length} recipients`);

    // 4. Create nodemailer transporter
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure || smtp.port === 465,
      auth: { user: smtp.username, pass: smtp.password },
      ...(smtp.tls_ciphers ? { tls: { ciphers: smtp.tls_ciphers } } : {}),
    });

    // 5. Send to each recipient
    const results: Array<{ email: string; success: boolean; error?: string }> = [];

    for (const recipient of recipients) {
      let toEmails: string[] = [];
      if (recipient.email === '__ADMIN__') {
        toEmails = await resolveAdminEmails(smtp);
      } else {
        toEmails = recipient.email ? [recipient.email] : [];
      }

      for (const toEmail of toEmails) {
        const recipientVars: Record<string, string> = { ...extra_data, name: recipient.name || '', email: toEmail };
        const thisSubject = renderTemplate(finalSubject, recipientVars);
        const thisBody = renderTemplate(wrappedHtml, recipientVars);

        try {
          await transporter.sendMail({
            from: fromDisplay,
            to: toEmail,
            subject: thisSubject,
            html: thisBody,
          });
          results.push({ email: toEmail, success: true });
          console.log(`✅ Sent to ${toEmail}`);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          results.push({ email: toEmail, success: false, error: msg });
          console.error(`❌ Failed ${toEmail}:`, msg);
        }
      }
    }

    try { transporter.close(); } catch (_) { /* ignore */ }

    // 6. Log
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    await logEmail({
      email_type: email_type || 'manual',
      subject: finalSubject,
      recipient_count: recipients.length,
      success_count: successCount,
      fail_count: failCount,
      target_group: target_group || null,
      details: JSON.stringify(results),
    });

    return jsonRes({
      success: failCount === 0,
      message: `${successCount} başarılı, ${failCount} başarısız.`,
      sent: successCount,
      failed: failCount,
      results,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Edge function error:', msg);
    return jsonRes({ success: false, error: msg }, 500);
  }
});

function jsonRes(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
