'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface DashboardStats {
  totalToday: number;
  activeSessions: number;
  pendingReconcile: number;
  totalItems: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalToday: 0,
    activeSessions: 0,
    pendingReconcile: 0,
    totalItems: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      const { count: totalToday } = await supabase
        .from('history_logs')
        .select('*', { count: 'exact', head: true })
        .gte('sorting_at', todayISO);

      const { count: activeSessions } = await supabase
        .from('sorting_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'RUNNING');

      const { count: pendingReconcile } = await supabase
        .from('sorting_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'CLOSED');

      const { count: totalItems } = await supabase
        .from('sorting_details')
        .select('*', { count: 'exact', head: true });

      setStats({
        totalToday: totalToday || 0,
        activeSessions: activeSessions || 0,
        pendingReconcile: pendingReconcile || 0,
        totalItems: totalItems || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center gap-3 text-slate-400">
          <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm font-medium">Memuat dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center pb-6 border-b border-slate-200/50">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent tracking-tight">
            Dashboard Overview
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Ringkasan operasional sorting dan handover system
          </p>
        </div>
        <div className="text-sm text-slate-500 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-xl border border-slate-200/50 shadow-sm">
          {new Date().toLocaleDateString('id-ID', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/30 p-6 border border-white/50">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Handover Hari Ini</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{stats.totalToday}</p>
        </div>
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/30 p-6 border border-white/50">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sesi Aktif</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{stats.activeSessions}</p>
        </div>
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/30 p-6 border border-white/50">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Reconcile</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{stats.pendingReconcile}</p>
        </div>
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/30 p-6 border border-white/50">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Items</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{stats.totalItems}</p>
        </div>
      </div>

      {/* Quick Access */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Admin Menu */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/30 p-6 border border-white/50">
          <h2 className="font-bold text-slate-800 text-sm mb-4">Menu Admin</h2>
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => router.push('/admin/sorting')}
              className="p-4 bg-gradient-to-br from-blue-500 to-cyan-500 text-white rounded-xl shadow-lg shadow-blue-200/50 hover:shadow-xl transition-all duration-200 text-left"
            >
              <div className="text-2xl mb-1">📊</div>
              <p className="font-semibold text-sm">Sorting Monitor</p>
              <p className="text-xs opacity-80">Admin View</p>
            </button>
            <button 
              onClick={() => router.push('/admin/handover')}
              className="p-4 bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-xl shadow-lg shadow-purple-200/50 hover:shadow-xl transition-all duration-200 text-left"
            >
              <div className="text-2xl mb-1">📋</div>
              <p className="font-semibold text-sm">Handover Console</p>
              <p className="text-xs opacity-80">Admin View</p>
            </button>
          </div>
        </div>

        {/* Status Sistem */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/30 p-6 border border-white/50">
          <h2 className="font-bold text-slate-800 text-sm mb-4">Status Sistem</h2>
          <div className="flex items-center gap-3 p-3 bg-emerald-50/50 rounded-xl border border-emerald-200/50">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-sm font-medium text-emerald-700">Sistem Terhubung</span>
            <span className="text-xs text-emerald-600 ml-auto">v2.0.0</span>
          </div>
          <div className="mt-3 text-xs text-slate-400">
            Last sync: {new Date().toLocaleTimeString('id-ID')}
          </div>
        </div>

        {/* Operator Mode - Full Width */}
        <div className="lg:col-span-2 bg-gradient-to-r from-indigo-50/50 to-violet-50/50 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/30 p-6 border border-indigo-200/30">
          <h2 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
            <span className="text-lg">📱</span> Mode Operator (Lapangan)
          </h2>
          <p className="text-xs text-slate-500 mb-3">
            Buka halaman scan untuk operator di tab baru. Cocok untuk digunakan di perangkat mobile.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button 
              onClick={() => window.open('/sorting', '_blank')}
              className="p-4 bg-gradient-to-br from-indigo-500 to-violet-500 text-white rounded-xl shadow-lg shadow-indigo-200/50 hover:shadow-xl transition-all duration-200 text-left flex items-center justify-between group"
            >
              <div>
                <div className="text-2xl mb-1">📥</div>
                <p className="font-semibold text-sm">Scan Sorting</p>
                <p className="text-xs opacity-80">Buka di tab baru</p>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </div>
            </button>
            <button 
              onClick={() => window.open('/handover', '_blank')}
              className="p-4 bg-gradient-to-br from-emerald-500 to-teal-500 text-white rounded-xl shadow-lg shadow-emerald-200/50 hover:shadow-xl transition-all duration-200 text-left flex items-center justify-between group"
            >
              <div>
                <div className="text-2xl mb-1">🚚</div>
                <p className="font-semibold text-sm">Scan Handover</p>
                <p className="text-xs opacity-80">Buka di tab baru</p>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </div>
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-3 text-center">
            💡 Tombol ini membuka halaman di tab baru agar admin tetap bisa memonitor dashboard
          </p>
        </div>
      </div>
    </div>
  );
}