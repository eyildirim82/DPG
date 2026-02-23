import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ShieldAlert } from 'lucide-react';

export default function AdminLogin() {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = (e) => {
        e.preventDefault();

        // VITE_ADMIN_PASSWORD environment variable üzerinden şifre kontrolü
        const correctPassword = import.meta.env.VITE_ADMIN_PASSWORD;

        if (password === correctPassword) {
            sessionStorage.setItem('dpg_admin_authenticated', 'true');
            navigate('/admin');
        } else {
            setError('Hatalı şifre. Lütfen tekrar deneyin.');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center">
                    <div className="h-16 w-16 bg-blue-600 rounded-full flex items-center justify-center">
                        <Lock className="h-8 w-8 text-white" />
                    </div>
                </div>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    Sistem Yönetimi
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    Yetkisiz erişim yasaktır. Lütfen yönetici şifrenizle giriş yapın.
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    <form className="space-y-6" onSubmit={handleLogin}>
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                Yönetici Şifresi
                            </label>
                            <div className="mt-1 relative">
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    placeholder="Şifrenizi girin"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="rounded-md bg-red-50 p-4 border border-red-200 flex items-start">
                                <ShieldAlert className="h-5 w-5 text-red-500 mr-2 flex-shrink-0" />
                                <div className="text-sm text-red-700">
                                    {error}
                                </div>
                            </div>
                        )}

                        <div>
                            <button
                                type="submit"
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                            >
                                Giriş Yap
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
