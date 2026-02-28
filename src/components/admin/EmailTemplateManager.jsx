import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Mail, Plus, Edit3, Trash2, Eye, Save, X, ToggleLeft, ToggleRight, AlertCircle, CheckCircle2, Loader2, Copy, Download, Palette } from 'lucide-react';
import { DEFAULT_TEMPLATES, wrapEmailHtml } from '../../lib/emailTemplates';

const CATEGORY_LABELS = { applicant: 'Başvurana', admin: 'Admine' };
const CATEGORY_COLORS = { applicant: 'bg-blue-100 text-blue-700', admin: 'bg-purple-100 text-purple-700' };

const EMPTY_TEMPLATE = {
    slug: '', name: '', subject: '', body_html: '', category: 'applicant',
    variables: [], is_active: true, is_system: false,
};

export default function EmailTemplateManager() {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editTemplate, setEditTemplate] = useState(null);
    const [isNew, setIsNew] = useState(false);
    const [previewHtml, setPreviewHtml] = useState(null);
    const [toast, setToast] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const fetchTemplates = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('cf_email_templates')
            .select('*')
            .order('created_at', { ascending: true });
        if (error) {
            showToast('Şablonlar yüklenemedi: ' + error.message, 'error');
        } else {
            setTemplates(data || []);
        }
        setLoading(false);
    }, []);

    useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

    const openEdit = (tpl) => {
        setEditTemplate({
            ...tpl,
            variables: Array.isArray(tpl.variables) ? tpl.variables : [],
        });
        setIsNew(false);
        setPreviewHtml(null);
    };

    const openNew = () => {
        setEditTemplate({ ...EMPTY_TEMPLATE, variables: [] });
        setIsNew(true);
        setPreviewHtml(null);
    };

    const closeEdit = () => {
        setEditTemplate(null);
        setIsNew(false);
        setPreviewHtml(null);
    };

    const handleSave = async () => {
        if (!editTemplate) return;
        const { slug, name, subject, body_html, category, variables, is_active, is_system } = editTemplate;
        if (!slug.trim() || !name.trim() || !subject.trim() || !body_html.trim()) {
            showToast('Slug, Ad, Konu ve HTML Body zorunludur.', 'error');
            return;
        }
        setSaving(true);
        try {
            if (isNew) {
                const { error } = await supabase.from('cf_email_templates').insert({
                    slug: slug.trim(),
                    name: name.trim(),
                    subject: subject.trim(),
                    body_html: body_html.trim(),
                    category,
                    variables: variables || [],
                    is_active,
                    is_system: false,
                });
                if (error) throw error;
                showToast('Şablon başarıyla oluşturuldu.');
            } else {
                const { error } = await supabase
                    .from('cf_email_templates')
                    .update({
                        name: name.trim(),
                        subject: subject.trim(),
                        body_html: body_html.trim(),
                        category,
                        variables: variables || [],
                        is_active,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', editTemplate.id);
                if (error) throw error;
                showToast('Şablon başarıyla güncellendi.');
            }
            closeEdit();
            fetchTemplates();
        } catch (err) {
            showToast('Hata: ' + err.message, 'error');
        }
        setSaving(false);
    };

    const handleDelete = async (id) => {
        const { error } = await supabase.from('cf_email_templates').delete().eq('id', id);
        if (error) {
            showToast('Silme hatası: ' + error.message, 'error');
        } else {
            showToast('Şablon silindi.');
            setDeleteConfirm(null);
            fetchTemplates();
        }
    };

    const handleToggleActive = async (tpl) => {
        const { error } = await supabase
            .from('cf_email_templates')
            .update({ is_active: !tpl.is_active, updated_at: new Date().toISOString() })
            .eq('id', tpl.id);
        if (error) {
            showToast('Hata: ' + error.message, 'error');
        } else {
            fetchTemplates();
        }
    };

    const handlePreview = () => {
        if (!editTemplate) return;
        // Build a simple preview with sample data
        let html = editTemplate.body_html;
        const sampleData = {
            name: 'Ahmet Yılmaz',
            ticket_label: 'YEDEK LİSTEDE',
            yedek_sira_bilgisi: '<p style="margin:10px 0 0; font-size:15px; font-weight:700; color:#b45309; font-family:Segoe UI,sans-serif;">Yedek Sıranız: #5</p>',
            old_label: 'Yedek Liste',
            new_label: 'Asil Liste',
            tc_no: '123****8901',
            airline: 'THY',
            fleet: 'B737',
            sequence_number: '42',
            guest_label: '✅ Evet (+1)',
            sender_name: 'Mehmet Demir',
            sender_email: 'mehmet@example.com',
            subject: 'Etkinlik hakkında bilgi almak istiyorum',
            message: 'Merhaba, DPG 2026 etkinliği hakkında detaylı bilgi alabilir miyim? Teşekkürler.',
            asil_filled: '185',
            asil_total: '200',
            asil_remaining: '15',
            yedek_filled: '90',
            yedek_total: '100',
            yedek_remaining: '10',
        };
        html = html.replace(/\{\{(\w+)\}\}/g, (m, key) => sampleData[key] || m);
        // Wrap with header/footer for full preview
        setPreviewHtml(wrapEmailHtml(html));
    };

    const [newVar, setNewVar] = useState('');
    const addVariable = () => {
        if (!newVar.trim() || !editTemplate) return;
        if (editTemplate.variables.includes(newVar.trim())) return;
        setEditTemplate({ ...editTemplate, variables: [...editTemplate.variables, newVar.trim()] });
        setNewVar('');
    };
    const removeVariable = (v) => {
        if (!editTemplate) return;
        setEditTemplate({ ...editTemplate, variables: editTemplate.variables.filter(x => x !== v) });
    };

    const loadDefaultTemplates = async () => {
        const confirmed = window.confirm(
            `${DEFAULT_TEMPLATES.length} adet profesyonel e-posta şablonu yüklenecek.\n\nMevcut aynı slug'a sahip şablonlar güncellenmeyecek, sadece yeni slug'lar eklenecek.\n\nDevam etmek istiyor musunuz?`
        );
        if (!confirmed) return;
        setSaving(true);
        let added = 0;
        let skipped = 0;
        try {
            const existingSlugs = templates.map(t => t.slug);
            for (const tpl of DEFAULT_TEMPLATES) {
                if (existingSlugs.includes(tpl.slug)) {
                    skipped++;
                    continue;
                }
                const { error } = await supabase.from('cf_email_templates').insert({
                    slug: tpl.slug,
                    name: tpl.name,
                    subject: tpl.subject,
                    body_html: tpl.body_html,
                    category: tpl.category,
                    variables: tpl.variables || [],
                    is_active: true,
                    is_system: true,
                });
                if (error) {
                    console.error(`Şablon eklenemedi (${tpl.slug}):`, error);
                } else {
                    added++;
                }
            }
            showToast(`${added} şablon eklendi${skipped > 0 ? `, ${skipped} zaten mevcut` : ''}.`);
            fetchTemplates();
        } catch (err) {
            showToast('Hata: ' + err.message, 'error');
        }
        setSaving(false);
    };

    return (
        <div>
            {/* Toast */}
            {toast && (
                <div className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
                    {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                    {toast.msg}
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Mail className="w-7 h-7 text-blue-600" />
                        E-posta Şablonları
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Otomatik e-posta şablonlarını yönetin, düzenleyin veya yeni ekleyin.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={loadDefaultTemplates} disabled={saving} className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors shadow-sm disabled:opacity-50" title="Profesyonel varsayılan şablonları yükle">
                        <Download className="w-4 h-4" />
                        Hazır Şablonlar
                    </button>
                    <button onClick={openNew} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                        <Plus className="w-4 h-4" />
                        Yeni Şablon
                    </button>
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Slug</th>
                                    <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Ad</th>
                                    <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Konu</th>
                                    <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Kategori</th>
                                    <th className="text-center px-5 py-3.5 font-semibold text-gray-600">Durum</th>
                                    <th className="text-center px-5 py-3.5 font-semibold text-gray-600">Sistem</th>
                                    <th className="text-right px-5 py-3.5 font-semibold text-gray-600">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {templates.map(tpl => (
                                    <tr key={tpl.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-5 py-3.5 font-mono text-xs text-gray-700">{tpl.slug}</td>
                                        <td className="px-5 py-3.5 font-medium text-gray-900">{tpl.name}</td>
                                        <td className="px-5 py-3.5 text-gray-600 max-w-xs truncate">{tpl.subject}</td>
                                        <td className="px-5 py-3.5">
                                            <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${CATEGORY_COLORS[tpl.category] || 'bg-gray-100 text-gray-600'}`}>
                                                {CATEGORY_LABELS[tpl.category] || tpl.category}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5 text-center">
                                            <button onClick={() => handleToggleActive(tpl)} title={tpl.is_active ? 'Aktif — Pasif yap' : 'Pasif — Aktif yap'}>
                                                {tpl.is_active
                                                    ? <ToggleRight className="w-6 h-6 text-green-500 mx-auto" />
                                                    : <ToggleLeft className="w-6 h-6 text-gray-400 mx-auto" />}
                                            </button>
                                        </td>
                                        <td className="px-5 py-3.5 text-center text-xs text-gray-500">
                                            {tpl.is_system ? '🔒' : '—'}
                                        </td>
                                        <td className="px-5 py-3.5 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button onClick={() => openEdit(tpl)} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Düzenle">
                                                    <Edit3 className="w-4 h-4" />
                                                </button>
                                                {!tpl.is_system && (
                                                    <button onClick={() => setDeleteConfirm(tpl)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Sil">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {templates.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="text-center text-gray-400 py-12">Henüz şablon yok.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Delete Confirm Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Şablonu Sil</h3>
                        <p className="text-gray-600 text-sm mb-6">
                            <strong>"{deleteConfirm.name}"</strong> şablonunu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                                İptal
                            </button>
                            <button onClick={() => handleDelete(deleteConfirm.id)} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors">
                                Sil
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit / New Modal */}
            {editTemplate && (
                <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm overflow-y-auto py-8">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-4 my-auto">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-bold text-gray-900">
                                {isNew ? '✨ Yeni Şablon Oluştur' : `✏️ Şablonu Düzenle: ${editTemplate.name}`}
                            </h3>
                            <button onClick={closeEdit} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
                            {/* Slug + Name */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Slug (Benzersiz Anahtar)</label>
                                    <input
                                        type="text"
                                        value={editTemplate.slug}
                                        onChange={e => setEditTemplate({ ...editTemplate, slug: e.target.value.replace(/[^a-z0-9_]/g, '') })}
                                        disabled={!isNew}
                                        placeholder="ornek_slug"
                                        className={`w-full px-3.5 py-2.5 border rounded-lg text-sm font-mono ${!isNew ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'}`}
                                    />
                                    {isNew && <p className="text-xs text-gray-400 mt-1">Sadece küçük harf, rakam ve alt çizgi kullanın.</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Şablon Adı</label>
                                    <input
                                        type="text"
                                        value={editTemplate.name}
                                        onChange={e => setEditTemplate({ ...editTemplate, name: e.target.value })}
                                        placeholder="Başvuru Onaylandı"
                                        className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            {/* Subject + Category */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">E-posta Konu Satırı</label>
                                    <input
                                        type="text"
                                        value={editTemplate.subject}
                                        onChange={e => setEditTemplate({ ...editTemplate, subject: e.target.value })}
                                        placeholder="Başvurunuz Onaylandı ✓ - TALPA DPG"
                                        className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Kategori</label>
                                    <select
                                        value={editTemplate.category}
                                        onChange={e => setEditTemplate({ ...editTemplate, category: e.target.value })}
                                        className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    >
                                        <option value="applicant">Başvurana Giden</option>
                                        <option value="admin">Admin'e Giden</option>
                                    </select>
                                </div>
                            </div>

                            {/* Available Variables Reference */}
                            <div>
                                <details className="group">
                                    <summary className="flex items-center gap-2 text-sm font-semibold text-gray-700 cursor-pointer select-none mb-2 hover:text-blue-600 transition-colors">
                                        <svg className="w-4 h-4 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                        📋 Kullanılabilir Değişkenler
                                        <span className="text-xs text-gray-400 font-normal">(tıklayarak kopyala)</span>
                                    </summary>
                                    <div className="mt-2 p-4 bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-lg border border-gray-200 space-y-3">
                                        {[
                                            {
                                                label: 'Genel', vars: [
                                                    { k: 'name', d: 'Ad Soyad' },
                                                    { k: 'tc_no', d: 'TC Kimlik No' },
                                                ]
                                            },
                                            {
                                                label: 'Başvuru', vars: [
                                                    { k: 'airline', d: 'Havayolu' },
                                                    { k: 'fleet', d: 'Filo bilgisi' },
                                                    { k: 'ticket_label', d: 'Bilet tipi' },
                                                    { k: 'guest_label', d: 'Misafir' },
                                                    { k: 'sequence_number', d: 'Sıra No' },
                                                ]
                                            },
                                            {
                                                label: 'Bilet Değişikliği', vars: [
                                                    { k: 'old_label', d: 'Eski tip' },
                                                    { k: 'new_label', d: 'Yeni tip' },
                                                ]
                                            },
                                            {
                                                label: 'İletişim Formu', vars: [
                                                    { k: 'sender_name', d: 'Gönderen' },
                                                    { k: 'sender_email', d: 'E-posta' },
                                                    { k: 'subject', d: 'Konu' },
                                                    { k: 'message', d: 'Mesaj' },
                                                ]
                                            },
                                        ].map(group => (
                                            <div key={group.label}>
                                                <p className="text-[11px] uppercase tracking-wider text-gray-400 font-bold mb-1.5">{group.label}</p>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {group.vars.map(v => (
                                                        <button
                                                            key={v.k}
                                                            type="button"
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(`{{${v.k}}}`);
                                                                showToast(`{{${v.k}}} kopyalandı!`);
                                                            }}
                                                            className="inline-flex items-center gap-1 px-2 py-1 bg-white text-xs font-mono rounded border border-gray-200 text-gray-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all cursor-pointer shadow-sm"
                                                            title={v.d}
                                                        >
                                                            <Copy className="w-3 h-3 opacity-40" />
                                                            {`{{${v.k}}}`}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </details>
                            </div>

                            {/* Variables */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Değişkenler</label>
                                <p className="text-xs text-gray-400 mb-2">HTML içinde <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">{'{{degisken_adi}}'}</code> şeklinde kullanılır.</p>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {editTemplate.variables.map(v => (
                                        <span key={v} className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full border border-indigo-200">
                                            <code>{`{{${v}}}`}</code>
                                            <button onClick={() => removeVariable(v)} className="hover:text-red-500 transition-colors ml-0.5">
                                                <X className="w-3 h-3" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newVar}
                                        onChange={e => setNewVar(e.target.value.replace(/[^a-z0-9_]/g, ''))}
                                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addVariable())}
                                        placeholder="yeni_degisken"
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    />
                                    <button onClick={addVariable} className="px-3 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors">
                                        Ekle
                                    </button>
                                </div>
                            </div>

                            {/* HTML Body */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="block text-sm font-semibold text-gray-700">HTML Body (İç İçerik)</label>
                                    <button onClick={handlePreview} className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium">
                                        <Eye className="w-4 h-4" />
                                        Önizle
                                    </button>
                                </div>
                                <p className="text-xs text-gray-400 mb-2">Header/footer otomatik eklenir. Sadece e-posta içerik kısmını yazınız.</p>
                                <textarea
                                    value={editTemplate.body_html}
                                    onChange={e => setEditTemplate({ ...editTemplate, body_html: e.target.value })}
                                    rows={16}
                                    className="w-full px-3.5 py-3 border border-gray-300 rounded-lg text-sm font-mono leading-relaxed focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-y"
                                    placeholder="<p>Sayın {{name}},</p>..."
                                />
                            </div>

                            {/* Preview */}
                            {previewHtml && (
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-sm font-semibold text-gray-700">📧 Tam Önizleme (Header + İçerik + Footer)</label>
                                        <button onClick={() => setPreviewHtml(null)} className="text-xs text-gray-400 hover:text-gray-600">Kapat</button>
                                    </div>
                                    <div className="border border-gray-200 rounded-lg overflow-hidden bg-[#f4f6f9]">
                                        <iframe
                                            title="E-posta Önizleme"
                                            srcDoc={previewHtml}
                                            style={{ width: '100%', minHeight: '700px', border: 'none' }}
                                            sandbox="allow-same-origin"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Active Toggle */}
                            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <button
                                    onClick={() => setEditTemplate({ ...editTemplate, is_active: !editTemplate.is_active })}
                                    className="flex items-center gap-2"
                                >
                                    {editTemplate.is_active
                                        ? <ToggleRight className="w-7 h-7 text-green-500" />
                                        : <ToggleLeft className="w-7 h-7 text-gray-400" />}
                                    <span className="text-sm font-medium text-gray-700">
                                        {editTemplate.is_active ? 'Aktif — Bu şablon e-posta gönderimlerinde kullanılacak' : 'Pasif — Bu şablon kullanılmayacak'}
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                            <button onClick={closeEdit} className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                                İptal
                            </button>
                            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {isNew ? 'Oluştur' : 'Kaydet'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
