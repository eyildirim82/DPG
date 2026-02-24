import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { Mail, MessageSquare, Copy, CheckCircle2, Users, Send, Loader2, AlertCircle, Clock, History } from 'lucide-react';

export default function CommunicationManager() {
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [targetGroup, setTargetGroup] = useState('all_approved');
    const [channel, setChannel] = useState('email'); // email or sms

    // Message fields
    const [subjectText, setSubjectText] = useState('');
    const [messageText, setMessageText] = useState('');

    // UI State
    const [copied, setCopied] = useState(false);
    const [sendStatus, setSendStatus] = useState('idle'); // idle | sending | success | error
    const [sendResult, setSendResult] = useState(null);

    // Email logs
    const [emailLogs, setEmailLogs] = useState([]);
    const [showHistory, setShowHistory] = useState(false);

    useEffect(() => {
        fetchSubmissions();
        fetchEmailLogs();
    }, []);

    const fetchSubmissions = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('cf_submissions')
            .select('id, tc_no, full_name, data, status, ticket_type')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching submissions:', error);
        } else {
            const transformedData = (data || []).map(row => ({
                ...row,
                email: row.data?.email || '',
                phone: row.data?.phone || '',
                name: row.data?.name || row.full_name || ''
            }));
            setSubmissions(transformedData);
        }
        setLoading(false);
    };

    const fetchEmailLogs = async () => {
        const { data, error } = await supabase
            .from('cf_email_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);

        if (!error && data) {
            setEmailLogs(data);
        }
    };

    const targetUsers = useMemo(() => {
        return submissions.filter(sub => {
            if (targetGroup === 'all_approved') return sub.status === 'approved';
            if (targetGroup === 'approved_asil') return sub.status === 'approved' && sub.ticket_type === 'asil';
            if (targetGroup === 'approved_yedek') return sub.status === 'approved' && sub.ticket_type === 'yedek';
            if (targetGroup === 'waiting') return sub.status === 'pending';
            if (targetGroup === 'rejected') return sub.status === 'rejected';
            if (targetGroup === 'all') return true;
            return false;
        });
    }, [submissions, targetGroup]);

    const targetContacts = useMemo(() => {
        if (channel === 'email') {
            return targetUsers.map(u => u.email).filter(Boolean);
        } else {
            return targetUsers.map(u => u.phone).filter(Boolean);
        }
    }, [targetUsers, channel]);

    const handleCopyContacts = () => {
        const textToCopy = targetContacts.join(', ');
        navigator.clipboard.writeText(textToCopy).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const handleSendEmail = async (e) => {
        e.preventDefault();

        if (targetContacts.length === 0) {
            alert('Gönderilecek kişi bulunamadı!');
            return;
        }
        if (!subjectText.trim()) {
            alert('Lütfen bir e-posta konusu yazın.');
            return;
        }
        if (!messageText.trim()) {
            alert('Lütfen bir mesaj yazın.');
            return;
        }

        const confirmed = window.confirm(
            `Bu e-posta toplam ${targetContacts.length} kişiye gönderilecek.\n\nKonu: ${subjectText}\n\nOnaylıyor musunuz?`
        );
        if (!confirmed) return;

        setSendStatus('sending');
        setSendResult(null);

        try {
            // Build recipients list
            const recipients = targetUsers
                .filter(u => u.email)
                .map(u => ({
                    email: u.email,
                    name: u.name || u.full_name || ''
                }));

            // Get target group label
            const groupLabels = {
                'all_approved': 'Tüm Onaylılar',
                'approved_asil': 'Asiller',
                'approved_yedek': 'Yedekler',
                'waiting': 'Bekleyenler',
                'rejected': 'Reddedilenler',
                'all': 'Herkes'
            };

            const { data, error } = await supabase.functions.invoke('send-bulk-email', {
                body: {
                    subject: subjectText,
                    message: messageText,
                    recipients,
                    target_group: groupLabels[targetGroup] || targetGroup
                }
            });

            if (error) throw error;

            setSendStatus('success');
            setSendResult(data);
            setSubjectText('');
            setMessageText('');

            // Refresh logs
            await fetchEmailLogs();

            // Reset status after 5 seconds
            setTimeout(() => {
                setSendStatus('idle');
                setSendResult(null);
            }, 5000);
        } catch (err) {
            console.error('Email send error:', err);
            setSendStatus('error');
            setSendResult({ error: err.message || 'Gönderim sırasında bir hata oluştu.' });

            setTimeout(() => {
                setSendStatus('idle');
                setSendResult(null);
            }, 8000);
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            sent: 'bg-green-100 text-green-800',
            partial: 'bg-yellow-100 text-yellow-800',
            failed: 'bg-red-100 text-red-800',
        };
        const labels = {
            sent: 'Başarılı',
            partial: 'Kısmen Başarılı',
            failed: 'Başarısız',
        };
        return (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
                {labels[status] || status}
            </span>
        );
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight">İletişim Yönetimi</h2>
                    <p className="text-sm text-gray-500 mt-1">Belirli kriterlere göre katılımcılara toplu E-Posta veya SMS gönderimi yapın.</p>
                </div>
                <button
                    type="button"
                    onClick={() => setShowHistory(!showHistory)}
                    className={`inline-flex items-center px-3 py-1.5 border rounded-md text-sm font-medium transition-colors ${showHistory ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                >
                    <History className="w-4 h-4 mr-1.5" />
                    Gönderim Geçmişi
                </button>
            </div>

            {/* Send Result Banner */}
            {sendStatus === 'success' && sendResult && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-green-800">E-postalar başarıyla gönderildi!</p>
                        <p className="text-xs text-green-600 mt-1">
                            {sendResult.sent} başarılı{sendResult.failed > 0 && `, ${sendResult.failed} başarısız`}
                        </p>
                    </div>
                </div>
            )}

            {sendStatus === 'error' && sendResult && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-red-800">Gönderim sırasında hata oluştu</p>
                        <p className="text-xs text-red-600 mt-1">{sendResult.error}</p>
                    </div>
                </div>
            )}

            {/* History Panel */}
            {showHistory && (
                <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
                        <Clock className="w-5 h-5 mr-2 text-blue-600" /> Gönderim Geçmişi
                    </h3>
                    {emailLogs.length === 0 ? (
                        <p className="text-center text-gray-400 py-4">Henüz gönderim yapılmamış.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Tarih</th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Konu</th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Hedef</th>
                                        <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600 uppercase">Kişi</th>
                                        <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600 uppercase">Durum</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {emailLogs.map(log => (
                                        <tr key={log.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-2 text-sm text-gray-600 whitespace-nowrap">
                                                {new Date(log.created_at).toLocaleString('tr-TR')}
                                            </td>
                                            <td className="px-4 py-2 text-sm text-gray-800 font-medium max-w-[200px] truncate" title={log.subject}>
                                                {log.subject}
                                            </td>
                                            <td className="px-4 py-2 text-sm text-gray-600">{log.target_group}</td>
                                            <td className="px-4 py-2 text-sm text-gray-600 text-center">{log.recipient_count}</td>
                                            <td className="px-4 py-2 text-center">{getStatusBadge(log.status)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Sol Taraf - Filtre ve Metin Formu */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <form onSubmit={handleSendEmail} className="space-y-6">

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Hedef Kitle (Filtre)</label>
                                    <select
                                        value={targetGroup}
                                        onChange={(e) => setTargetGroup(e.target.value)}
                                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    >
                                        <option value="all_approved">Tüm Onaylılar (Asil + Yedek)</option>
                                        <option value="approved_asil">Sadece Asiller (Onaylı)</option>
                                        <option value="approved_yedek">Sadece Yedekler (Onaylı)</option>
                                        <option value="waiting">Bekleyenler (Henüz Onaylanmamış)</option>
                                        <option value="rejected">Reddedilenler</option>
                                        <option value="all">Sistemdeki Herkes</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">İletişim Kanalı</label>
                                    <div className="flex border border-gray-300 rounded-md p-1 bg-gray-50">
                                        <button
                                            type="button"
                                            onClick={() => setChannel('email')}
                                            className={`flex-1 flex justify-center items-center py-1.5 px-3 rounded text-sm font-medium transition-colors ${channel === 'email' ? 'bg-white shadow-sm border border-gray-200 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                                        >
                                            <Mail className="w-4 h-4 mr-2" /> E-Posta
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setChannel('sms')}
                                            className={`flex-1 flex justify-center items-center py-1.5 px-3 rounded text-sm font-medium transition-colors ${channel === 'sms' ? 'bg-white shadow-sm border border-gray-200 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                                        >
                                            <MessageSquare className="w-4 h-4 mr-2" /> SMS
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {channel === 'email' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        E-Posta Konusu
                                    </label>
                                    <input
                                        type="text"
                                        value={subjectText}
                                        onChange={(e) => setSubjectText(e.target.value)}
                                        placeholder="Örn: Gala Saati Değişikliği Hakkında"
                                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Mesaj İçeriği
                                </label>
                                <textarea
                                    rows={5}
                                    value={messageText}
                                    onChange={(e) => setMessageText(e.target.value)}
                                    placeholder={channel === 'email' ? 'Lütfen e-posta içeriğinizi buraya yazın...' : 'Lütfen SMS mesajınızı buraya yazın...'}
                                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                />
                                <p className="text-xs text-gray-500 mt-2">
                                    Not: Dinamik isim değişkenleri eklemek isterseniz {"{{isim}}"} şeklinde kullanabilirsiniz.
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={targetContacts.length === 0 || sendStatus === 'sending'}
                                className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                            >
                                {sendStatus === 'sending' ? (
                                    <>
                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Gönderiliyor...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-5 h-5 mr-2" /> {targetContacts.length} Kişiye Gönder
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Sağ Taraf - Liste ve Copy Özelliği */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 h-full flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                                <Users className="w-5 h-5 mr-2 text-blue-600" /> Alıcı Listesi
                            </h3>
                            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                                {targetContacts.length} Kişi
                            </span>
                        </div>

                        <div className="flex-1 overflow-y-auto bg-gray-50 rounded border border-gray-200 p-3 text-sm text-gray-600 mb-4 max-h-[300px]">
                            {loading ? (
                                <p className="text-center text-gray-400 py-4">Alıcılar yükleniyor...</p>
                            ) : targetContacts.length > 0 ? (
                                <ul className="space-y-1">
                                    {targetUsers.map((user, i) => (
                                        <li key={user.id || i} className="truncate">
                                            <span className="font-medium text-gray-800 mr-2">{user.name || user.full_name || 'Bilinmiyor'}:</span>
                                            <span className="text-gray-500">{channel === 'email' ? (user.email || 'E-posta yok') : (user.phone || 'Telefon yok')}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-center text-gray-400 py-4">Bu kritere uygun katılımcı bulunamadı.</p>
                            )}
                        </div>

                        <div>
                            <button
                                type="button"
                                onClick={handleCopyContacts}
                                disabled={targetContacts.length === 0}
                                className={`w-full flex justify-center py-2 px-4 border rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 transition-colors ${copied ? 'bg-green-50 text-green-700 border-green-200 focus:ring-green-500' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 focus:ring-gray-500'}`}
                            >
                                {copied ? (
                                    <>
                                        <CheckCircle2 className="w-4 h-4 mr-2" /> Kopyalandı!
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-4 h-4 mr-2" />
                                        {channel === 'email' ? 'E-Posta Adreslerini Kopyala (BCC için)' : 'Telefon Numaralarını Kopyala'}
                                    </>
                                )}
                            </button>
                            <p className="text-xs text-center text-gray-500 mt-2">
                                Kişileri virgülle ayrılmış liste olarak kopyalar.
                            </p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
