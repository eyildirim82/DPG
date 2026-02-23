import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function DynamicForm() {
    const [step, setStep] = useState(1);

    // Core state
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    // Step 1 State
    const [tcNo, setTcNo] = useState('');

    // Step 2 State
    const [formId, setFormId] = useState(null);
    const [schema, setSchema] = useState([]);
    const [title, setTitle] = useState('');
    const [formData, setFormData] = useState({});

    // Step 3 State
    const [submissionId, setSubmissionId] = useState(null);
    const [seatingPref, setSeatingPref] = useState('Tercihim Yok');
    const [approvedUsers, setApprovedUsers] = useState([]);

    // ------------------------------------------------------------------------
    // STEP 1: TC Kimlik Control logic
    // ------------------------------------------------------------------------
    const handleTcSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');
        setSuccessMsg('');

        if (tcNo.length !== 11) {
            setErrorMsg('TC Kimlik numarası 11 haneli olmalıdır.');
            setLoading(false);
            return;
        }

        try {
            // 1. Check whitelist
            const { data: whitelistData, error: wlError } = await supabase
                .from('cf_whitelist')
                .select('*')
                .eq('tc_no', tcNo)
                .single();

            if (wlError || !whitelistData) {
                setErrorMsg(<span>TALPA üyesi değilsiniz, üyelik başvurusu için <a href="https://www.talpa.org/uyelik/" target="_blank" rel="noopener noreferrer" className="underline font-bold">tıklayınız</a>.</span>);
                setLoading(false);
                return;
            }

            // 2. Check existing submission
            const { data: subData, error: subError } = await supabase
                .from('cf_submissions')
                .select('*')
                .eq('tc_no', tcNo)
                .maybeSingle(); // maybeSingle because they might not have a submission yet

            if (subData) {
                // Determine step based on status
                if (subData.status === 'pending') {
                    setSuccessMsg(`Başvuru kaydınız zaten alınmıştır. Onay süreci devam etmektedir.`);
                } else if (subData.status === 'rejected') {
                    setErrorMsg(`Maalesef başvurunuz onaylanmamıştır.`);
                } else if (subData.status === 'approved') {
                    setSubmissionId(subData.id);
                    setSeatingPref(subData.seating_preference || 'Tercihim Yok');
                    await prepareStep3(tcNo);
                }
            } else {
                // No submission, proceed to Step 2
                await prepareStep2();
            }
        } catch (err) {
            console.error(err);
            setErrorMsg('Sistemde bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
        } finally {
            setLoading(false);
        }
    };

    // ------------------------------------------------------------------------
    // STEP 2: Main Application Form Logic
    // ------------------------------------------------------------------------
    const prepareStep2 = async () => {
        const { data, error } = await supabase.from('cf_forms').select('*').limit(1).single();
        if (data) {
            setFormId(data.id);
            setSchema(data.schema || []);
            setTitle(data.title || '');
            setStep(2);
        } else {
            setErrorMsg('Aktif bir başvuru formu bulunamadı.');
        }
    };

    const handleFormChange = (e, fieldName) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setFormData((prev) => ({ ...prev, [fieldName]: value }));
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');

        try {
            const { error } = await supabase.from('cf_submissions').insert([
                {
                    form_id: formId,
                    tc_no: tcNo,
                    data: formData,
                    user_agent: navigator.userAgent
                }
            ]);

            if (error) throw error;
            setStep(1); // Go back to step 1 to show the message
            setSuccessMsg(`Başvurunuz başarıyla alınmıştır. Onay için incelenecektir.`);
            setTcNo(''); // Clear TC so they can verify another or stay clear
            setFormData({});
        } catch (err) {
            console.error(err);
            setErrorMsg('Başvuru gönderilirken bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    // ------------------------------------------------------------------------
    // STEP 3: Seating Preference Logic
    // ------------------------------------------------------------------------
    const prepareStep3 = async (currentTcNo) => {
        try {
            // Fetch all approved submissions to get their TC nos
            const { data: approvedSubs } = await supabase.from('cf_submissions').select('tc_no').eq('status', 'approved');

            if (approvedSubs && approvedSubs.length > 0) {
                // Determine display array. For now we just fallback to TC nos if name is removed
                const others = approvedSubs
                    .map(s => s.tc_no)
                    .filter(tc => tc !== currentTcNo);
                setApprovedUsers(others);
            }
            setStep(3);
        } catch (err) {
            console.error('Error preparing seating data:', err);
        }
    };

    const handleSeatingSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');

        try {
            const { error } = await supabase.from('cf_submissions').update({ seating_preference: seatingPref }).eq('id', submissionId);
            if (error) throw error;
            setSuccessMsg('Oturma düzeni tercihiniz başarıyla kaydedildi!');
            setStep(1); // Go back home
            setTcNo('');
        } catch (err) {
            console.error(err);
            setErrorMsg('Tercih kaydedilirken hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    // ------------------------------------------------------------------------
    // RENDER HELPERS
    // ------------------------------------------------------------------------
    if (loading && step === 2) return <div className="animate-pulse flex space-x-4 max-w-2xl mx-auto"><div className="h-10 bg-gray-200 rounded w-full"></div></div>;

    return (
        <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 max-w-2xl mx-auto border border-gray-100">
            {/* Global Errors and Success Messages for Step 1 Returns */}
            {errorMsg && step === 1 && <div className="bg-red-50 text-red-600 border border-red-200 p-4 rounded-lg mb-6">{errorMsg}</div>}
            {successMsg && step === 1 && <div className="bg-green-50 text-green-700 border border-green-200 p-4 rounded-lg mb-6">{successMsg}</div>}

            {step === 1 && (
                <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Başvuru Sorgulama</h3>
                    <p className="text-gray-500 mb-6">Lütfen devam etmek için TC Kimlik numaranızı girin.</p>
                    <form onSubmit={handleTcSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">TC Kimlik Numarası</label>
                            <input
                                type="text"
                                maxLength="11"
                                placeholder="11 haneli TC no"
                                value={tcNo}
                                onChange={(e) => setTcNo(e.target.value.replace(/[^0-9]/g, ''))}
                                className="w-full text-black border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-gray-50 border p-3 outline-none"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-3 px-4 rounded-lg text-white font-medium 
                              ${loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                        >
                            {loading ? 'Sorgulanıyor...' : 'Devam Et'}
                        </button>
                    </form>
                </div>
            )}

            {step === 2 && (
                <div>
                    <div className="mb-6 pb-4 border-b border-gray-100 flex justify-between items-center">
                        <div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-1">{title}</h3>
                            <p className="text-gray-500 text-sm">Lütfen formu eksiksiz doldurun.</p>
                        </div>
                        <button onClick={() => setStep(1)} className="text-sm text-gray-400 hover:text-gray-600 underline">İptal</button>
                    </div>

                    {errorMsg && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">{errorMsg}</div>}

                    <form onSubmit={handleFormSubmit} className="space-y-6">
                        {schema.map((field) => (
                            <div key={field.id} className="flex flex-col">
                                <label htmlFor={field.name} className="block text-sm font-medium text-gray-700 mb-1">
                                    {field.label} {field.required && <span className="text-red-500">*</span>}
                                </label>
                                {field.type === 'textarea' ? (
                                    <textarea
                                        id={field.name}
                                        name={field.name}
                                        required={field.required}
                                        placeholder={field.placeholder}
                                        value={formData[field.name] || ''}
                                        onChange={(e) => handleFormChange(e, field.name)}
                                        rows={4}
                                        className="w-full text-black border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-gray-50 border p-3 outline-none"
                                    />
                                ) : field.type === 'select' ? (
                                    <select
                                        id={field.name}
                                        name={field.name}
                                        required={field.required}
                                        value={formData[field.name] || ''}
                                        onChange={(e) => handleFormChange(e, field.name)}
                                        className="w-full text-black border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-gray-50 border p-3 outline-none"
                                    >
                                        <option value="">Seçiniz</option>
                                        {(field.options || '').split(',').map(opt => opt.trim()).filter(Boolean).map(opt => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type={field.type}
                                        id={field.name}
                                        name={field.name}
                                        required={field.required}
                                        placeholder={field.placeholder}
                                        value={formData[field.name] || ''}
                                        onChange={(e) => handleFormChange(e, field.name)}
                                        className="w-full text-black border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-gray-50 border p-3 outline-none"
                                    />
                                )}
                            </div>
                        ))}

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full py-3 px-4 rounded-lg text-white font-medium 
                                  ${loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
                            >
                                {loading ? 'Gönderiliyor...' : 'Başvurumu Tamamla'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {step === 3 && (
                <div>
                    <div className="mb-6 pb-4 border-b border-gray-100 flex justify-between items-center">
                        <div>
                            <h3 className="text-2xl font-bold text-green-700 mb-1">Başvurunuz Onaylı</h3>
                            <p className="text-gray-500 text-sm">Lütfen oturma düzeni tercihini belirleyin.</p>
                        </div>
                        <button onClick={() => setStep(1)} className="text-sm text-gray-400 hover:text-gray-600 underline">Geri</button>
                    </div>

                    {errorMsg && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">{errorMsg}</div>}

                    <form onSubmit={handleSeatingSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Kimle oturmak istersiniz?</label>
                            <select
                                value={seatingPref}
                                onChange={(e) => setSeatingPref(e.target.value)}
                                className="w-full text-black border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-gray-50 border p-3 outline-none"
                            >
                                <option value="Tercihim Yok">Tercihim Yok</option>
                                {approvedUsers.map((user, idx) => (
                                    <option key={idx} value={user}>{user}</option>
                                ))}
                            </select>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-3 px-4 rounded-lg text-white font-medium 
                              ${loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                        >
                            {loading ? 'Kaydediliyor...' : 'Tercihimi Kaydet'}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}
