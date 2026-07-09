'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { showToast } from '@/components/common/ToastContainer';
import { formatDate } from '@/lib/utils';

interface HandoverHistory {
  id: string;
  session_code: string;
  transporter_name: string;
  driver: string;
  transportation_number: string;
  handover_by: string;
  security_sign: string;
  sorting_at: string;
  status: string;
  total_items: number;
}

export default function AdminHandoverConsolePage() {
  const [history, setHistory] = useState<HandoverHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchHandoverHistory();
  }, []);

  const fetchHandoverHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('history_logs')
        .select(`
          id,
          session_code,
          transporter_name,
          driver,
          transportation_number,
          handover_by,
          security_sign,
          sorting_at,
          status,
          session_id
        `)
        .order('sorting_at', { ascending: false });

      if (error) throw error;

      // Group by session untuk total items
      const grouped = await Promise.all(
        (data || []).map(async (item: any) => {
          const { count } = await supabase
            .from('history_logs')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', item.session_id);

          return {
            ...item,
            total_items: count || 0,
          };
        })
      );

      setHistory(grouped);
    } catch (error) {
      console.error('Error fetching handover history:', error);
      showToast('Gagal memuat data handover', 'error', 3000);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      DONE: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      PENDING: 'bg-amber-100 text-amber-700 border-amber-200',
    };
    return styles[status] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const filteredHistory = history.filter(item => {
    if (filter === 'all') return true;
    return item.status === filter.toUpperCase();
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center gap-3 text-slate-400">
          <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm font-medium">Memuat data handover...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center pb-6 border-b border-slate-200/50">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent tracking-tight">
            Handover Console
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Riwayat serah terima paket yang sudah selesai
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-600 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-xl border border-slate-200/50 shadow-sm">
            Total: <span className="font-bold text-indigo-600">{history.length}</span> Handover
          </span>
          <button
            onClick={fetchHandoverHistory}
            className="px-4 py-2 bg-white/80 backdrop-blur-sm text-slate-600 rounded-xl border border-slate-200/50 shadow-sm hover:shadow-md transition-all duration-200 text-sm font-medium flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </header>

      {/* Filters */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 border border-white/50 shadow-xl shadow-slate-200/30">
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              filter === 'all'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200/50'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua
          </button>
          <button
            onClick={() => setFilter('done')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              filter === 'done'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200/50'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ✅ Selesai
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              filter === 'pending'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-200/50'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ⏳ Pending
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/30 border border-white/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gradient-to-r from-slate-50/50 to-white border-b border-slate-200/50">
              <tr>
                <th className="p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Kode Sesi</th>
                <th className="p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Transporter</th>
                <th className="p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Driver</th>
                <th className="p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">No. Polisi</th>
                <th className="p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Paket</th>
                <th className="p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Handover Oleh</th>
                <th className="p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Waktu</th>
                <th className="p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/50">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      <span className="text-sm font-medium">Belum ada data handover</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-indigo-50/30 transition-colors duration-150">
                    <td className="p-3 font-mono font-bold text-indigo-600 text-sm">
                      {item.session_code}
                    </td>
                    <td className="p-3 text-slate-600 text-sm">
                      {item.transporter_name}
                    </td>
                    <td className="p-3 font-medium text-slate-800 text-sm">
                      {item.driver || '-'}
                    </td>
                    <td className="p-3 font-mono text-slate-600 text-sm">
                      {item.transportation_number || '-'}
                    </td>
                    <td className="p-3 font-bold text-slate-800 text-sm">
                      {item.total_items} Pcs
                    </td>
                    <td className="p-3 text-slate-600 text-sm">
                      {item.handover_by}
                    </td>
                    <td className="p-3 text-slate-500 text-sm">
                      {formatDate(item.sorting_at)}
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${getStatusBadge(item.status)}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          item.status === 'DONE' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                        }`}></span>
                        {item.status}
                      </span>
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