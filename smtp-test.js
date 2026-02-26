import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp-mail.outlook.com',
  port: 587,
  secure: false,
  auth: {
    user: 'dpg@talpa.org',
    pass: 'Talpa.123'
  },
  tls: {
    ciphers: 'SSLv3'
  }
});

async function testSmtp() {
  console.log('SMTP bağlantısı test ediliyor...');
  console.log('Sunucu: smtp-mail.outlook.com:587');
  console.log('Kullanıcı: dpg@talpa.org');
  console.log('Alıcı: e.yildirim9315@gmail.com');
  console.log('---');

  try {
    // Önce bağlantıyı doğrula
    await transporter.verify();
    console.log('✅ SMTP bağlantısı başarılı!');

    // Test e-postası gönder
    const info = await transporter.sendMail({
      from: '"DPG - Talpa" <dpg@talpa.org>',
      to: 'e.yildirim9315@gmail.com',
      subject: 'SMTP Test - ' + new Date().toLocaleString('tr-TR'),
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a365d;">DPG - SMTP Test</h2>
          <p>Bu bir SMTP test e-postasıdır.</p>
          <p>Eğer bu mesajı görüyorsanız, e-posta gönderimi başarıyla çalışıyor demektir. ✅</p>
          <hr style="border: 1px solid #e2e8f0; margin: 20px 0;">
          <p style="color: #718096; font-size: 12px;">
            Gönderim zamanı: ${new Date().toLocaleString('tr-TR')}<br>
            Sunucu: smtp-mail.outlook.com:587
          </p>
        </div>
      `
    });

    console.log('✅ E-posta başarıyla gönderildi!');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
  } catch (err) {
    console.error('❌ HATA:', err.message);
    if (err.code) console.error('Kod:', err.code);
    if (err.responseCode) console.error('SMTP Yanıt Kodu:', err.responseCode);
  }
}

testSmtp();
