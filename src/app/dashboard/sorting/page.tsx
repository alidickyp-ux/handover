'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { showToast } from '@/components/common/ToastContainer';
import { SortingSession } from '@/types';
import { getStatusBadge, formatDate } from '@/lib/utils';

export default function SortingMonitorPage() {
  const [sessions, setSessions] = useState<SortingSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sorting_sessions')
        .select(`
          id,
          session_code,
          status,
          created_at,
          operator_id,
          users ( full_name )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedData = await Promise.all(
        (data || []).map(async (s: any) => {
          const { count } = await supabase
            .from('sorting_details')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', s.id);

          return {
            id: s.id,
            session_code: s.session_code,
            status: s.status,
            created_at: s.created_at,
            operator_id: s.operator_id,
            operator_name: s.users?.full_name || 'Tidak Diketahui',
            total_items: count || 0,
          };
        })
      );
      setSessions(formattedData);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      showToast('Gagal memuat data sesi', 'error', 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSession = async (id: string, code: string) => {
    const confirm = window.confirm(
      `Apakah Anda yakin ingin mengunci Sesi ${code}?`
    );
    if (!confirm) return;

    try {
      const { error } = await supabase
        .from('sorting_sessions')
        .update({ status: 'CLOSED' })
        .eq('id', id);

      if (error) throw error;

      showToast(`Sesi ${code} berhasil di-close!`, 'success', 3000);
      fetchSessions();
    } catch (error) {
      showToast('Gagal mengunci sesi', 'error', 3000);
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
          <span className="text-sm font-medium">Memuat data sesi...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex justify-between items-center pb-6 border-b border-slate-200/50">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent tracking-tight">
            Sorting Monitor
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Pantau sesi sorting dan status rekonsiliasi
          </p>
        </div>
        <button
          onClick={fetchSessions}
          className="px-4 py-2 bg-white/80 backdrop-blur-sm text-slate-600 rounded-xl border border-slate-200/50 shadow-sm hover:shadow-md transition-all duration-200 text-sm font-medium flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </header>

      {/* Table */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/30 border border-white/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gradient-to-r from-slate-50/50 to-white border-b border-slate-200/50">
              <tr>
                <th className="p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Kode Sesi</th>
                <th className="p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Operator</th>
                <th className="p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Waktu Mulai</th>
                <th className="p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Paket</th>
                <th className="p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/50">
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      <span className="text-sm font-medium">Belum ada sesi sorting</span>
                    </div>
                  </td>
                </tr>
              ) : (
                sessions.map((session) => (
                  <tr key={session.id} className="hover:bg-indigo-50/30 transition-colors duration-150">
                    <td className="p-3 font-mono font-bold text-indigo-600 text-sm">
                      {session.session_code}
                    </td>
                    <td className="p-3 text-slate-600 text-sm">
                      {session.operator_name}
                    </td>
                    <td className="p-3 text-slate-500 text-sm">
                      {formatDate(session.created_at)}
                    </td>
                    <td className="p-3 font-bold text-slate-800 text-sm">
                      {session.total_items} Pcs
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border ${getStatusBadge(session.status)}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          session.status === 'RUNNING' ? 'bg-emerald-500 animate-pulse' :
                          session.status === 'CLOSED' ? 'bg-amber-500' :
                          'bg-blue-500'
                        }`}></span>
                        {session.status}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      {session.status === 'RUNNING' ? (
                        <button
                          onClick={() => handleCloseSession(session.id, session.session_code)}
                          className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-lg border border-amber-200/50 text-xs font-medium transition-all duration-200"
                        >
                          🔒 Close Sesi
                        </button>
                      ) : (
                        <span className="text-slate-400 text-xs font-mono">
                          {session.status === 'CLOSED' ? 'Siap Handover' : 'Selesai'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}