import React, { useState, useEffect } from 'react';
import { Settings, Save, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function QuotaSettings() {
    const [settings, setSettings] = useState({
        asil_returning_capacity: 500,
        asil_new_capacity: 200,
        total_capacity: 1500,
        countdown_enabled: true,
        applications_closed: false,
        checkin_enabled: false,
        otp_enabled: false,
        otp_bypass_enabled: false,
        checkin_actions_enabled: false,
    });
    const [original, setOriginal] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('cf_quota_settings')
                .select('*')
                .limit(1)
                .single();

            if (error) throw error;
            if (data) {
                const s = {
                    id: data.id,
                    asil_returning_capacity: data.asil_returning_capacity,
                    asil_new_capacity: data.asil_new_capacity,
                    total_capacity: data.total_capacity,
                    countdown_enabled: data.countdown_enabled ?? true,
                    applications_closed: data.applications_closed ?? false,
                    checkin_enabled: data.checkin_enabled ?? false,
                    otp_enabled: data.otp_enabled ?? false,
                    otp_bypass_enabled: data.otp_bypass_enabled ?? false,
                    checkin_actions_enabled: data.checkin_actions_enabled ?? false,
                };
                setSettings(s);
                setOriginal(s);
            }
        } catch (err) {
            console.error('Error fetching quota settings:', err);
            setMessage({ type: 'error', text: 'Kota ayarları yüklenemedi.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchSettings(); }, []);

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);

        const asilTotal = settings.asil_returning_capacity + settings.asil_new_capacity;
        if (asilTotal > settings.total_capacity) {
            setMessage({ type: 'error', text: `Asil kota toplamı (${asilTotal}) toplam kotadan (${settings.total_capacity}) büyük olamaz.` });
            setSaving(false);
            return;
        }

        try {
            const updatePayload = {
                asil_returning_capacity: settings.asil_returning_capacity,
                asil_new_capacity: settings.asil_new_capacity,
                total_capacity: settings.total_capacity,
                countdown_enabled: settings.countdown_enabled,
                applications_closed: settings.applications_closed,
                checkin_enabled: settings.checkin_enabled,
                otp_enabled: settings.otp_enabled,
                otp_bypass_enabled: settings.otp_bypass_enabled,
                checkin_actions_enabled: settings.checkin_actions_enabled,
                updated_at: new Date().toISOString(),
            };

            let { error } = await supabase
                .from('cf_quota_settings')
                .update(updatePayload)
                .eq('id', settings.id);

            if (error) throw error;

            setOriginal({ ...settings });
            setMessage({ type: 'success', text: 'Kota ayarları başarıyla güncellendi.' });
        } catch (err) {
            console.error('Error saving quota settings:', err);
            const baseText = err?.message ? `Kota ayarları kaydedilemedi: ${err.message}` : 'Kota ayarları kaydedilemedi.';
            setMessage({ type: 'error', text: baseText });
        } finally {
            setSaving(false);
        }
    };

    const hasChanges = original && (
        settings.asil_returning_capacity !== original.asil_returning_capacity ||
        settings.asil_new_capacity !== original.asil_new_capacity ||
        settings.total_capacity !== original.total_capacity ||
        settings.countdown_enabled !== original.countdown_enabled ||
        settings.applications_closed !== original.applications_closed ||
        settings.checkin_enabled !== original.checkin_enabled ||
        settings.otp_enabled !== original.otp_enabled ||
        settings.otp_bypass_enabled !== original.otp_bypass_enabled ||
        settings.checkin_actions_enabled !== original.checkin_actions_enabled
    );

    const asilTotal = settings.asil_returning_capacity + settings.asil_new_capacity;
    const yedekCapacity = settings.total_capacity - asilTotal;

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-dpg-gold"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <Settings className="mr-2 text-dpg-navy" /> Kota Ayarları
            </h2>

            {message && (
                <div className={`py-3 px-4 rounded-lg text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                    {message.text}
                </div>
            )}

            {/* Summary Card */}
            <div className="bg-gradient-to-br from-dpg-navy to-blue-900 rounded-xl p-6 text-white shadow-lg">
                <h3 className="text-blue-200 text-sm font-medium mb-3 uppercase tracking-wider">Kota Dağılımı Özet</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white/10 rounded-lg p-4 text-center">
                        <div className="text-3xl font-bold">{settings.asil_returning_capacity}</div>
                        <div className="text-blue-200 text-xs mt-1">Asil (Eski Katılımcı)</div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-4 text-center">
                        <div className="text-3xl font-bold text-green-300">{settings.asil_new_capacity}</div>
                        <div className="text-blue-200 text-xs mt-1">Asil (Yeni Katılımcı)</div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-4 text-center">
                        <div className="text-3xl font-bold text-yellow-300">{asilTotal}</div>
                        <div className="text-blue-200 text-xs mt-1">Toplam Asil</div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-4 text-center">
                        <div className="text-3xl font-bold text-slate-300">{yedekCapacity}</div>
                        <div className="text-blue-200 text-xs mt-1">Yedek Kota</div>
                    </div>
                </div>
                <div className="mt-4 border-t border-white/15 pt-4 flex items-center justify-between">
                    <span className="text-blue-100 text-sm">Başvuru Geri Sayımı</span>
                    <span className={`text-sm font-semibold ${settings.countdown_enabled ? 'text-green-300' : 'text-red-300'}`}>
                        {settings.countdown_enabled ? 'Açık' : 'Kapalı'}
                    </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full border ${settings.applications_closed ? 'border-red-300 text-red-200' : 'border-green-300 text-green-200'}`}>
                        Başvurular {settings.applications_closed ? 'Kapalı' : 'Açık'}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full border ${settings.checkin_enabled ? 'border-green-300 text-green-200' : 'border-slate-300 text-slate-200'}`}>
                        Check-in {settings.checkin_enabled ? 'Açık' : 'Kapalı'}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full border ${settings.otp_enabled ? 'border-green-300 text-green-200' : 'border-slate-300 text-slate-200'}`}>
                        OTP {settings.otp_enabled ? 'Açık' : 'Kapalı'}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full border ${settings.otp_bypass_enabled ? 'border-yellow-300 text-yellow-200' : 'border-slate-300 text-slate-200'}`}>
                        OTP Bypass {settings.otp_bypass_enabled ? 'Açık' : 'Kapalı'}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full border ${settings.checkin_actions_enabled ? 'border-green-300 text-green-200' : 'border-slate-300 text-slate-200'}`}>
                        Check-in Aksiyonları {settings.checkin_actions_enabled ? 'Açık' : 'Kapalı'}
                    </span>
                </div>
            </div>

            {/* Settings Form */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Asil Kota — Eski Katılımcılar
                        </label>
                        <p className="text-xs text-gray-500 mb-2">Daha önceki yıllarda başvuru yapmış üyeler için ayrılan asil kota.</p>
                        <input
                            type="number"
                            min="0"
                            value={settings.asil_returning_capacity}
                            onChange={(e) => setSettings({ ...settings, asil_returning_capacity: parseInt(e.target.value) || 0 })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg font-bold text-center bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Asil Kota — Yeni Katılımcılar
                        </label>
                        <p className="text-xs text-gray-500 mb-2">İlk defa başvuru yapacak üyeler için ayrılan asil kota.</p>
                        <input
                            type="number"
                            min="0"
                            value={settings.asil_new_capacity}
                            onChange={(e) => setSettings({ ...settings, asil_new_capacity: parseInt(e.target.value) || 0 })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg font-bold text-center bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Toplam Kota (Asil + Yedek)
                        </label>
                        <p className="text-xs text-gray-500 mb-2">Tüm başvuru türlerini kapsayan toplam kontenjan.</p>
                        <input
                            type="number"
                            min="0"
                            value={settings.total_capacity}
                            onChange={(e) => setSettings({ ...settings, total_capacity: parseInt(e.target.value) || 0 })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg font-bold text-center bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                </div>

                <div className="mt-6 border-t border-gray-200 pt-6">
                    <label className="flex items-start gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.countdown_enabled}
                            onChange={(e) => setSettings({ ...settings, countdown_enabled: e.target.checked })}
                            className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span>
                            <span className="block text-sm font-semibold text-gray-700">Başvuru geri sayımını göster</span>
                            <span className="block text-xs text-gray-500 mt-1">
                                Kapalı olduğunda başvuru formu geri sayımı beklemeden doğrudan açılır.
                            </span>
                        </span>
                    </label>
                </div>

                <div className="mt-4 space-y-3">
                    <label className="flex items-start gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.applications_closed}
                            onChange={(e) => setSettings({ ...settings, applications_closed: e.target.checked })}
                            className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span>
                            <span className="block text-sm font-semibold text-gray-700">Başvuruları kapat</span>
                            <span className="block text-xs text-gray-500 mt-1">
                                Açık olduğunda başvuru dönemi kapalı kabul edilir ve check-in ekranına geçiş için hazır olur.
                            </span>
                        </span>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.checkin_enabled}
                            onChange={(e) => setSettings({ ...settings, checkin_enabled: e.target.checked })}
                            className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span>
                            <span className="block text-sm font-semibold text-gray-700">Check-in ekranını etkinleştir</span>
                            <span className="block text-xs text-gray-500 mt-1">
                                Public tarafta check-in akışının görünür olmasını kontrol eder.
                            </span>
                        </span>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.otp_enabled}
                            onChange={(e) => setSettings({ ...settings, otp_enabled: e.target.checked })}
                            className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span>
                            <span className="block text-sm font-semibold text-gray-700">E-posta OTP doğrulamayı etkinleştir</span>
                            <span className="block text-xs text-gray-500 mt-1">
                                Check-in içinde OTP gönderim/doğrulama adımlarını açar.
                            </span>
                        </span>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.otp_bypass_enabled}
                            onChange={(e) => setSettings({ ...settings, otp_bypass_enabled: e.target.checked })}
                            className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span>
                            <span className="block text-sm font-semibold text-gray-700">OTP bypass (yalnız test için)</span>
                            <span className="block text-xs text-gray-500 mt-1">
                                Açıkken TC ile OTP kodu girmeden check-in akışına geçilebilir. Canlıda kapalı tutulmalıdır.
                            </span>
                        </span>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.checkin_actions_enabled}
                            onChange={(e) => setSettings({ ...settings, checkin_actions_enabled: e.target.checked })}
                            className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span>
                            <span className="block text-sm font-semibold text-gray-700">Check-in aksiyonlarını etkinleştir</span>
                            <span className="block text-xs text-gray-500 mt-1">
                                Doğrulama sonrası `Check-in / Düzenle / İptal` aksiyonlarını açar.
                            </span>
                        </span>
                    </label>
                </div>

                {asilTotal > settings.total_capacity && (
                    <div className="mt-4 py-2 px-4 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
                        ⚠️ Asil kota toplamı ({asilTotal}) toplam kotadan ({settings.total_capacity}) büyük olamaz.
                    </div>
                )}

                <div className="mt-6 flex items-center gap-3">
                    <button
                        onClick={handleSave}
                        disabled={saving || !hasChanges || asilTotal > settings.total_capacity}
                        className={`flex items-center gap-2 px-6 py-3 rounded-lg text-white font-medium transition-all ${hasChanges && asilTotal <= settings.total_capacity
                            ? 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
                            : 'bg-gray-300 cursor-not-allowed'
                            }`}
                    >
                        <Save className="w-4 h-4" />
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

        </div>
    );
}
