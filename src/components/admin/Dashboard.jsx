import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, UserCheck, Clock, ShieldCheck, Ticket } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function Dashboard() {
    const [stats, setStats] = useState({
        whitelistTotal: 0,
        submissionsTotal: 0,
        approvedTotal: 0,
        pendingTotal: 0,
        quotaAsil: 700,
        quotaTotal: 1500,
        reservedTotal: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);
            try {
                const [
                    { count: whitelistTotal },
                    { count: submissionsTotal },
                    { count: approvedTotal },
                    { count: pendingTotal },
                    { data: quotaData }
                ] = await Promise.all([
                    supabase.from('cf_whitelist').select('*', { count: 'exact', head: true }),
                    supabase.from('cf_submissions').select('*', { count: 'exact', head: true }),
                    supabase.from('cf_submissions').select('*', { count: 'exact', head: true }).in('status', ['approved', 'asil', 'yedek']),
                    supabase.from('cf_submissions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
                    supabase.rpc('get_ticket_stats')
                ]);

                setStats({
                    whitelistTotal: whitelistTotal || 0,
                    submissionsTotal: submissionsTotal || 0,
                    approvedTotal: approvedTotal || 0,
                    pendingTotal: pendingTotal || 0,
                    reservedTotal: quotaData?.total_reserved || 0,
                    quotaAsil: quotaData?.asil_capacity || 700,
                    quotaTotal: quotaData?.total_capacity || 1500,
                });
            } catch (error) {
                console.error("Error fetching dashboard stats:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    const statCards = [
        { title: 'Beyaz Liste Kayıtları', value: stats.whitelistTotal, icon: ShieldCheck, color: 'text-indigo-600', bg: 'bg-indigo-100' },
        { title: 'Gelen Başvurular', value: stats.submissionsTotal, icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
        { title: 'Onaylanan Katılımcı', value: stats.approvedTotal, icon: UserCheck, color: 'text-green-600', bg: 'bg-green-100' },
        { title: 'Bekleyen Başvurular', value: stats.pendingTotal, icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100' },
    ];

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <LayoutDashboard className="mr-2 text-dpg-navy" /> Dashboard Özet
            </h2>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-dpg-gold"></div>
                </div>
            ) : (
                <>
                    {/* Quota Highlights */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                        <div className="bg-gradient-to-br from-dpg-navy to-blue-900 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
                            <Ticket className="absolute right-4 bottom-4 w-24 h-24 text-white opacity-10" />
                            <h3 className="text-blue-200 text-sm font-medium mb-1 uppercase tracking-wider">Asil Kota Doluluk</h3>
                            <div className="flex items-end gap-3">
                                <span className="text-4xl font-bold">{Math.min(stats.reservedTotal, stats.quotaAsil)}</span>
                                <span className="text-xl text-blue-200 mb-1">/ {stats.quotaAsil}</span>
                            </div>
                            <div className="w-full bg-blue-950/50 rounded-full h-2 mt-4">
                                <div className="bg-dpg-gold h-2 rounded-full" style={{ width: `${Math.min(100, (Math.min(stats.reservedTotal, stats.quotaAsil) / stats.quotaAsil) * 100)}%` }}></div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
                            <Users className="absolute right-4 bottom-4 w-24 h-24 text-white opacity-5" />
                            <h3 className="text-slate-300 text-sm font-medium mb-1 uppercase tracking-wider">Toplam Kota (Asil + Yedek)</h3>
                            <div className="flex items-end gap-3">
                                <span className="text-4xl font-bold">{stats.reservedTotal}</span>
                                <span className="text-xl text-slate-400 mb-1">/ {stats.quotaTotal}</span>
                            </div>
                            <div className="w-full bg-slate-950/50 rounded-full h-2 mt-4">
                                <div className="bg-slate-400 h-2 rounded-full" style={{ width: `${Math.min(100, (stats.reservedTotal / stats.quotaTotal) * 100)}%` }}></div>
                            </div>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {statCards.map((stat, idx) => {
                            const Icon = stat.icon;
                            return (
                                <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-4 hover:shadow-md transition-shadow">
                                    <div className={`${stat.bg} ${stat.color} p-4 rounded-lg`}>
                                        <Icon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                                        <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}
