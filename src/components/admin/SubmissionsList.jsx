import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Download, Filter, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function SubmissionsList() {
    const [submissions, setSubmissions] = useState([]);
    const [form, setForm] = useState(null);
    const [loading, setLoading] = useState(true);

    // Bulk action & Modal states
    const [selectedRows, setSelectedRows] = useState([]);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: null, payload: null });

    // Filters and Search
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [ticketTypeFilter, setTicketTypeFilter] = useState('all');

    useEffect(() => {
        fetchData();

        const channel = supabase.channel('admin_submissions_channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'cf_submissions' }, (payload) => {
                fetchData();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const { data: formData } = await supabase.from('cf_forms').select('*').limit(1).single();

        if (formData) {
            setForm(formData);
            const [subsResult, yedekResult] = await Promise.all([
                supabase
                    .from('cf_submissions')
                    .select('*, cf_forms(title, schema)')
                    .eq('form_id', formData.id)
                    .eq('is_confirmed', true)
                    .order('created_at', { ascending: false }),
                supabase.rpc('get_yedek_sira')
            ]);

            if (subsResult.error) {
                console.error(subsResult.error);
            } else {
                const yedekMap = {};
                if (yedekResult.data) {
                    yedekResult.data.forEach(row => {
                        yedekMap[row.tc_no] = row.yedek_sira;
                    });
                }
                const merged = (subsResult.data || []).map(sub => ({
                    ...sub,
                    yedek_sira: sub.ticket_type === 'yedek' ? (yedekMap[sub.tc_no] || null) : null
                }));
                setSubmissions(merged);
            }
        }
        setLoading(false);
    };

    // Admin işlemlerini veritabanına kaydeden yardımcı fonksiyon
    const logAdminAction = async (actionType, targetTc, oldValue, newValue) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            await supabase.from('cf_audit_logs').insert([{
                admin_email: user?.email || 'Bilinmeyen Admin',
                action_type: actionType,
                target_tc: targetTc,
                old_value: String(oldValue),
                new_value: String(newValue)
            }]);
        } catch (err) {
            console.error('Log kaydedilemedi:', err);
        }
    };

    // E-posta bildirimi gönderen yardımcı fonksiyon
    const sendNotificationEmail = async (emailType, recipient, extraData = {}) => {
        if (!recipient.email) return;
        try {
            const { error } = await supabase.functions.invoke('send-bulk-email', {
                body: {
                    email_type: emailType,
                    recipients: [{ email: recipient.email, name: recipient.name }],
                    extra_data: extraData
                }
            });
            if (error) console.error('Bildirim e-postası hatası:', error);
        } catch (err) {
            console.error('E-posta gönderilemedi:', err);
        }
    };

    const handleTicketTypeChangeClick = (id, newType, tcNo) => {
        setConfirmModal({
            isOpen: true,
            type: 'single_ticket_type',
            payload: { id, newType, tcNo }
        });
    };

    const executeTicketTypeUpdate = async () => {
        const { id, newType, tcNo } = confirmModal.payload;
        const oldSub = submissions.find(s => s.id === id);
        const { error } = await supabase.from('cf_submissions').update({ ticket_type: newType }).eq('id', id);
        if (error) {
            alert('Bilet tipi güncellenirken hata oluştu.');
            console.error(error);
        } else {
            setSubmissions(submissions.map(sub => sub.id === id ? { ...sub, ticket_type: newType } : sub));
            await logAdminAction('TICKET_TYPE_CHANGE', tcNo, oldSub?.ticket_type || '', newType);

            // Bildirim e-postası gönder
            if (oldSub) {
                sendNotificationEmail('ticket_type_change', {
                    email: oldSub.data?.email,
                    name: oldSub.data?.name || oldSub.full_name || ''
                }, { old_label: oldSub.ticket_type === 'asil' ? 'Asil Liste' : 'Yedek Liste', new_label: newType === 'asil' ? 'Asil Liste' : 'Yedek Liste' });
            }
        }
        setConfirmModal({ isOpen: false, type: null, payload: null });
    };

    const handlePaymentStatusChangeClick = (id, tcNo, oldStatus, newStatus) => {
        setConfirmModal({
            isOpen: true,
            type: 'single_payment',
            payload: { id, tcNo, oldStatus, newStatus }
        });
    };

    const executePaymentStatusUpdate = async () => {
        const { id, tcNo, oldStatus, newStatus } = confirmModal.payload;
        const sub = submissions.find(s => s.id === id);
        const { error } = await supabase.from('cf_submissions').update({ payment_status: newStatus }).eq('id', id);
        if (error) {
            alert('Tahsilat durumu güncellenirken hata oluştu.');
            console.error(error);
        } else {
            setSubmissions(submissions.map(s => s.id === id ? { ...s, payment_status: newStatus } : s));
            await logAdminAction('PAYMENT_CHANGE', tcNo, oldStatus || 'pending', newStatus);

            // Ödeme onaylandığında bildirim gönder
            if (newStatus === 'paid' && sub) {
                sendNotificationEmail('payment_confirmed', {
                    email: sub.data?.email,
                    name: sub.data?.name || sub.full_name || ''
                });
            }
        }
        setConfirmModal({ isOpen: false, type: null, payload: null });
    };

    const handleDeleteClick = (id, tcNo) => {
        setConfirmModal({
            isOpen: true,
            type: 'single_delete',
            payload: { id, info: tcNo, tcNo }
        });
    };

    const executeDelete = async () => {
        const { id, tcNo } = confirmModal.payload;
        const { error } = await supabase.from('cf_submissions').delete().eq('id', id);
        if (error) {
            alert('Silinirken hata oluştu.');
            console.error(error);
        } else {
            setSubmissions(submissions.filter(sub => sub.id !== id));
            await logAdminAction('DELETE', tcNo, '-', 'silindi');
        }
        setConfirmModal({ isOpen: false, type: null, payload: null });
    };

    const toggleRow = (id) => {
        setSelectedRows(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);
    };

    const toggleAll = () => {
        if (selectedRows.length === filteredSubmissions.length && filteredSubmissions.length > 0) {
            setSelectedRows([]);
        } else {
            setSelectedRows(filteredSubmissions.map(s => s.id));
        }
    };

    const renderSeatingPreference = (prefStr) => {
        if (!prefStr) return <span className="text-gray-400 italic">Yok</span>;
        try {
            const prefs = JSON.parse(prefStr);
            const preferredPeople = Array.isArray(prefs?.preferred_people)
                ? prefs.preferred_people
                : Array.isArray(prefs)
                    ? prefs
                    : [];

            if (preferredPeople.length > 0) {
                return (
                    <div className="flex flex-wrap gap-1 mt-1">
                        {preferredPeople.map((person, index) => (
                            <span key={person?.id || `${person?.full_name || 'kisi'}-${index}`} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-800 border border-gray-200">
                                {person.full_name}
                            </span>
                        ))}
                    </div>
                );
            }
        } catch (e) {
            return <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200 mt-1">{prefStr}</span>;
        }
        return <span className="text-gray-400 italic">Yok</span>;
    };

    const filteredSubmissions = useMemo(() => {
        return submissions.filter(sub => {
            const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
            const matchesType = ticketTypeFilter === 'all' || sub.ticket_type === ticketTypeFilter;

            const searchObj = {
                tc: sub.tc_no || '',
                name: sub.data?.name || '',
                email: sub.data?.email || '',
                phone: sub.data?.phone || ''
            };

            const matchesSearch = Object.values(searchObj).some(val =>
                String(val).toLowerCase().includes(searchTerm.toLowerCase())
            );

            return matchesStatus && matchesType && matchesSearch;
        });
    }, [submissions, searchTerm, statusFilter, ticketTypeFilter]);

    const exportToExcel = () => {
        const exportData = filteredSubmissions.map(sub => {
            let seatingStr = '';
            try {
                const prefs = JSON.parse(sub.seating_preference);
                const preferredPeople = Array.isArray(prefs?.preferred_people)
                    ? prefs.preferred_people
                    : Array.isArray(prefs)
                        ? prefs
                        : [];
                seatingStr = preferredPeople.map(p => p.full_name).join(', ');
            } catch (e) {
                seatingStr = sub.seating_preference || '';
            }

            return {
                'Sıra No': sub.sequence_number || '',
                'Yedek Sıra': sub.ticket_type === 'yedek' && sub.yedek_sira ? sub.yedek_sira : '',
                'Başvuru Tarihi': new Date(sub.created_at).toLocaleString('tr-TR'),
                'TC Kimlik': sub.tc_no || '',
                'Ad Soyad': sub.data?.name || '',
                'E-Posta': sub.data?.email || '',
                'Telefon': sub.data?.phone || '',
                'Havayolu': sub.data?.airline === 'Diğer' ? (sub.data?.airlineOther || 'Diğer') : (sub.data?.airline || ''),
                'Filo': sub.data?.fleet === 'Diğer' ? (sub.data?.fleetOther || 'Diğer') : (sub.data?.fleet || ''),
                'Yaş Grubu': sub.data?.ageGroup || '',
                'Misafir': sub.data?.bringGuest ? 'Evet (+1)' : 'Hayır',
                'Misafir Adı': sub.data?.guestName || '',
                'Tahsilat Durumu': sub.payment_status === 'paid' ? 'Tahsil Edildi' : sub.payment_status === 'failed' ? 'Başarısız/İptal' : 'Bekliyor',
                'Bilet Tipi': sub.ticket_type === 'asil' ? 'Asil' : sub.ticket_type === 'yedek' ? 'Yedek' : 'Bilinmiyor',
                'Durum': sub.status === 'cancelled' ? 'İptal Edildi' : 'Kayıtlı',
                'Tercih Edilen Kişiler': seatingStr
            };
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Basvurular");
        XLSX.writeFile(wb, `DPG_Basvurular_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Başvurular yükleniyor...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Gelen Başvurular</h2>
                    <p className="text-sm text-gray-500 mt-1">Toplam {submissions.length} başvuru, {filteredSubmissions.length} gösteriliyor.</p>
                </div>
                <button
                    onClick={exportToExcel}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                    <Download className="h-4 w-4 mr-2" />
                    Excel İndir
                </button>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
                    {selectedRows.length > 0 ? (
                        <div className="flex items-center gap-3 bg-blue-50 px-4 py-2 rounded-md w-full md:w-auto">
                            <span className="text-sm font-medium text-blue-800">{selectedRows.length} başvuru seçildi:</span>
                            <div className="flex gap-2">
                                <button onClick={() => setConfirmModal({ isOpen: true, type: 'bulk_delete', payload: { count: selectedRows.length } })} className="text-xs bg-red-800 hover:bg-red-900 text-white px-3 py-1.5 rounded-md font-medium transition-colors flex items-center"><Trash2 className="w-3 h-3 mr-1" /> Seçilenleri Sil</button>
                            </div>
                        </div>
                    ) : <div className="hidden md:block"></div>}
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="TC, İsim, E-Posta veya Telefon ile Ara..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-gray-400 hidden sm:block" />
                        <select
                            value={ticketTypeFilter}
                            onChange={(e) => setTicketTypeFilter(e.target.value)}
                            className="block w-32 py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        >
                            <option value="all">Tüm Tipler</option>
                            <option value="asil">Asil</option>
                            <option value="yedek">Yedek</option>
                        </select>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="block w-36 py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        >
                            <option value="all">Tüm Kayıtlar</option>
                            <option value="pending">Aktif Kayıtlar</option>
                            <option value="cancelled">İptal Edilenler</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="bg-white shadow-sm ring-1 ring-black ring-opacity-5 rounded-lg overflow-hidden">
                {submissions.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">Henüz başvuru bulunmuyor.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-300">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-4 py-3 w-12 text-center">
                                        <input
                                            type="checkbox"
                                            onChange={toggleAll}
                                            checked={filteredSubmissions.length > 0 && selectedRows.length === filteredSubmissions.length}
                                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600 cursor-pointer"
                                        />
                                    </th>
                                    <th scope="col" className="px-3 py-3 text-center text-xs font-semibold text-gray-900 uppercase tracking-wider w-16">Sıra</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Kişi Bilgisi</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Detaylar</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Bilet & Tipi</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Koltuk Tercihleri</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Tahsilat Durumu</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {filteredSubmissions.length === 0 ? (
                                    <tr><td colSpan="7" className="px-4 py-8 text-center text-sm text-gray-500">Aramanıza uygun kayıt bulunamadı.</td></tr>
                                ) : (
                                    filteredSubmissions.map((sub) => (
                                        <tr key={sub.id} className={`hover:bg-gray-50 ${selectedRows.includes(sub.id) ? 'bg-blue-50/50' : ''}`}>
                                            <td className="px-4 py-4 whitespace-nowrap text-center">
                                                <input
                                                    type="checkbox"
                                                    onChange={() => toggleRow(sub.id)}
                                                    checked={selectedRows.includes(sub.id)}
                                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600 cursor-pointer"
                                                />
                                            </td>
                                            <td className="px-3 py-4 whitespace-nowrap text-center">
                                                {sub.ticket_type === 'yedek' && sub.yedek_sira ? (
                                                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 text-xs font-bold text-orange-700 border border-orange-300" title={`Yedek Sıra: ${sub.yedek_sira}`}>
                                                        Y{sub.yedek_sira}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-xs font-bold text-gray-700 border border-gray-200">
                                                        {sub.sequence_number || '-'}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-gray-900">{sub.data?.name || '-'}</span>
                                                    <span className="text-xs text-gray-500">{sub.tc_no || '-'}</span>
                                                    <span className="text-xs text-gray-500 mt-1">{sub.data?.email || '-'}</span>
                                                    <span className="text-xs text-gray-500">{sub.data?.phone || '-'}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <div className="flex flex-col gap-1 text-sm text-gray-700">
                                                    <div><span className="text-xs font-semibold text-gray-500">Havayolu:</span> {sub.data?.airline === 'Diğer' ? (sub.data?.airlineOther || 'Diğer') : (sub.data?.airline || '-')}</div>
                                                    <div><span className="text-xs font-semibold text-gray-500">Filo:</span> {sub.data?.fleet === 'Diğer' ? (sub.data?.fleetOther || 'Diğer') : (sub.data?.fleet || '-')}</div>
                                                    <div><span className="text-xs font-semibold text-gray-500">Yaş Grubu:</span> {sub.data?.ageGroup || '-'}</div>
                                                    <div className="text-xs text-gray-400 mt-1" title="Başvuru Zamanı">
                                                        {new Date(sub.created_at).toLocaleString('tr-TR')}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <div className="flex flex-col items-start gap-2">
                                                    <select
                                                        value={sub.ticket_type || ''}
                                                        onChange={(e) => handleTicketTypeChangeClick(sub.id, e.target.value, sub.tc_no)}
                                                        className={`text-xs font-bold rounded-full border px-2.5 py-1 pr-7 outline-none cursor-pointer
                                                            ${sub.ticket_type === 'asil' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                                sub.ticket_type === 'yedek' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                                                    'bg-gray-100 text-gray-800 border-gray-200'}`}
                                                    >
                                                        <option value="asil">🎖️ Asil Liste</option>
                                                        <option value="yedek">⏳ Yedek Liste</option>
                                                    </select>
                                                    <div className="text-sm">
                                                        {sub.data?.bringGuest ? (
                                                            <div className="flex flex-col">
                                                                <span className="font-semibold text-purple-700 text-xs bg-purple-50 px-2 py-0.5 rounded border border-purple-100 w-fit">+1 Misafir</span>
                                                                <span className="text-xs text-gray-500 truncate max-w-[120px] mt-1" title={sub.data?.guestName}>{sub.data?.guestName}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-gray-400">Tek Kişi</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex flex-col items-start gap-2">
                                                    {sub.status === 'cancelled' && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">İptal Edildi</span>
                                                    )}
                                                    {renderSeatingPreference(sub.seating_preference)}
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteClick(sub.id, sub.tc_no)}
                                                    className="mt-3 text-red-500 hover:text-red-700 flex items-center text-xs ml-1"
                                                    title="Başvuruyu Sil"
                                                >
                                                    <Trash2 className="w-4 h-4 mr-1" /> Sil
                                                </button>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <select
                                                    value={sub.payment_status || 'pending'}
                                                    onChange={(e) => handlePaymentStatusChangeClick(sub.id, sub.tc_no, sub.payment_status, e.target.value)}
                                                    className={`text-xs font-semibold rounded-md border-0 py-1.5 pl-2 pr-7 ring-1 ring-inset focus:ring-2 focus:ring-inset sm:leading-6 cursor-pointer
                                                        ${sub.payment_status === 'paid' ? 'bg-emerald-50 text-emerald-800 ring-emerald-300 focus:ring-emerald-600' :
                                                            sub.payment_status === 'failed' ? 'bg-red-50 text-red-800 ring-red-300 focus:ring-red-600' :
                                                                'bg-amber-50 text-amber-800 ring-amber-300 focus:ring-amber-600'}`}
                                                >
                                                    <option value="pending">⏳ Tahsil Edilmedi</option>
                                                    <option value="paid">✅ Tahsil Edildi</option>
                                                    <option value="failed">❌ Hatalı/İptal</option>
                                                </select>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Confirmation Modal */}
            {confirmModal.isOpen && (
                <div className="fixed inset-0 z-[100] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setConfirmModal({ isOpen: false, type: null, payload: null })}></div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                            <div className="sm:flex sm:items-start">
                                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                                    <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                        İşlem Onayı
                                    </h3>
                                    <div className="mt-2 text-sm text-gray-500">
                                        {confirmModal.type === 'single_ticket_type' && (
                                            <p>Seçilen adayın bilet tipini <strong>
                                                {confirmModal.payload.newType === 'asil' ? 'Asil Liste' : 'Yedek Liste'}
                                            </strong> olarak değiştirmek istediğinize emin misiniz? <br /><br />
                                                <span className="text-xs text-red-500">Not: Bu işlem kapasite istatistiklerini doğrudan etkileyecektir.</span></p>
                                        )}
                                        {confirmModal.type === 'single_payment' && (
                                            <p>Seçilen adayın tahsilat durumunu <strong>
                                                {confirmModal.payload.newStatus === 'paid' ? 'Tahsil Edildi' :
                                                    confirmModal.payload.newStatus === 'failed' ? 'Başarısız/İptal' : 'Tahsil Edilmedi'}
                                            </strong> olarak değiştirmek istediğinize emin misiniz?</p>
                                        )}
                                        {confirmModal.type === 'single_delete' && (
                                            <p><strong>{confirmModal.payload.info}</strong> T.C. kimlik numaralı başvuruyu kalıcı olarak silmek istediğinize emin misiniz?</p>
                                        )}
                                        {confirmModal.type === 'bulk_delete' && (
                                            <p>Seçilen <strong>{confirmModal.payload.count} adet</strong> başvuruyu kalıcı olarak silmek istediğinize emin misiniz?</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                                <button type="button" onClick={() => {
                                    if (confirmModal.type === 'single_ticket_type') executeTicketTypeUpdate();
                                    else if (confirmModal.type === 'single_payment') executePaymentStatusUpdate();
                                    else if (confirmModal.type === 'single_delete') executeDelete();
                                    else if (confirmModal.type === 'bulk_delete') (async () => {
                                        const { error } = await supabase.from('cf_submissions').delete().in('id', selectedRows);
                                        if (error) alert('Hata oluştu.');
                                        else setSubmissions(submissions.filter(s => !selectedRows.includes(s.id)));
                                        setSelectedRows([]);
                                        setConfirmModal({ isOpen: false, type: null, payload: null });
                                    })();
                                }} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm">
                                    Onayla ve Kaydet
                                </button>
                                <button type="button" onClick={() => setConfirmModal({ isOpen: false, type: null, payload: null })} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm">
                                    İptal
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

