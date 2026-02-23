import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';
import { PlusCircle, Edit, List, Trash2 } from 'lucide-react';

export default function FormList() {
    const [forms, setForms] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchForms();
    }, []);

    const fetchForms = async () => {
        try {
            const { data, error } = await supabase
                .from('cf_forms')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setForms(data || []);
        } catch (error) {
            console.error('Error fetching forms:', error);
        } finally {
            setLoading(false);
        }
    };

    const deleteForm = async (id) => {
        if (window.confirm('Are you sure you want to delete this form and all its submissions?')) {
            const { error } = await supabase.from('cf_forms').delete().eq('id', id);
            if (error) {
                console.error('Form silinirken hata oluştu:', error);
                alert('Form silinemedi.');
            } else {
                fetchForms();
            }
        }
    };

    if (loading) return <div>Yükleniyor...</div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Formlar</h2>
                <Link to="/admin/forms/new" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center">
                    <PlusCircle className="w-5 h-5 mr-2" /> Yeni Form Oluştur
                </Link>
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Başlık</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kısa Kod Kullanımı</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {forms.map((form) => (
                            <tr key={form.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{form.title}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <code className="bg-gray-100 px-2 py-1 rounded text-pink-600 text-xs">{`<DynamicForm id="${form.id}" />`}</code>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {form.is_active ? (
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Aktif</span>
                                    ) : (
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Pasif</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                                    <Link to={`/admin/submissions/${form.id}`} className="text-indigo-600 hover:text-indigo-900 inline-flex items-center" title="Başvuruları Gör">
                                        <List className="w-4 h-4 mr-1" /> Başvurular
                                    </Link>
                                    <Link to={`/admin/forms/${form.id}/edit`} className="text-blue-600 hover:text-blue-900 inline-flex items-center" title="Düzenle">
                                        <Edit className="w-4 h-4 mr-1" /> Düzenle
                                    </Link>
                                    <button onClick={() => deleteForm(form.id)} className="text-red-600 hover:text-red-900 inline-flex items-center" title="Sil">
                                        <Trash2 className="w-4 h-4 mr-1" /> Sil
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {forms.length === 0 && (
                            <tr>
                                <td colSpan="4" className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                    Henüz hiç form bulunmuyor. Başlamak için yeni bir form oluşturun!
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
