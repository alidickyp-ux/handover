'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { showToast } from '@/components/common/ToastContainer';
import { formatDate } from '@/lib/utils';
import * as XLSX from 'xlsx';

interface HistoryItem {
  id: string;
  session_code: string;
  transporter_name: string;
  resi_number: string;
  sorting_at: string;
  sorting_by: string;
  handover_by: string;
  driver: string;
  transportation_number: string;
  status: string;
  security_sign: string;
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [filtered, setFiltered] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    date: '',
    status: '',
  });

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, history]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('history_logs')
        .select('*')
        .order('sorting_at', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
      setFiltered(data || []);
    } catch (error) {
      console.error('Error fetching history:', error);
      showToast('Gagal memuat history', 'error', 3000);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let result = history;

    if (filters.search) {
      const search = filters.search.toLowerCase();
      result = result.filter(
        (item) =>
          item.resi_number.toLowerCase().includes(search) ||
          item.session_code.toLowerCase().includes(search) ||
          item.driver.toLowerCase().includes(search)
      );
    }

    if (filters.date) {
      result = result.filter((item) => item.sorting_at.startsWith(filters.date));
    }

    if (filters.status) {
      result = result.filter((item) => item.status === filters.status);
    }

    setFiltered(result);
  };

  const exportToExcel = () => {
    try {
      const exportData = filtered.map((item) => ({
        'Kode Sesi': item.session_code,
        'Ekspedisi': item.transporter_name,
        'Nomor Resi': item.resi_number,
        'Waktu Sorting': new Date(item.sorting_at).toLocaleString('id-ID'),
        'Sorting Oleh': item.sorting_by,
        'Handover Oleh': item.handover_by,
        'Driver': item.driver,
        'No. Polisi': item.transportation_number,
        'Status': item.status,
        'Security': item.security_sign,
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'History');

      const filename = `Handover_History_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, filename);

      showToast('✅ Export Excel berhasil!', 'success', 3000);
    } catch (error) {
      console.error('Error exporting:', error);
      showToast('Gagal export Excel', 'error', 3000);
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
          <span className="text-sm font-medium">Memuat history...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center pb-6 border-b border-slate-200/50">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent tracking-tight">
            History & Export
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Riwayat serah terima dan export data
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-600 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-xl border border-slate-200/50 shadow-sm">
            Total: <span className="font-bold text-indigo-600">{filtered.length}</span> Records
          </span>
          <button
            onClick={exportToExcel}
            className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold text-sm shadow-lg shadow-emerald-200/50 hover:shadow-xl transition-all duration-200 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Export Excel
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 border border-white/50 shadow-xl shadow-slate-200/30">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Cari
            </label>
            <input
              type="text"
              placeholder="Cari resi, sesi, atau driver..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50/50 border-2 border-slate-200/50 text-slate-800 text-sm focus:outline-none focus:border-indigo-500 focus:bg-white transition-all duration-200"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Filter Tanggal
            </label>
            <input
              type="date"
              value={filters.date}
              onChange={(e) => setFilters({ ...filters, date: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50/50 border-2 border-slate-200/50 text-slate-800 text-sm focus:outline-none focus:border-indigo-500 focus:bg-white transition-all duration-200"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50/50 border-2 border-slate-200/50 text-slate-800 text-sm focus:outline-none focus:border-indigo-500 focus:bg-white transition-all duration-200"
            >
              <option value="">Semua Status</option>
              <option value="DONE">Selesai</option>
              <option value="PENDING">Pending</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/50 shadow-xl shadow-slate-200/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gradient-to-r from-slate-50/50 to-white border-b border-slate-200/50">
              <tr>
                <th className="p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Resi</th>
                <th className="p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Sesi</th>
                <th className="p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ekspedisi</th>
                <th className="p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Driver</th>
                <th className="p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">No. Polisi</th>
                <th className="p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Waktu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      <span className="text-sm font-medium">Tidak ada data</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-indigo-50/30 transition-colors duration-150">
                    <td className="p-3 font-mono font-bold text-indigo-600 text-sm">
                      {item.resi_number}
                    </td>
                    <td className="p-3 font-mono text-slate-600 text-sm">
                      {item.session_code}
                    </td>
                    <td className="p-3 text-slate-600 text-sm">
                      {item.transporter_name}
                    </td>
                    <td className="p-3 font-medium text-slate-800 text-sm">
                      {item.driver}
                    </td>
                    <td className="p-3 font-mono text-slate-600 text-sm">
                      {item.transportation_number}
                    </td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200/50 text-xs font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        {item.status}
                      </span>
                    </td>
                    <td className="p-3 text-slate-500 text-sm">
                      {formatDate(item.sorting_at)}
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