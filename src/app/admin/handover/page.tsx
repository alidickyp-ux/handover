'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { showToast } from '@/components/common/ToastContainer';
import { formatDate } from '@/lib/utils';
import * as XLSX from 'xlsx';

interface HandoverManifest {
  id: string;
  session_id: string;
  session_code: string;
  transporter_name: string;
  courier_name: string;
  security_name: string;
  courier_signature: string;
  security_signature: string;
  total_packages_handed: number;
  handover_at: string;
  handover_by: string;
  handover_by_name?: string;
  total_discrepancy: number;
}

interface HistoryLog {
  id: string;
  resi_number: string;
  sorting_at: string;
  sorting_by: string;
  handover_at: string;
  handover_by: string;
  driver: string;
  transportation_number: string;
  status: string;
  security_sign: string;
  driver_sign: string;
}

export default function AdminHandoverConsolePage() {
  const [manifests, setManifests] = useState<HandoverManifest[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State untuk modal detail
  const [selectedManifest, setSelectedManifest] = useState<HandoverManifest | null>(null);
  const [historyLogs, setHistoryLogs] = useState<HistoryLog[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchManifests();
  }, []);

  const fetchManifests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('handover_manifests')
        .select(`
          id,
          session_id,
          courier_name,
          security_name,
          courier_signature,
          security_signature,
          total_packages_handed,
          handover_at,
          handover_by,
          total_discrepancy,
          sorting_sessions (
            session_code,
            master_transporters ( transporter_name )
          )
        `)
        .order('handover_at', { ascending: false });

      if (error) throw error;

      // Ambil nama handover_by dari users
      const userIds = (data || [])
        .map((item: any) => item.handover_by)
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

      const formattedData = (data || []).map((item: any) => ({
        id: item.id,
        session_id: item.session_id,
        session_code: item.sorting_sessions?.session_code || '-',
        transporter_name: item.sorting_sessions?.master_transporters?.transporter_name || '-',
        courier_name: item.courier_name,
        security_name: item.security_name,
        courier_signature: item.courier_signature,
        security_signature: item.security_signature,
        total_packages_handed: item.total_packages_handed,
        handover_at: item.handover_at,
        handover_by: item.handover_by,
        handover_by_name: userMap.get(item.handover_by) || '-',
        total_discrepancy: item.total_discrepancy || 0,
      }));

      setManifests(formattedData);
    } catch (error) {
      console.error('Error fetching manifests:', error);
      showToast('Gagal memuat data handover', 'error', 3000);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoryLogs = async (sessionId: string) => {
    setLoadingDetail(true);
    try {
      const { data, error } = await supabase
        .from('history_logs')
        .select('*')
        .eq('session_id', sessionId)
        .order('sorting_at', { ascending: true });

      if (error) throw error;
      setHistoryLogs(data || []);
    } catch (error) {
      console.error('Error fetching history logs:', error);
      showToast('Gagal memuat detail resi', 'error', 3000);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleOpenDetail = async (manifest: HandoverManifest) => {
    setSelectedManifest(manifest);
    setShowModal(true);
    await fetchHistoryLogs(manifest.session_id);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedManifest(null);
    setHistoryLogs([]);
  };

  // =========================================================
  // PRINT HANDOVER REPORT
  // =========================================================
  const handlePrint = () => {
    if (!selectedManifest || historyLogs.length === 0) {
      showToast('Tidak ada data untuk di-print', 'warning', 3000);
      return;
    }

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      showToast('Popup blocked! Izinkan popup untuk print.', 'error', 3000);
      return;
    }

    const rows = historyLogs.map((item, index) => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${index + 1}</td>
        <td style="padding: 8px; border: 1px solid #ddd; font-family: monospace;">${item.resi_number}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${item.sorting_by || '-'}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${formatDate(item.sorting_at)}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">
          <span style="color: ${item.status === 'DONE' ? 'green' : 'orange'};">
            ${item.status || 'PENDING'}
          </span>
        </td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Handover Report - ${selectedManifest.session_code}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .header { text-align: center; margin-bottom: 30px; }
            .header h1 { margin: 0; color: #1e293b; }
            .header p { margin: 5px 0; color: #64748b; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; padding: 15px; background: #f8fafc; border-radius: 8px; }
            .info-grid .label { font-weight: bold; color: #475569; }
            .signature-section { display: flex; justify-content: space-between; margin-top: 30px; padding-top: 20px; border-top: 2px solid #e2e8f0; }
            .signature-box { text-align: center; }
            .signature-box .label { font-weight: bold; color: #475569; }
            .signature-box .signature { font-family: 'Brush Script MT', cursive; font-size: 20px; margin: 10px 0; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th { background: #1e293b; color: white; padding: 10px; text-align: left; }
            td { padding: 8px; border: 1px solid #ddd; }
            .footer { text-align: center; margin-top: 30px; color: #94a3b8; font-size: 12px; }
            .badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 12px; }
            .badge-done { background: #dcfce7; color: #166534; }
            .badge-pending { background: #fef3c7; color: #92400e; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📋 BERITA ACARA SERAH TERIMA</h1>
          </div>

          <div class="info-grid">
            <div><span class="label">Kode Sesi:</span> ${selectedManifest.session_code}</div>
            <div><span class="label">Transporter:</span> ${selectedManifest.transporter_name}</div>
            <div><span class="label">Kurir:</span> ${selectedManifest.courier_name}</div>
            <div><span class="label">Security:</span> ${selectedManifest.security_name}</div>
            <div><span class="label">Handover Oleh:</span> ${selectedManifest.handover_by_name}</div>
            <div><span class="label">Total Paket:</span> ${selectedManifest.total_packages_handed}</div>
            <div><span class="label">Handover At:</span> ${formatDate(selectedManifest.handover_at)}</div>
            <div><span class="label">Discrepancy:</span> ${selectedManifest.total_discrepancy}</div>
          </div>

          <h3>Daftar Resi</h3>
          <table>
            <thead>
              <tr>
                <th style="text-align: center;">No</th>
                <th>Barcode Resi</th>
                <th>Sorting By</th>
                <th>Sorting At</th>
                <th style="text-align: center;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>

          
          <div class="signature-section">
            <div class="signature-box">
              <div class="label">Kurir</div>
              ${selectedManifest.courier_signature?.startsWith('data:image') 
                ? `<img src="${selectedManifest.courier_signature}" style="height: 60px; margin: 10px auto;" />` 
                : `<div class="signature">${selectedManifest.courier_signature || '___________________'}</div>`
              }
              <div>${selectedManifest.courier_name}</div>
            </div>
            <div class="signature-box">
              <div class="label">Security</div>
              ${selectedManifest.security_signature?.startsWith('data:image') 
                ? `<img src="${selectedManifest.security_signature}" style="height: 60px; margin: 10px auto;" />` 
                : `<div class="signature">${selectedManifest.security_signature || '___________________'}</div>`
              }
              <div>${selectedManifest.security_name}</div>
            </div>
            <div class="signature-box">
              <div class="label">Handover By</div>
              <div class="signature">${selectedManifest.handover_by_name || '___________________'}</div>
              <div>${selectedManifest.handover_by_name}</div>
            </div>
          </div>

          <div class="footer">
            Dicetak: ${new Date().toLocaleString('id-ID')} | COOL System v2.0
          </div>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  // =========================================================
  // EXPORT XLSX
  // =========================================================
  const handleExportXLSX = () => {
    if (!selectedManifest || historyLogs.length === 0) {
      showToast('Tidak ada data untuk di-export', 'warning', 3000);
      return;
    }

    try {
      const excelData = historyLogs.map((item, index) => ({
        'No': index + 1,
        'Barcode Resi': item.resi_number,
        'Sorting By': item.sorting_by || '-',
        'Sorting At': formatDate(item.sorting_at),
        'Handover By': item.handover_by || '-',
        'Handover At': formatDate(item.handover_at),
        'Driver': item.driver || '-',
        'No. Polisi': item.transportation_number || '-',
        'Status': item.status || 'PENDING',
      }));

      const ws = XLSX.utils.json_to_sheet(excelData);
      ws['!cols'] = [
        { wch: 5 },
        { wch: 20 },
        { wch: 18 },
        { wch: 22 },
        { wch: 18 },
        { wch: 22 },
        { wch: 18 },
        { wch: 15 },
        { wch: 12 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Detail Resi');

      // Sheet Info
      const infoData = [
        ['BERITA ACARA SERAH TERIMA'],
        [''],
        ['Kode Sesi', selectedManifest.session_code],
        ['Transporter', selectedManifest.transporter_name],
        ['Kurir', selectedManifest.courier_name],
        ['Security', selectedManifest.security_name],
        ['Handover Oleh', selectedManifest.handover_by_name],
        ['Total Paket', selectedManifest.total_packages_handed],
        ['Handover At', formatDate(selectedManifest.handover_at)],
        ['Discrepancy', selectedManifest.total_discrepancy],
        [''],
        ['Tanda Tangan:'],
        ['Kurir', selectedManifest.courier_signature || '-'],
        ['Security', selectedManifest.security_signature || '-'],
        ['Handover By', selectedManifest.handover_by_name || '-'],
        [''],
        ['Dicetak:', new Date().toLocaleString('id-ID')],
      ];
      const wsInfo = XLSX.utils.aoa_to_sheet(infoData);
      XLSX.utils.book_append_sheet(wb, wsInfo, 'Info Handover');

      const filename = `Handover_${selectedManifest.session_code}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, filename);

      showToast(`Export Excel berhasil: ${historyLogs.length} resi`, 'success', 3000);
    } catch (error) {
      console.error('Error exporting Excel:', error);
      showToast('Gagal export Excel', 'error', 3000);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      DONE: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      PENDING: 'bg-amber-100 text-amber-700 border-amber-200',
    };
    return styles[status] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

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
            Daftar sesi handover yang sudah selesai
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-600 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-xl border border-slate-200/50 shadow-sm">
            Total: <span className="font-bold text-indigo-600">{manifests.length}</span> Handover
          </span>
          <button
            onClick={fetchManifests}
            className="px-4 py-2 bg-white/80 backdrop-blur-sm text-slate-600 rounded-xl border border-slate-200/50 shadow-sm hover:shadow-md transition-all duration-200 text-sm font-medium flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </header>

      {/* Table - List Manifests */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/30 border border-white/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gradient-to-r from-slate-50/50 to-white border-b border-slate-200/50">
              <tr>
                <th className="p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Kode Sesi</th>
                <th className="p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Transporter</th>
                <th className="p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Kurir</th>
                <th className="p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Security</th>
                <th className="p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Paket</th>
                <th className="p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Handover At</th>
                <th className="p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Handover By</th>
                <th className="p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/50">
              {manifests.length === 0 ? (
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
                manifests.map((manifest) => (
                  <tr key={manifest.id} className="hover:bg-indigo-50/30 transition-colors duration-150">
                    <td className="p-3 font-mono font-bold text-indigo-600 text-sm">
                      {manifest.session_code}
                    </td>
                    <td className="p-3 text-slate-600 text-sm">
                      {manifest.transporter_name}
                    </td>
                    <td className="p-3 font-medium text-slate-800 text-sm">
                      {manifest.courier_name}
                    </td>
                    <td className="p-3 text-slate-600 text-sm">
                      {manifest.security_name}
                    </td>
                    <td className="p-3 font-bold text-slate-800 text-sm">
                      {manifest.total_packages_handed} Pcs
                    </td>
                    <td className="p-3 text-slate-500 text-sm">
                      {formatDate(manifest.handover_at)}
                    </td>
                    <td className="p-3 text-slate-600 text-sm">
                      {manifest.handover_by_name || '-'}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleOpenDetail(manifest)}
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

      {/* ========================================================= */}
      {/* MODAL DETAIL HANDOVER */}
      {/* ========================================================= */}
      {showModal && selectedManifest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col">
            {/* Header Modal */}
            <div className="p-6 border-b border-slate-200/50 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  Detail Handover: {selectedManifest.session_code}
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  {selectedManifest.transporter_name} • Kurir: {selectedManifest.courier_name} • Security: {selectedManifest.security_name}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  disabled={historyLogs.length === 0}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print
                </button>
                <button
                  onClick={handleExportXLSX}
                  disabled={historyLogs.length === 0}
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

            {/* Body Modal */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Info Ringkas */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500">Total Paket</p>
                  <p className="text-xl font-bold text-slate-800">{selectedManifest.total_packages_handed}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500">Discrepancy</p>
                  <p className="text-xl font-bold text-amber-600">{selectedManifest.total_discrepancy}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500">Handover By</p>
                  <p className="text-sm font-semibold text-slate-800">{selectedManifest.handover_by_name}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500">Handover At</p>
                  <p className="text-sm font-semibold text-slate-800">{formatDate(selectedManifest.handover_at)}</p>
                </div>
              </div>

              {/*Di bagian Tanda Tangan - Modal */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200/50">
                <div className="text-center">
                  <p className="text-xs text-slate-500 font-medium">Kurir</p>
                  {/* Jika base64 image */}
                  {selectedManifest.courier_signature?.startsWith('data:image') ? (
                    <img 
                      src={selectedManifest.courier_signature} 
                      alt="Tanda Tangan Kurir"
                      className="h-12 mx-auto object-contain"
                    />
                  ) : (
                    <p className="font-serif text-lg italic mt-1">{selectedManifest.courier_signature || '-'}</p>
                  )}
                  <p className="text-sm text-slate-600">{selectedManifest.courier_name}</p>
                </div>
                
                <div className="text-center">
                  <p className="text-xs text-slate-500 font-medium">Security</p>
                  {selectedManifest.security_signature?.startsWith('data:image') ? (
                    <img 
                      src={selectedManifest.security_signature} 
                      alt="Tanda Tangan Security"
                      className="h-12 mx-auto object-contain"
                    />
                  ) : (
                    <p className="font-serif text-lg italic mt-1">{selectedManifest.security_signature || '-'}</p>
                  )}
                  <p className="text-sm text-slate-600">{selectedManifest.security_name}</p>
                </div>
                
                <div className="text-center">
                  <p className="text-xs text-slate-500 font-medium">Handover By</p>
                  <p className="font-serif text-lg italic mt-1">{selectedManifest.handover_by_name || '-'}</p>
                  <p className="text-sm text-slate-600">{selectedManifest.handover_by_name}</p>
                </div>
              </div>

              {/* Daftar Resi */}
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
              ) : historyLogs.length === 0 ? (
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
                      Total <span className="font-bold text-slate-800">{historyLogs.length}</span> resi
                    </p>
                    <p className="text-sm text-slate-500">
                      DONE: <span className="font-bold text-emerald-600">{historyLogs.filter(d => d.status === 'DONE').length}</span> | 
                      PENDING: <span className="font-bold text-amber-600">{historyLogs.filter(d => d.status === 'PENDING').length}</span>
                    </p>
                  </div>

                  <div className="bg-slate-50 rounded-xl border border-slate-200/50 overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-slate-100/50 border-b border-slate-200/50">
                        <tr>
                          <th className="p-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">No</th>
                          <th className="p-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Barcode Resi</th>
                          <th className="p-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Sorting By</th>
                          <th className="p-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Sorting At</th>
                          <th className="p-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Driver</th>
                          <th className="p-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100/50">
                        {historyLogs.map((item, index) => (
                          <tr key={item.id} className="hover:bg-white/50 transition-colors">
                            <td className="p-2.5 text-sm text-slate-500">{index + 1}</td>
                            <td className="p-2.5 font-mono font-bold text-indigo-600 text-sm">{item.resi_number}</td>
                            <td className="p-2.5 text-sm text-slate-700">{item.sorting_by || '-'}</td>
                            <td className="p-2.5 text-sm text-slate-500">{formatDate(item.sorting_at)}</td>
                            <td className="p-2.5 text-sm text-slate-700">{item.driver || '-'}</td>
                            <td className="p-2.5 text-center">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${getStatusBadge(item.status)}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${item.status === 'DONE' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
                                {item.status || 'PENDING'}
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

            {/* Footer Modal */}
            <div className="p-4 border-t border-slate-200/50 flex justify-between items-center">
              <span className="text-xs text-slate-400">
                {historyLogs.length > 0 && `${historyLogs.filter(d => d.status === 'DONE').length} dari ${historyLogs.length} resi selesai`}
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