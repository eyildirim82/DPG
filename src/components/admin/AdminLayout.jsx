import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, Settings, Users, LogOut, MessageSquare, Ticket } from 'lucide-react';

export default function AdminLayout() {
    const location = useLocation();
    const navigate = useNavigate();

    const handleLogout = () => {
        sessionStorage.removeItem('dpg_admin_authenticated');
        navigate('/admin/login');
    };

    const navItems = [
        { name: 'Panel', path: '/admin', icon: LayoutDashboard },
        { name: 'Beyaz Liste (TC)', path: '/admin/whitelist', icon: Users },
        { name: 'Gelen Başvurular', path: '/admin/submissions', icon: Settings },
        { name: 'İletişim Yönetimi', path: '/admin/communication', icon: MessageSquare },
        { name: 'Kota Ayarları', path: '/admin/quota', icon: Ticket },
    ];

    return (
        <div className="min-h-screen bg-gray-50 flex admin-panel">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
                <div className="h-16 flex items-center px-6 border-b border-gray-200">
                    <h1 className="text-xl font-bold text-gray-900">DPG Admin</h1>
                </div>
                <nav className="flex-1 overflow-y-auto py-4">
                    <ul className="space-y-1">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path));
                            return (
                                <li key={item.name}>
                                    <Link
                                        to={item.path}
                                        className={`flex items-center px-6 py-3 text-sm font-medium ${isActive
                                            ? 'bg-blue-50 text-blue-700 border-r-4 border-blue-700'
                                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                            }`}
                                    >
                                        <Icon className="w-5 h-5 mr-3" />
                                        {item.name}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>
                <div className="p-4 border-t border-gray-200">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 rounded-md transition-colors"
                    >
                        <LogOut className="w-5 h-5 mr-3" />
                        Güvenli Çıkış
                    </button>
                    <Link
                        to="/"
                        className="mt-2 flex items-center px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-900 rounded-md"
                    >
                        <span className="w-5 h-5 mr-3"></span>
                        Siteye Dön
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                <div className="p-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
