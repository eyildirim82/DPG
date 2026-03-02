import React, { useEffect, useState, useRef, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { UserPlus, Trash2, Search, UploadCloud, Filter, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function WhitelistManager() {
    const [whitelist, setWhitelist] = useState([]);
    const [loading, setLoading] = useState(true);

    // Add user form state
    const [tcNo, setTcNo] = useState('');
    const [adding, setAdding] = useState(false);
    const [addStatus, setAddStatus] = useState({ state: null, message: '' });
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, payload: null });

    // Bulk upload state
    const [uploadCategory, setUploadCategory] = useState('whitelist');
    const [uploading, setUploading] = useState(false);
    const [uploadStats, setUploadStats] = useState(null);
    const fileInputRef = useRef(null);

    // Search & Filter state
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');

    useEffect(() => {
        fetchWhitelist();
    }, []);

    const fetchWhitelist = async () => {
        setLoading(true);
        let allData = [];
        let fromIndex = 0;
        const pageSize = 1000;
        
        try {
            while (true) {
                const { data, error } = await supabase
                    .from('cf_whitelist')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .range(fromIndex, fromIndex + pageSize - 1);
                
                if (error) throw error;
                if (!data || data.length === 0) break;
                
                allData = [...allData, ...data];
                if (data.length < pageSize) break;
                fromIndex += pageSize;
            }
            setWhitelist(allData);
        } catch (error) {
            console.error('Error fetching whitelist:', error);
        } finally {
            setLoading(false);
        }
    };

    const addPerson = async (e) => {
        e.preventDefault();
        if (!tcNo) return alert('Lütfen TC Kimlik numarasını doldurun.');

        setAdding(true);
        setAddStatus({ state: null, message: '' });

        const cleanTcNo = tcNo.replace(/\D/g, '');
        const { error } = await supabase.from('cf_whitelist').insert([{ tc_no: cleanTcNo }]);
        setAdding(false);

        if (error) {
            if (error.code === '23505') {
                setAddStatus({ state: 'error', message: 'Bu TC numarası zaten listede var.' });
            } else {
                setAddStatus({ state: 'error', message: 'Eklenirken bir hata oluştu.' });
                console.error(error);
            }
        } else {
            setAddStatus({ state: 'success', message: 'Kişi başarıyla eklendi!' });
            setTcNo('');
            fetchWhitelist();
            setTimeout(() => setAddStatus({ state: null, message: '' }), 3000);
        }
    };

    const confirmDelete = (id, tc) => {
        setConfirmModal({
            isOpen: true,
            payload: { id, tc }
        });
    };

    const executeDelete = async () => {
        if (!confirmModal.payload) return;
        const { id } = confirmModal.payload;

        const { error } = await supabase.from('cf_whitelist').delete().eq('id', id);
        if (error) {
            alert('Silinirken hata oluştu.');
            console.error(error);
        } else {
            fetchWhitelist();
        }
        setConfirmModal({ isOpen: false, payload: null });
    };

    const updatePersonCategory = async (id, category) => {
        let is_debtor = false;
        let attended_before = false;

        if (category === 'debtor') is_debtor = true;
        if (category === 'attended') attended_before = true;

        const { error } = await supabase
            .from('cf_whitelist')
            .update({ is_debtor, attended_before })
            .eq('id', id);

        if (error) {
            alert('Durum güncellenirken hata oluştu.');
            console.error(error);
        } else {
            setWhitelist(whitelist.map(p => p.id === id ? { ...p, is_debtor, attended_before } : p));
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setUploadStats(null);

        try {
            const reader = new FileReader();
            reader.onload = async (evt) => {
                try {
                    const bstr = evt.target.result;
                    const workbook = XLSX.read(bstr, { type: 'binary' });
                    const wsname = workbook.SheetNames[0];
                    const ws = workbook.Sheets[wsname];
                    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

                    const tcNumbers = [];
                    data.forEach(row => {
                        if (row && row.length > 0) {
                            const tc = String(row[0]).replace(/[^0-9]/g, '');
                            if (tc && tc.length === 11) {
                                tcNumbers.push(tc);
                            }
                        }
                    });

                    const uniqueTcs = [...new Set(tcNumbers)];

                    if (uniqueTcs.length === 0) {
                        alert("Dosyada geçerli bir 11 haneli TC Kimlik numarası bulunamadı. Lütfen ilk sütunda TC'lerin olduğundan emin olun.");
                        setUploading(false);
                        return;
                    }

                    // 1. Önce yüklenecek TC'lerin veritabanındaki MEVCUT durumlarını çekiyoruz.
                    const { data: existingRecords } = await supabase
                        .from('cf_whitelist')
                        .select('tc_no, attended_before, is_debtor')
                        .in('tc_no', uniqueTcs);

                    const existingMap = new Map();
                    if (existingRecords) {
                        existingRecords.forEach(r => existingMap.set(r.tc_no, r));
                    }

                    // 2. Mevcut durum ile yeni durumu akıllıca birleştiriyoruz.
                    const payload = uniqueTcs.map(tc => {
                        const existing = existingMap.get(tc) || { attended_before: false, is_debtor: false };

                        let updated_attended = existing.attended_before;
                        let updated_debtor = existing.is_debtor;

                        // SADECE seçilen kategoriye göre işlem yap, diğerine dokunma!
                        if (uploadCategory === 'attended') {
                            updated_attended = true;
                        } else if (uploadCategory === 'debtor') {
                            updated_debtor = true;
                        } else if (uploadCategory === 'whitelist') {
                            updated_debtor = false;
                        }

                        return {
                            tc_no: tc,
                            attended_before: updated_attended,
                            is_debtor: updated_debtor
                        };
                    });

                    const chunkSize = 500;
                    let successCount = 0;
                    let errorCount = 0;

                    for (let i = 0; i < payload.length; i += chunkSize) {
                        const chunk = payload.slice(i, i + chunkSize);
                        const { error } = await supabase.from('cf_whitelist').upsert(chunk, { onConflict: 'tc_no' });
                        if (error) {
                            console.error("Batch upload error:", error);
                            errorCount += chunk.length;
                        } else {
                            successCount += chunk.length;
                        }
                    }

                    setUploadStats({ total: uniqueTcs.length, success: successCount, errors: errorCount });
                    fetchWhitelist();
                } catch (err) {
                    console.error("Parse error:", err);
                    alert("Dosya okunurken bir hata oluştu.");
                } finally {
                    setUploading(false);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                }
            };
            reader.readAsBinaryString(file);
        } catch (err) {
            console.error("File reading error:", err);
            setUploading(false);
        }
    };

    const exportToExcel = () => {
        const exportData = filteredWhitelist.map(person => ({
            'TC Kimlik': person.tc_no,
            'Kategori': person.is_debtor ? 'Borçlu' : person.attended_before ? 'Geçmiş Katılımcı' : 'Temiz Kayıt',
            'Eklenme Tarihi': new Date(person.created_at).toLocaleString('tr-TR')
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Beyaz_Liste");
        XLSX.writeFile(wb, `DPG_Beyaz_Liste_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const filteredWhitelist = useMemo(() => {
        return whitelist.filter(person => {
            const matchesSearch = person.tc_no.includes(searchTerm);

            let matchesFilter = true;
            if (filterCategory === 'debtor') matchesFilter = person.is_debtor;
            else if (filterCategory === 'attended') matchesFilter = person.attended_before && !person.is_debtor;
            else if (filterCategory === 'clean') matchesFilter = !person.attended_before && !person.is_debtor;

            return matchesSearch && matchesFilter;
        });
    }, [whitelist, searchTerm, filterCategory]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight">TC Beyaz Liste Yönetimi</h2>
                    <p className="text-sm text-gray-500 mt-1">Sisteme kayıt olabilecek kişilerin T.C. Kimlik Numaraları ve durumları.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Sol Taraf - Ekleme ve Yükleme Formları */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <UserPlus className="w-5 h-5 mr-2 text-blue-600" /> Tekli Kişi Ekle
                        </h3>
                        <form onSubmit={addPerson} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">TC Kimlik No</label>
                                <input
                                    type="text"
                                    maxLength="11"
                                    value={tcNo}
                                    onChange={(e) => setTcNo(e.target.value.replace(/[^0-9]/g, ''))}
                                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    placeholder="11 haneli TC no"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={adding || tcNo.length !== 11}
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {adding ? 'Ekleniyor...' : 'Listeye Ekle'}
                            </button>
                            {addStatus.message && (
                                <div className={`p-2 rounded text-sm text-center ${addStatus.state === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {addStatus.message}
                                </div>
                            )}
                        </form>
                    </div>

                    <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <UploadCloud className="w-5 h-5 mr-2 text-green-600" /> Toplu Yükle (Excel/CSV)
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Durum (Kategori) Seçin:</label>
                                <select
                                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                                    value={uploadCategory}
                                    onChange={(e) => setUploadCategory(e.target.value)}
                                >
                                    <option value="whitelist">Sıradan Kayıt (Temiz) - Asil/Yedek</option>
                                    <option value="attended">Geçmiş Katılımcı - Sadece Yedek</option>
                                    <option value="debtor">Borçlu Üye - Katılamaz</option>
                                </select>
                            </div>

                            <div>
                                <input
                                    type="file"
                                    accept=".xlsx, .xls, .csv"
                                    className="hidden"
                                    ref={fileInputRef}
                                    onChange={handleFileUpload}
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                                >
                                    {uploading ? 'Aktarılıyor...' : 'Dosya Seç ve Aktar'}
                                </button>
                                <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                                    İlk sütunda TC numaralarının olduğu bir dosya yükleyin. Var olan kayıtlar seçtiğiniz kategoriye göre <strong>güncellenir</strong>.
                                </p>
                            </div>

                            {uploadStats && (
                                <div className={`p-3 rounded-md text-sm ${uploadStats.errors > 0 ? 'bg-orange-50 text-orange-800 border border-orange-200' : 'bg-green-50 text-green-800 border border-green-200'}`}>
                                    <p className="font-semibold mb-1">İşlem Özeti:</p>
                                    <ul className="list-disc pl-4 space-y-0.5">
                                        <li>Hedef TC: {uploadStats.total}</li>
                                        <li>Başarılı: {uploadStats.success}</li>
                                        {uploadStats.errors > 0 && <li className="text-red-600 font-medium">Hatalı: {uploadStats.errors}</li>}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sağ Taraf - Liste ve Filtreler */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-[calc(100vh-140px)] min-h-[600px]">

                        {/* Tablo Üstü Araç Çubuğu */}
                        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50/50 rounded-t-lg">
                            <div className="flex-1 w-full relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Search className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="TC No ile ara..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value.replace(/[^0-9]/g, ''))}
                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                />
                            </div>

                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <div className="relative flex-1 sm:flex-none">
                                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none hidden sm:flex">
                                        <Filter className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <select
                                        value={filterCategory}
                                        onChange={(e) => setFilterCategory(e.target.value)}
                                        className="block w-full sm:w-40 sm:pl-9 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    >
                                        <option value="all">Tüm Kayıtlar</option>
                                        <option value="clean">Temiz Kayıtlar</option>
                                        <option value="attended">Geçmiş Katılımcılar</option>
                                        <option value="debtor">Borçlular</option>
                                    </select>
                                </div>
                                <button
                                    onClick={exportToExcel}
                                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    title="Excel İndir"
                                >
                                    <Download className="h-4 w-4 sm:mr-2 text-gray-500" />
                                    <span className="hidden sm:inline">İndir</span>
                                </button>
                            </div>
                        </div>

                        <div className="px-4 py-2 border-b border-gray-100 bg-white text-xs text-gray-500 flex justify-between">
                            <span>Toplam Kayıt (filtre hariç): {whitelist.length}</span>
                            <span>Listelenen Kayıt (filtreli): {filteredWhitelist.length}</span>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto p-0">
                            {loading ? (
                                <div className="flex justify-center items-center h-48 text-gray-500">Yükleniyor...</div>
                            ) : filteredWhitelist.length === 0 ? (
                                <div className="flex flex-col justify-center items-center h-48 text-gray-500">
                                    <Search className="h-8 w-8 text-gray-300 mb-2" />
                                    <p>Arama kriterlerine uygun kayıt bulunamadı.</p>
                                </div>
                            ) : (
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-white sticky top-0 z-10 shadow-sm">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">TC No</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Kategori</th>
                                            <th className="hidden sm:table-cell px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Tarih</th>
                                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-900 uppercase tracking-wider">İşlem</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 bg-white">
                                        {filteredWhitelist.map((person) => (
                                            <tr key={person.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-3.5 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {person.tc_no}
                                                </td>
                                                <td className="px-6 py-3.5 whitespace-nowrap text-sm">
                                                    <select
                                                        value={person.is_debtor ? 'debtor' : person.attended_before ? 'attended' : 'clean'}
                                                        onChange={(e) => updatePersonCategory(person.id, e.target.value)}
                                                        className={`text-xs rounded border-0 py-1 pl-2 pr-7 ring-1 ring-inset focus:ring-2 focus:ring-inset sm:leading-6 font-medium cursor-pointer
                                                            ${person.is_debtor ? 'bg-red-50 text-red-800 ring-red-200 focus:ring-red-600' :
                                                                person.attended_before ? 'bg-blue-50 text-blue-800 ring-blue-200 focus:ring-blue-600' :
                                                                    'bg-green-50 text-green-800 ring-green-200 focus:ring-green-600'}`}
                                                    >
                                                        <option value="clean">Temiz Kayıt</option>
                                                        <option value="attended">Geçmiş Katılımcı</option>
                                                        <option value="debtor">Borçlu Üye</option>
                                                    </select>
                                                </td>
                                                <td className="hidden sm:table-cell px-6 py-3.5 whitespace-nowrap text-xs text-gray-500">
                                                    {new Date(person.created_at).toLocaleDateString('tr-TR')}
                                                </td>
                                                <td className="px-6 py-3.5 whitespace-nowrap text-right text-sm">
                                                    <button
                                                        onClick={() => confirmDelete(person.id, person.tc_no)}
                                                        className="text-gray-400 hover:text-red-600 transition-colors p-1 rounded hover:bg-red-50"
                                                        title="Sil"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Confirmation Modal */}
            {confirmModal.isOpen && (
                <div className="fixed inset-0 z-[100] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setConfirmModal({ isOpen: false, payload: null })}></div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                            <div className="sm:flex sm:items-start">
                                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                                    <Trash2 className="h-6 w-6 text-red-600" aria-hidden="true" />
                                </div>
                                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                        Kaydı Sil
                                    </h3>
                                    <div className="mt-2 text-sm text-gray-500">
                                        <p><strong>{confirmModal.payload?.tc}</strong> kimlik numaralı kaydı beyaz listeden kalıcı olarak silmek istediğinize emin misiniz?</p>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                                <button type="button" onClick={executeDelete} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm">
                                    Evet, Sil
                                </button>
                                <button type="button" onClick={() => setConfirmModal({ isOpen: false, payload: null })} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:mt-0 sm:w-auto sm:text-sm">
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
