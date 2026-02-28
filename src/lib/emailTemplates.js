/**
 * TALPA DPG 2026 — E-posta Şablon Altyapısı
 * 
 * Kurumsal Kimlik:
 *   Lacivert:  #051424  (Ana arka plan)
 *   Koyu Mavi: #0A2239  (İkincil panel)
 *   Altın:     #E6C275  (Vurgu, CTA)
 *   Gümüş:     #C4CCD4  (İkincil metin)
 *   Beyaz:     #FFFFFF  (Birincil metin)
 */

// ─────────────────────────────────────────────────
// E-posta Wrapper (Header + Footer)
// ─────────────────────────────────────────────────
export const EMAIL_WRAPPER_HEADER = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="tr">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no" />
  <title>TALPA DPG 2026</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; height: 100% !important; }
    a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; font-size: inherit !important; font-family: inherit !important; font-weight: inherit !important; line-height: inherit !important; }
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .fluid { max-width: 100% !important; height: auto !important; }
      .stack-column { display: block !important; width: 100% !important; }
      .stack-column-center { text-align: center !important; }
      .center-on-narrow { text-align: center !important; display: block !important; margin-left: auto !important; margin-right: auto !important; float: none !important; }
      table.center-on-narrow { display: inline-block !important; }
      .mobile-padding { padding-left: 20px !important; padding-right: 20px !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#f4f6f9; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <!-- Preheader (gizli ön metin) -->
  <div style="display:none; font-size:1px; line-height:1px; max-height:0px; max-width:0px; opacity:0; overflow:hidden; mso-hide:all;">
    TALPA Dünya Pilotlar Günü 2026
  </div>

  <!-- Email Body -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f4f6f9;">
    <tr>
      <td align="center" style="padding: 24px 10px;">

        <!-- Email Container -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="email-container" style="max-width:600px; width:100%;">

          <!-- ===== HEADER ===== -->
          <tr>
            <td style="background-color:#051424; padding:28px 40px; text-align:center; border-radius:12px 12px 0 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom:12px;">
                    <img src="https://dpg.talpa.org/talpa-logo.png" alt="TALPA" width="160" style="display:block; max-width:160px; height:auto;" />
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="width:40px; border-bottom:2px solid #E6C275;"></td>
                        <td style="padding:0 12px;">
                          <p style="margin:0; font-size:12px; letter-spacing:3px; text-transform:uppercase; color:#E6C275; font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
                            Dünya Pilotlar Günü 2026
                          </p>
                        </td>
                        <td style="width:40px; border-bottom:2px solid #E6C275;"></td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ===== CONTENT AREA ===== -->
          <tr>
            <td style="background-color:#ffffff; padding:0;">
              <!-- İçerik buraya gelir -->`;

export const EMAIL_WRAPPER_FOOTER = `
              <!-- İçerik sonu -->
            </td>
          </tr>

          <!-- ===== FOOTER ===== -->
          <tr>
            <td style="background-color:#051424; padding:32px 40px; border-radius:0 0 12px 12px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom:16px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="width:60px; border-bottom:1px solid #1a3a5c;"></td>
                        <td style="padding:0 10px;">
                          <p style="margin:0; font-size:10px; letter-spacing:2px; text-transform:uppercase; color:#E6C275; font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">TALPA</p>
                        </td>
                        <td style="width:60px; border-bottom:1px solid #1a3a5c;"></td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="color:#5a6d83; font-size:11px; line-height:18px; font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
                    &copy; 2026 Türk Hava Yolu Pilotları Derneği (TALPA)<br/>
                    Bu e-posta, DPG 2026 etkinlik başvuru sistemi tarafından otomatik olarak gönderilmiştir.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
        <!-- /Email Container -->

      </td>
    </tr>
  </table>
</body>
</html>`;


// ─────────────────────────────────────────────────
// Yardımcı: CTA Buton (Outlook uyumlu)
// ─────────────────────────────────────────────────
export function ctaButton(text, href, bgColor = '#E6C275', textColor = '#051424') {
  return `
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto;">
    <tr>
      <td style="border-radius:8px; background-color:${bgColor};">
        <!--[if mso]>
        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${href}" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="17%" strokecolor="${bgColor}" fillcolor="${bgColor}">
          <w:anchorlock/>
          <center style="color:${textColor};font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:15px;font-weight:bold;">${text}</center>
        </v:roundrect>
        <![endif]-->
        <!--[if !mso]><!-->
        <a href="${href}" target="_blank" style="display:inline-block; padding:14px 36px; font-size:15px; font-weight:700; font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; color:${textColor}; background-color:${bgColor}; text-decoration:none; border-radius:8px; text-align:center; mso-padding-alt:0; line-height:normal;">
          ${text}
        </a>
        <!--<![endif]-->
      </td>
    </tr>
  </table>`;
}


// ─────────────────────────────────────────────────
// Şablonlar — adım adım eklenecek
// ─────────────────────────────────────────────────
export const DEFAULT_TEMPLATES = [];


/**
 * Wrapper ile birlikte tam HTML oluşturur.
 * @param {string} bodyHtml - İç içerik HTML'i
 * @returns {string} Tam e-posta HTML'i
 */
export function wrapEmailHtml(bodyHtml) {
  return EMAIL_WRAPPER_HEADER + bodyHtml + EMAIL_WRAPPER_FOOTER;
}

/**
 * Şablon değişkenlerini verilerle değiştirir.
 * @param {string} html - HTML içeriği
 * @param {Object} data - Anahtar-değer çiftleri (ör. { name: "Ahmet" })
 * @returns {string} İşlenmiş HTML
 */
export function renderTemplate(html, data = {}) {
  return html.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] !== undefined ? data[key] : match;
  });
}
