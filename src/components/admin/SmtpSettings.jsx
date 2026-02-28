import React, { useState, useEffect } from 'react';
import { Settings, Save, RefreshCw, Send, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, Server, Plus, X, Mail } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const DEFAULT_SETTINGS = {
    host: 'smtp-mail.outlook.com',
    port: 587,
    secure: false,
    username: '',
    password: '',
    from_name: 'DPG - TALPA',
    from_email: '',
    tls_ciphers: '',
    is_active: true,
    admin_emails: '',
};

const PRESET_PROVIDERS = [
    { label: 'Outlook / Office 365', host: 'smtp-mail.outlook.com', port: 587, secure: false },
    { label: 'Gmail', host: 'smtp.gmail.com', port: 587, secure: false },
    { label: 'Yandex', host: 'smtp.yandex.com', port: 465, secure: true },
    { label: 'Amazon SES (EU)', host: 'email-smtp.eu-west-1.amazonaws.com', port: 587, secure: false },
    { label: 'Özel SMTP', host: '', port: 587, secure: false },
];

export default function SmtpSettings() {
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [original, setOriginal] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [toast, setToast] = useState(null);

    // Test email state
    const [testEmail, setTestEmail] = useState('');
    const [testing, setTesting] = useState(false);

    // Admin email input state
    const [newAdminEmail, setNewAdminEmail] = useState('');

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 4000);
    };

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('cf_smtp_settings')
                .select('*')
                .limit(1)
                .single();

            if (error) throw error;
            if (data) {
                const s = {
                    id: data.id,
                    host: data.host || '',
                    port: data.port || 587,
                    secure: data.secure || false,
                    username: data.username || '',
                    password: data.password || '',
                    from_name: data.from_name || '',
                    from_email: data.from_email || '',
                    tls_ciphers: data.tls_ciphers || '',
                    is_active: data.is_active ?? true,
                    admin_emails: data.admin_emails || '',
                };
                setSettings(s);
                setOriginal(s);
            }
        } catch (err) {
            console.error('SMTP ayarları yüklenemedi:', err);
            showToast('SMTP ayarları yüklenemedi.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchSettings(); }, []);

    const handleSave = async () => {
        if (!settings.host.trim() || !settings.username.trim()) {
            showToast('Host ve Kullanıcı Adı zorunlu alanlardır.', 'error');
            return;
        }
        setSaving(true);
        try {
            if (settings.id) {
                const { error } = await supabase
                    .from('cf_smtp_settings')
                    .update({
                        host: settings.host.trim(),
                        port: settings.port,
                        secure: settings.secure,
                        username: settings.username.trim(),
                        password: settings.password,
                        from_name: settings.from_name.trim(),
                        from_email: settings.from_email.trim(),
                        tls_ciphers: settings.tls_ciphers?.trim() || null,
                        is_active: settings.is_active,
                        admin_emails: settings.admin_emails?.trim() || null,
                    })
                    .eq('id', settings.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('cf_smtp_settings')
                    .insert({
                        host: settings.host.trim(),
                        port: settings.port,
                        secure: settings.secure,
                        username: settings.username.trim(),
                        password: settings.password,
                        from_name: settings.from_name.trim(),
                        from_email: settings.from_email.trim(),
                        tls_ciphers: settings.tls_ciphers?.trim() || null,
                        is_active: settings.is_active,
                        admin_emails: settings.admin_emails?.trim() || null,
                    });
                if (error) throw error;
            }
            setOriginal({ ...settings });
            showToast('SMTP ayarları başarıyla kaydedildi.');
        } catch (err) {
            console.error('SMTP kaydetme hatası:', err);
            showToast('Kaydetme hatası: ' + err.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleTestEmail = async () => {
        if (!testEmail.trim()) {
            showToast('Lütfen test e-posta adresi girin.', 'error');
            return;
        }
        setTesting(true);
        try {
            const { data, error } = await supabase.functions.invoke('send-bulk-email', {
                body: {
                    email_type: 'smtp_test',
                    recipients: [{ email: testEmail.trim(), name: 'SMTP Test' }],
                    extra_data: {
                        test_time: new Date().toLocaleString('tr-TR'),
                        smtp_host: settings.host,
                        smtp_port: settings.port,
                    },
                },
            });

            if (error) {
                // Edge Function context error
                let errorMsg = error.message || 'Bilinmeyen hata';
                if (error.context) {
                    try {
                        const text = await error.context.text();
                        errorMsg = text || errorMsg;
                    } catch (_) {}
                }
                showToast('Test başarısız: ' + errorMsg, 'error');
            } else if (data?.success === false) {
                showToast('Test başarısız: ' + (data.message || 'Bilinmeyen hata'), 'error');
            } else {
                showToast(`Test e-postası ${testEmail} adresine gönderildi!`);
            }
        } catch (err) {
            console.error('SMTP test hatası:', err);
            showToast('Test gönderim hatası: ' + err.message, 'error');
        } finally {
            setTesting(false);
        }
    };

    const applyPreset = (preset) => {
        setSettings((prev) => ({
            ...prev,
            host: preset.host,
            port: preset.port,
            secure: preset.secure,
        }));
    };

    // Admin emails helpers
    const adminEmailList = (settings.admin_emails || '')
        .split(',')
        .map((e) => e.trim())
        .filter(Boolean);

    const addAdminEmail = () => {
        const email = newAdminEmail.trim().toLowerCase();
        if (!email) return;
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showToast('Geçersiz e-posta adresi.', 'error');
            return;
        }
        if (adminEmailList.includes(email)) {
            showToast('Bu adres zaten ekli.', 'error');
            return;
        }
        const updated = [...adminEmailList, email].join(', ');
        setSettings((prev) => ({ ...prev, admin_emails: updated }));
        setNewAdminEmail('');
    };

    const removeAdminEmail = (emailToRemove) => {
        const updated = adminEmailList.filter((e) => e !== emailToRemove).join(', ');
        setSettings((prev) => ({ ...prev, admin_emails: updated }));
    };

    const hasChanges = original && JSON.stringify({
        host: settings.host, port: settings.port, secure: settings.secure,
        username: settings.username, password: settings.password,
        from_name: settings.from_name, from_email: settings.from_email,
        tls_ciphers: settings.tls_ciphers, is_active: settings.is_active,
        admin_emails: settings.admin_emails,
    }) !== JSON.stringify({
        host: original.host, port: original.port, secure: original.secure,
        username: original.username, password: original.password,
        from_name: original.from_name, from_email: original.from_email,
        tls_ciphers: original.tls_ciphers, is_active: original.is_active,
        admin_emails: original.admin_emails,
    });

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-dpg-gold"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
                    {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                    {toast.msg}
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Server className="w-7 h-7 text-blue-600" />
                    SMTP Ayarları
                </h2>
                <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${settings.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        <span className={`w-2 h-2 rounded-full ${settings.is_active ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        {settings.is_active ? 'Aktif' : 'Devre Dışı'}
                    </span>
                </div>
            </div>

            {/* Provider Presets */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Hızlı Seçim — Mail Sağlayıcı</h3>
                <div className="flex flex-wrap gap-2">
                    {PRESET_PROVIDERS.map((preset) => (
                        <button
                            key={preset.label}
                            onClick={() => applyPreset(preset)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                                settings.host === preset.host
                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Settings Form */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-gray-500" />
                    Sunucu Yapılandırması
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Host */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">SMTP Sunucu (Host)</label>
                        <input
                            type="text"
                            value={settings.host}
                            onChange={(e) => setSettings({ ...settings, host: e.target.value })}
                            placeholder="smtp-mail.outlook.com"
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    {/* Port */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Port</label>
                        <input
                            type="number"
                            min="1"
                            max="65535"
                            value={settings.port}
                            onChange={(e) => setSettings({ ...settings, port: parseInt(e.target.value) || 587 })}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    {/* Username */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Kullanıcı Adı (E-posta)</label>
                        <input
                            type="email"
                            value={settings.username}
                            onChange={(e) => setSettings({ ...settings, username: e.target.value })}
                            placeholder="dpg@talpa.org"
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    {/* Password */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Şifre / App Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={settings.password}
                                onChange={(e) => setSettings({ ...settings, password: e.target.value })}
                                placeholder="••••••••"
                                className="w-full px-4 py-2.5 pr-12 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* From Name */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Gönderici Adı</label>
                        <input
                            type="text"
                            value={settings.from_name}
                            onChange={(e) => setSettings({ ...settings, from_name: e.target.value })}
                            placeholder="DPG - TALPA"
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    {/* From Email */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Gönderici E-posta</label>
                        <input
                            type="email"
                            value={settings.from_email}
                            onChange={(e) => setSettings({ ...settings, from_email: e.target.value })}
                            placeholder="dpg@talpa.org"
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <p className="text-xs text-gray-400 mt-1">Boş bırakılırsa kullanıcı adı kullanılır.</p>
                    </div>
                </div>

                {/* Advanced Options */}
                <div className="mt-6 pt-6 border-t border-gray-100">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Gelişmiş Ayarlar</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Secure / SSL */}
                        <div className="flex items-center gap-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.secure}
                                    onChange={(e) => setSettings({ ...settings, secure: e.target.checked })}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700 font-medium">SSL/TLS (Port 465)</span>
                            </label>
                        </div>

                        {/* TLS Ciphers */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">TLS Ciphers (Opsiyonel)</label>
                            <input
                                type="text"
                                value={settings.tls_ciphers}
                                onChange={(e) => setSettings({ ...settings, tls_ciphers: e.target.value })}
                                placeholder="Boş bırakılabilir"
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        {/* Active Toggle */}
                        <div className="flex items-center gap-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.is_active}
                                    onChange={(e) => setSettings({ ...settings, is_active: e.target.checked })}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700 font-medium">E-posta gönderimi aktif</span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Save Buttons */}
                <div className="mt-6 flex items-center gap-3">
                    <button
                        onClick={handleSave}
                        disabled={saving || !hasChanges}
                        className={`flex items-center gap-2 px-6 py-3 rounded-lg text-white font-medium transition-all ${
                            hasChanges ? 'bg-blue-600 hover:bg-blue-700 cursor-pointer' : 'bg-gray-300 cursor-not-allowed'
                        }`}
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {saving ? 'Kaydediliyor...' : 'Kaydet'}
                    </button>
                    <button
                        onClick={fetchSettings}
                        className="flex items-center gap-2 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Yenile
                    </button>
                </div>
            </div>

            {/* Admin Notification Emails Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Mail className="w-5 h-5 text-indigo-600" />
                    Admin Bildirim E-postaları
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                    Yeni başvuru, iletişim formu vb. bildirimlerin gönderileceği admin e-posta adresleri.
                    Birden fazla adres ekleyebilirsiniz.
                </p>

                {/* Email Chips */}
                <div className="flex flex-wrap gap-2 mb-4 min-h-[2.5rem]">
                    {adminEmailList.length === 0 && (
                        <span className="text-sm text-gray-400 italic">Henüz admin e-posta adresi eklenmedi.</span>
                    )}
                    {adminEmailList.map((email) => (
                        <span
                            key={email}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium border border-indigo-200"
                        >
                            {email}
                            <button
                                type="button"
                                onClick={() => removeAdminEmail(email)}
                                className="ml-0.5 text-indigo-400 hover:text-red-500 transition-colors"
                                title="Kaldır"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </span>
                    ))}
                </div>

                {/* Add New Email */}
                <div className="flex items-end gap-3">
                    <div className="flex-1">
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Yeni E-posta Ekle</label>
                        <input
                            type="email"
                            value={newAdminEmail}
                            onChange={(e) => setNewAdminEmail(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    addAdminEmail();
                                }
                            }}
                            placeholder="admin@example.com"
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={addAdminEmail}
                        disabled={!newAdminEmail.trim()}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-white font-medium transition-all whitespace-nowrap ${
                            newAdminEmail.trim() ? 'bg-indigo-600 hover:bg-indigo-700 cursor-pointer' : 'bg-gray-300 cursor-not-allowed'
                        }`}
                    >
                        <Plus className="w-4 h-4" />
                        Ekle
                    </button>
                </div>

                <p className="text-xs text-gray-400 mt-3">
                    💡 Değişikliklerinizi uygulamak için yukarıdaki <strong>Kaydet</strong> butonuna basmayı unutmayın.
                </p>
            </div>

            {/* Test Email Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Send className="w-5 h-5 text-green-600" />
                    Test E-postası Gönder
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                    Kayıtlı SMTP ayarlarını doğrulamak için bir test e-postası gönderin.
                    Önce ayarları kaydettiğinizden emin olun.
                </p>
                <div className="flex items-end gap-3">
                    <div className="flex-1">
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Alıcı E-posta</label>
                        <input
                            type="email"
                            value={testEmail}
                            onChange={(e) => setTestEmail(e.target.value)}
                            placeholder="test@example.com"
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <button
                        onClick={handleTestEmail}
                        disabled={testing || !testEmail.trim()}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-white font-medium transition-all whitespace-nowrap ${
                            testEmail.trim() ? 'bg-green-600 hover:bg-green-700 cursor-pointer' : 'bg-gray-300 cursor-not-allowed'
                        }`}
                    >
                        {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        {testing ? 'Gönderiliyor...' : 'Test Gönder'}
                    </button>
                </div>

                {/* Connection Info */}
                {settings.host && settings.username && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-500 font-mono">
                        <span className="text-gray-400">Bağlantı:</span>{' '}
                        {settings.username}@{settings.host}:{settings.port}{' '}
                        ({settings.secure ? 'SSL' : 'STARTTLS'})
                    </div>
                )}
            </div>
        </div>
    );
}
