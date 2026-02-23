import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function FormBuilder() {
    const [formId, setFormId] = useState(null);
    const [fields, setFields] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchForm();
    }, []);

    const fetchForm = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('cf_forms').select('*').limit(1).single();
        if (data) {
            setFormId(data.id);
            setTitle(data.title);
            setFields(data.schema || []);
        } else {
            setTitle('Başvuru Formu');
        }
        setLoading(false);
    };

    const addField = (type) => {
        const newField = {
            id: Math.random().toString(36).substr(2, 9),
            type,
            label: `Yeni ${type} Alanı`,
            name: `field_${fields.length + 1}`,
            required: false,
            placeholder: '',
            options: type === 'select' || type === 'radio' ? 'Seçenek 1,Seçenek 2' : '',
        };
        setFields([...fields, newField]);
    };

    const updateField = (id, key, value) => {
        setFields(fields.map(f => f.id === id ? { ...f, [key]: value } : f));
    };

    const removeField = (id) => {
        setFields(fields.filter(f => f.id !== id));
    };

    const saveForm = async () => {
        if (!title) return alert('Lütfen form başlığı girin.');

        setLoading(true);
        const formPayload = {
            title,
            schema: fields,
        };

        let error;
        if (formId) {
            const response = await supabase.from('cf_forms').update(formPayload).eq('id', formId);
            error = response.error;
        } else {
            const response = await supabase.from('cf_forms').insert([formPayload]).select().single();
            error = response.error;
            if (response.data) {
                setFormId(response.data.id);
            }
        }

        setLoading(false);
        if (error) {
            alert('Form kaydedilirken hata oluştu');
            console.error(error);
        } else {
            alert('Form başarıyla kaydedildi!');
        }
    };

    if (loading && formId) return <div>Yükleniyor...</div>;

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">{formId ? 'Formu Düzenle' : 'Yeni Form Oluştur'}</h2>
                <button onClick={saveForm} disabled={loading} className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700">
                    {loading ? 'Kaydediliyor...' : 'Formu Kaydet'}
                </button>
            </div>

            <div className="bg-white p-6 shadow rounded-lg mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Form Başlığı</label>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full text-black border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g. Contact Us"
                />
            </div>

            <div className="flex space-x-4 mb-6">
                <button onClick={() => addField('text')} className="bg-gray-100 px-3 py-1 rounded text-gray-700">+ Metin (Text)</button>
                <button onClick={() => addField('email')} className="bg-gray-100 px-3 py-1 rounded text-gray-700">+ E-posta (Email)</button>
                <button onClick={() => addField('textarea')} className="bg-gray-100 px-3 py-1 rounded text-gray-700">+ Geniş Metin (Textarea)</button>
                <button onClick={() => addField('select')} className="bg-gray-100 px-3 py-1 rounded text-gray-700">+ Seçim (Select)</button>
            </div>

            <div className="space-y-4">
                {fields.map((field, index) => (
                    <div key={field.id} className="bg-white p-4 shadow rounded-lg border border-gray-200">
                        <div className="flex justify-between items-start mb-4">
                            <span className="font-semibold text-gray-700">{index + 1}. Alan ({field.type})</span>
                            <button onClick={() => removeField(field.id)} className="text-red-500 text-sm">Sil</button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500">Etiket (Label)</label>
                                <input type="text" value={field.label} onChange={(e) => updateField(field.id, 'label', e.target.value)} className="mt-1 w-full text-black border border-gray-300 rounded p-1 text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500">Form Alanı Adı (Veritabanı Anahtarı)</label>
                                <input type="text" value={field.name} onChange={(e) => updateField(field.id, 'name', e.target.value)} className="mt-1 w-full text-black border border-gray-300 rounded p-1 text-sm" placeholder="e.g. first_name" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500">Yer Tutucu (Placeholder)</label>
                                <input type="text" value={field.placeholder} onChange={(e) => updateField(field.id, 'placeholder', e.target.value)} className="mt-1 w-full text-black border border-gray-300 rounded p-1 text-sm" />
                            </div>
                            <div className="flex items-center space-x-2 mt-6">
                                <input type="checkbox" checked={field.required} onChange={(e) => updateField(field.id, 'required', e.target.checked)} id={`req-${field.id}`} />
                                <label htmlFor={`req-${field.id}`} className="text-sm text-gray-700">Zorunlu Alan</label>
                            </div>

                            {(field.type === 'select' || field.type === 'radio') && (
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-gray-500">Seçenekler (Virgülle ayırın)</label>
                                    <input type="text" value={field.options} onChange={(e) => updateField(field.id, 'options', e.target.value)} className="mt-1 w-full text-black border border-gray-300 rounded p-1 text-sm" />
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {fields.length === 0 && (
                    <div className="text-center py-10 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg text-gray-500">
                        Henüz hiç alan yok. Yukarıdan bir alan ekleyin!
                    </div>
                )}
            </div>
        </div>
    );
}
