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
        asilReturningCapacity: 400,
        asilReturningReserved: 0,
        asilNewCapacity: 300,
        asilNewReserved: 0,
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
                    asilReturningCapacity: quotaData?.asil_returning_capacity || 400,
                    asilReturningReserved: quotaData?.asil_returning_reserved || 0,
                    asilNewCapacity: quotaData?.asil_new_capacity || 300,
                    asilNewReserved: quotaData?.asil_new_reserved || 0,
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        {/* Asil - Eski Katılımcı */}
                        <div className="bg-gradient-to-br from-dpg-navy to-blue-900 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
                            <Ticket className="absolute right-4 bottom-4 w-24 h-24 text-white opacity-10" />
                            <h3 className="text-blue-200 text-xs font-medium mb-1 uppercase tracking-wider">Asil — Eski Katılımcı</h3>
                            <div className="flex items-end gap-3">
                                <span className="text-3xl font-bold">{stats.asilReturningReserved}</span>
                                <span className="text-lg text-blue-200 mb-0.5">/ {stats.asilReturningCapacity}</span>
                            </div>
                            <div className="w-full bg-blue-950/50 rounded-full h-2 mt-3">
                                <div className="bg-dpg-gold h-2 rounded-full" style={{ width: `${Math.min(100, (stats.asilReturningReserved / stats.asilReturningCapacity) * 100)}%` }}></div>
                            </div>
                        </div>

                        {/* Asil - Yeni Katılımcı */}
                        <div className="bg-gradient-to-br from-emerald-800 to-emerald-900 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
                            <Ticket className="absolute right-4 bottom-4 w-24 h-24 text-white opacity-10" />
                            <h3 className="text-emerald-200 text-xs font-medium mb-1 uppercase tracking-wider">Asil — Yeni Katılımcı</h3>
                            <div className="flex items-end gap-3">
                                <span className="text-3xl font-bold">{stats.asilNewReserved}</span>
                                <span className="text-lg text-emerald-200 mb-0.5">/ {stats.asilNewCapacity}</span>
                            </div>
                            <div className="w-full bg-emerald-950/50 rounded-full h-2 mt-3">
                                <div className="bg-emerald-400 h-2 rounded-full" style={{ width: `${Math.min(100, (stats.asilNewReserved / stats.asilNewCapacity) * 100)}%` }}></div>
                            </div>
                        </div>

                        {/* Toplam Kota */}
                        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
                            <Users className="absolute right-4 bottom-4 w-24 h-24 text-white opacity-5" />
                            <h3 className="text-slate-300 text-xs font-medium mb-1 uppercase tracking-wider">Toplam Kota (Asil + Yedek)</h3>
                            <div className="flex items-end gap-3">
                                <span className="text-3xl font-bold">{stats.reservedTotal}</span>
                                <span className="text-lg text-slate-400 mb-0.5">/ {stats.quotaTotal}</span>
                            </div>
                            <div className="w-full bg-slate-950/50 rounded-full h-2 mt-3">
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
