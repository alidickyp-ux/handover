'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { showToast } from '@/components/common/ToastContainer';
import { formatDate } from '@/lib/utils';
import * as XLSX from 'xlsx';

interface SessionHistory {
  id: string;
  session_code: string;
  transporter_name: string;
  operator_name: string;
  total_items: number;
  status: 'RUNNING' | 'CLOSED' | 'RECONCILED';
  created_at: string;
  closed_at?: string;
}

interface SessionDetail {
  id: string;
  barcode_resi: string;
  scanned_at: string;
  is_validated_handover: boolean;
  sorting_by: string | null;
  users: { full_name: string }[] | null;
}

export default function AdminSortingMonitorPage() {
  const [sessions, setSessions] = useState<SessionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  
  const [selectedSession, setSelectedSession] = useState<SessionHistory | null>(null);
  const [sessionDetails, setSessionDetails] = useState<SessionDetail[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showModal, setShowModal] = useState(false);

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
          users ( full_name ),
          master_transporters ( transporter_name )
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
            operator_name: s.users?.[0]?.full_name || 'Tidak Diketahui',
            transporter_name: s.master_transporters?.transporter_name || '-',
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

  const fetchSessionDetails = async (sessionId: string) => {
    setLoadingDetail(true);
    try {
      // 1. Ambil detail sorting
      const { data, error } = await supabase
        .from('sorting_details')
        .select(`
          id, 
          barcode_resi, 
          scanned_at, 
          is_validated_handover,
          sorting_by
        `)
        .eq('session_id', sessionId)
        .order('scanned_at', { ascending: true });

      if (error) throw error;

      // 2. Ambil semua user yang terlibat untuk mendapatkan full_name
      const userIds = (data || [])
        .map((item: any) => item.sorting_by)
        .filter((id: string) => id !== null);

      let userMap = new Map();
      if (userIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, full_name')
          .in('id', userIds);

        if (usersData) {
          usersData.forEach((u: any) => {
            userMap.set(u.id, u.full_name);
          });
        }
      }

      // 3. Gabungkan data
      const transformedData = (data || []).map((item: any) => ({
        ...item,
        users: item.sorting_by ? [{ full_name: userMap.get(item.sorting_by) || '-' }] : null
      }));

      setSessionDetails(transformedData);
    } catch (error) {
      console.error('Error fetching session details:', error);
      showToast('Gagal memuat detail sesi', 'error', 3000);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleOpenDetail = async (session: SessionHistory) => {
    setSelectedSession(session);
    setShowModal(true);
    await fetchSessionDetails(session.id);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedSession(null);
    setSessionDetails([]);
  };

  // =========================================================
  // EXPORT KE XLSX (EXCEL)
  // =========================================================
  const handleExportXLSX = async () => {
    if (!selectedSession || sessionDetails.length === 0) {
      showToast('Tidak ada data untuk di-export', 'warning', 3000);
      return;
    }

    try {
      // Ambil data handover dari history_logs
      const { data: historyData } = await supabase
        .from('history_logs')
        .select('resi_number, handover_by, sorting_at, status')
        .eq('session_id', selectedSession.id);

      const handoverMap = new Map();
      if (historyData) {
        historyData.forEach((h: any) => {
          handoverMap.set(h.resi_number, {
            handover_by: h.handover_by || '-',
            sorting_at: h.sorting_at || '-',
            status: h.status || 'PENDING'
          });
        });
      }

      const formatDateTime = (date: string) => {
        if (!date || date === '-') return '-';
        try {
          const d = new Date(date);
          return d.toLocaleString('id-ID', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        } catch {
          return date;
        }
      };

      // Build data untuk Excel - sorting_by per resi
      const excelData = sessionDetails.map((item, index) => {
        const handoverInfo = handoverMap.get(item.barcode_resi) || {
          handover_by: '-',
          sorting_at: item.scanned_at || '-',
          status: item.is_validated_handover ? 'DONE' : 'PENDING'
        };

        // Ambil sorting_by dari users (array)
        const sortingBy = item.users?.[0]?.full_name || '-';

        return {
          'No': index + 1,
          'Barcode Resi': item.barcode_resi,
          'Sorting By': sortingBy,
          'Handover By': handoverInfo.handover_by || '-',
          'Sorting At': formatDateTime(item.scanned_at),
          'Handover At': item.is_validated_handover ? formatDateTime(item.scanned_at) : '-',
          'Status': item.is_validated_handover ? 'DONE' : 'PENDING'
        };
      });

      // Buat workbook
      const ws = XLSX.utils.json_to_sheet(excelData);
      ws['!cols'] = [
        { wch: 5 },
        { wch: 20 },
        { wch: 18 },
        { wch: 18 },
        { wch: 22 },
        { wch: 22 },
        { wch: 12 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Detail Sesi');

      // Sheet Info
      const infoData = [
        ['LAPORAN DETAIL SESI SORTING'],
        [''],
        ['Kode Sesi', selectedSession.session_code],
        ['Transporter', selectedSession.transporter_name],
        ['Waktu Mulai', formatDate(selectedSession.created_at)],
        ['Total Resi', sessionDetails.length],
        ['Status Handover', `${sessionDetails.filter(d => d.is_validated_handover).length} / ${sessionDetails.length}`],
        [''],
        ['Dicetak:', new Date().toLocaleString('id-ID')],
      ];
      const wsInfo = XLSX.utils.aoa_to_sheet(infoData);
      XLSX.utils.book_append_sheet(wb, wsInfo, 'Info Sesi');

      const filename = `Sesi_${selectedSession.session_code}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, filename);

      showToast(`Export Excel berhasil: ${sessionDetails.length} resi`, 'success', 3000);
    } catch (error) {
      console.error('Error exporting Excel:', error);
      showToast('Gagal export Excel', 'error', 3000);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      RUNNING: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      CLOSED: 'bg-amber-100 text-amber-700 border-amber-200',
      RECONCILED: 'bg-blue-100 text-blue-700 border-blue-200',
    };
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getStatusDot = (status: string) => {
    const colors = {
      RUNNING: 'bg-emerald-500 animate-pulse',
      CLOSED: 'bg-amber-500',
      RECONCILED: 'bg-blue-500',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-500';
  };

  const filteredSessions = sessions.filter(s => {
    if (filter === 'all') return true;
    return s.status === filter.toUpperCase();
  });

  const totalRunning = sessions.filter(s => s.status === 'RUNNING').length;
  const totalClosed = sessions.filter(s => s.status === 'CLOSED').length;
  const totalReconciled = sessions.filter(s => s.status === 'RECONCILED').length;

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
      <header className="flex justify-between items-center pb-6 border-b border-slate-200/50">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent tracking-tight">
            Sorting Monitor
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Pantau semua sesi sorting dan status rekonsiliasi
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-600 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-xl border border-slate-200/50 shadow-sm">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> {totalRunning}</span>
            <span className="text-slate-300">|</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span> {totalClosed}</span>
            <span className="text-slate-300">|</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> {totalReconciled}</span>
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
        </div>
      </header>

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
            Semua ({sessions.length})
          </button>
          <button
            onClick={() => setFilter('running')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              filter === 'running'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200/50'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            🔄 Running ({totalRunning})
          </button>
          <button
            onClick={() => setFilter('closed')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              filter === 'closed'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-200/50'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ⏸ Closed ({totalClosed})
          </button>
          <button
            onClick={() => setFilter('reconciled')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              filter === 'reconciled'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200/50'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ✅ Reconciled ({totalReconciled})
          </button>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/30 border border-white/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gradient-to-r from-slate-50/50 to-white border-b border-slate-200/50">
              <tr>
                <th className="p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Kode Sesi</th>
                <th className="p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Transporter</th>
                <th className="p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Operator</th>
                <th className="p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Waktu Mulai</th>
                <th className="p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Paket</th>
                <th className="p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/50">
              {filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      <span className="text-sm font-medium">Tidak ada sesi</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSessions.map((session) => (
                  <tr key={session.id} className="hover:bg-indigo-50/30 transition-colors duration-150">
                    <td className="p-3 font-mono font-bold text-indigo-600 text-sm">{session.session_code}</td>
                    <td className="p-3 text-slate-600 text-sm">{session.transporter_name}</td>
                    <td className="p-3 text-slate-600 text-sm">{session.operator_name}</td>
                    <td className="p-3 text-slate-500 text-sm">{formatDate(session.created_at)}</td>
                    <td className="p-3 font-bold text-slate-800 text-sm">{session.total_items} Pcs</td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${getStatusBadge(session.status)}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(session.status)}`}></span>
                        {session.status}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleOpenDetail(session)}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg border border-indigo-200/50 text-xs font-medium transition-all duration-200"
                      >
                        📋 Detail
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DETAIL */}
      {showModal && selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-200/50 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Detail Sesi: {selectedSession.session_code}</h2>
                <p className="text-sm text-slate-500 mt-1">
                  {selectedSession.transporter_name} • {selectedSession.operator_name} • {formatDate(selectedSession.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportXLSX}
                  disabled={sessionDetails.length === 0}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Export Excel
                </button>
                <button
                  onClick={handleCloseModal}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {loadingDetail ? (
                <div className="flex items-center justify-center h-40">
                  <div className="flex items-center gap-3 text-slate-400">
                    <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span className="text-sm font-medium">Memuat detail resi...</span>
                  </div>
                </div>
              ) : sessionDetails.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                  <svg className="w-12 h-12 text-slate-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-sm font-medium">Tidak ada resi dalam sesi ini</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-sm text-slate-500">
                      Total <span className="font-bold text-slate-800">{sessionDetails.length}</span> resi
                    </p>
                    <p className="text-sm text-slate-500">
                      Handover: <span className="font-bold text-emerald-600">{sessionDetails.filter(d => d.is_validated_handover).length}</span> | 
                      Pending: <span className="font-bold text-amber-600">{sessionDetails.filter(d => !d.is_validated_handover).length}</span>
                    </p>
                  </div>

                  <div className="bg-slate-50 rounded-xl border border-slate-200/50 overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-slate-100/50 border-b border-slate-200/50">
                        <tr>
                          <th className="p-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">No</th>
                          <th className="p-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Barcode Resi</th>
                          <th className="p-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Sorting By</th>
                          <th className="p-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Waktu Scan</th>
                          <th className="p-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100/50">
                        {sessionDetails.map((item, index) => (
                          <tr key={item.id} className="hover:bg-white/50 transition-colors">
                            <td className="p-2.5 text-sm text-slate-500">{index + 1}</td>
                            <td className="p-2.5 font-mono font-bold text-indigo-600 text-sm">{item.barcode_resi}</td>
                            <td className="p-2.5 text-sm text-slate-700 font-medium">
                              {item.users?.[0]?.full_name || '-'}
                            </td>
                            <td className="p-2.5 text-sm text-slate-500">{formatDate(item.scanned_at)}</td>
                            <td className="p-2.5 text-center">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${
                                item.is_validated_handover
                                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200/50'
                                  : 'bg-amber-50 text-amber-600 border-amber-200/50'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${item.is_validated_handover ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
                                {item.is_validated_handover ? 'SUDAH' : 'BELUM'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            <div className="p-4 border-t border-slate-200/50 flex justify-between items-center">
              <span className="text-xs text-slate-400">
                {sessionDetails.length > 0 && `${sessionDetails.filter(d => d.is_validated_handover).length} dari ${sessionDetails.length} resi sudah di-handover`}
              </span>
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-medium transition-all duration-200"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}