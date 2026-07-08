'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { showToast } from '@/components/common/ToastContainer';
import { formatDate } from '@/lib/utils';

interface SessionItem {
  id: string;
  session_code: string;
  transporter_name: string;
  total_items: number;
}

interface ItemDetail {
  id: string;
  barcode_resi: string;
  is_validated_handover: boolean;
}

export default function HandoverConsolePage() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [selectedSessionCode, setSelectedSessionCode] = useState<string>('');
  const [items, setItems] = useState<ItemDetail[]>([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [msg, setMsg] = useState({ text: '', isError: false });
  const [isFinished, setIsFinished] = useState(false);
  const [driverName, setDriverName] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('sorting_sessions')
        .select(`
          id,
          session_code,
          master_transporters ( transporter_name )
        `)
        .eq('status', 'CLOSED');

      if (error) throw error;

      const formatted = await Promise.all(
        (data || []).map(async (s: any) => {
          const { count } = await supabase
            .from('sorting_details')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', s.id)
            .eq('is_validated_handover', false);

          return {
            id: s.id,
            session_code: s.session_code,
            transporter_name: s.master_transporters?.transporter_name || 'Unknown',
            total_items: count || 0,
          };
        })
      );

      setSessions(formatted.filter((s) => s.total_items > 0));
    } catch (error) {
      console.error('Error fetching sessions:', error);
      showToast('Gagal memuat data sesi', 'error', 3000);
    }
  };

  const handleSelectSession = async (sessionId: string) => {
    if (!sessionId) {
      setSelectedSessionId('');
      setSelectedSessionCode('');
      setItems([]);
      setIsFinished(false);
      setMsg({ text: '', isError: false });
      return;
    }

    setLoading(true);
    setIsFinished(false);
    setMsg({ text: '', isError: false });

    const session = sessions.find((s) => s.id === sessionId);
    setSelectedSessionId(sessionId);
    setSelectedSessionCode(session?.session_code || '');

    try {
      const { data, error } = await supabase
        .from('sorting_details')
        .select('id, barcode_resi, is_validated_handover')
        .eq('session_id', sessionId)
        .order('scanned_at', { ascending: true });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching items:', error);
      showToast('Gagal memuat detail sesi', 'error', 3000);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    const barcode = barcodeInput.trim().toUpperCase();
    if (!barcode || !selectedSessionId) return;

    setMsg({ text: '', isError: false });

    try {
      const match = items.find((item) => item.barcode_resi === barcode);

      if (!match) {
        setMsg({ text: `❌ Resi ${barcode} tidak cocok dengan manifest`, isError: true });
        setBarcodeInput('');
        return;
      }

      if (match.is_validated_handover) {
        setMsg({ text: `⚠️ Resi ${barcode} sudah divalidasi`, isError: true });
        setBarcodeInput('');
        return;
      }

      const { error } = await supabase
        .from('sorting_details')
        .update({ is_validated_handover: true })
        .eq('id', match.id);

      if (error) throw error;

      const updatedItems = items.map((item) =>
        item.id === match.id ? { ...item, is_validated_handover: true } : item
      );
      setItems(updatedItems);
      setMsg({ text: `✓ ${barcode} berhasil divalidasi`, isError: false });

      const remaining = updatedItems.filter((item) => !item.is_validated_handover).length;
      if (remaining === 0) {
        setIsFinished(true);
        setMsg({ text: '🎉 Semua resi selesai divalidasi!', isError: false });
      }
    } catch (error) {
      console.error('Error validating item:', error);
      setMsg({ text: 'Gagal memvalidasi resi', isError: true });
    } finally {
      setBarcodeInput('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleFinalize = async () => {
    if (!driverName.trim()) {
      showToast('Masukkan nama driver terlebih dahulu!', 'warning', 3000);
      return;
    }

    try {
      const { error } = await supabase
        .from('sorting_sessions')
        .update({ status: 'RECONCILED' })
        .eq('id', selectedSessionId);

      if (error) throw error;

      showToast(`✅ Handover selesai! Sesi ${selectedSessionCode} ditutup.`, 'success', 4000);

      setSelectedSessionId('');
      setSelectedSessionCode('');
      setItems([]);
      setDriverName('');
      setIsFinished(false);
      setMsg({ text: '', isError: false });
      fetchSessions();
    } catch (error) {
      console.error('Error finalizing:', error);
      showToast('Gagal menyelesaikan handover', 'error', 3000);
    }
  };

  const remainingCount = items.filter((item) => !item.is_validated_handover).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex justify-between items-center pb-6 border-b border-slate-200/50">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent tracking-tight">
            Handover Console
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Validasi serah terima paket bersama kurir
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

      {/* Select Session */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/30 p-4 border border-white/50">
        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
          Pilih Sesi Manifest Siap Serah Terima
        </label>
        <select
          value={selectedSessionId}
          onChange={(e) => handleSelectSession(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl bg-slate-50/50 border-2 border-slate-200/50 text-slate-800 text-sm focus:outline-none focus:border-indigo-500 focus:bg-white transition-all duration-200 font-mono"
        >
          <option value="">-- PILIH SESI ({sessions.length} Sesi) --</option>
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              [{s.transporter_name}] {s.session_code} - {s.total_items} Paket
            </option>
          ))}
        </select>
      </div>

      {selectedSessionId && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left & Center Column */}
          <div className="lg:col-span-2 space-y-4">
            {/* Status Message */}
            {msg.text && (
              <div
                className={`p-3 rounded-xl border font-medium ${
                  msg.isError
                    ? 'bg-rose-50 border-rose-200 text-rose-600'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                }`}
              >
                {msg.text}
              </div>
            )}

            {/* Scan Input */}
            {!isFinished ? (
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/30 p-4 border border-white/50">
                <form onSubmit={handleScan} className="flex gap-3">
                  <div className="flex-1">
                    <input
                      ref={inputRef}
                      type="text"
                      required
                      placeholder="Scan barcode resi..."
                      value={barcodeInput}
                      onChange={(e) => setBarcodeInput(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50/50 border-2 border-slate-200/50 text-slate-800 text-sm focus:outline-none focus:border-indigo-500 focus:bg-white transition-all duration-200 font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl font-semibold text-sm shadow-lg shadow-indigo-200/50 hover:shadow-xl transition-all duration-200"
                  >
                    Validasi
                  </button>
                </form>
              </div>
            ) : (
              /* Finalize Form */
              <div className="bg-emerald-50/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-emerald-200/30 p-4 border border-emerald-200/50">
                <h3 className="font-bold text-emerald-800 text-sm mb-3">
                  🎉 Semua Resi Berhasil Divalidasi!
                </h3>
                <div className="bg-white/80 rounded-xl p-4 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                      Nama Driver / Kurir
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Budi Santoso"
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50/50 border-2 border-slate-200/50 text-slate-800 text-sm focus:outline-none focus:border-emerald-500 focus:bg-white transition-all duration-200"
                    />
                  </div>
                  <button
                    onClick={handleFinalize}
                    className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl font-semibold text-sm shadow-lg shadow-emerald-200/50 hover:shadow-xl transition-all duration-200"
                  >
                    ✍️ Kunci Berita Acara & Selesaikan
                  </button>
                </div>
              </div>
            )}

            {/* Items List */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/30 border border-white/50 overflow-hidden">
              <div className="p-3 bg-gradient-to-r from-slate-50/50 to-white border-b border-slate-200/50 font-semibold text-slate-700 text-sm">
                Daftar Manifest ({items.length} Resi)
              </div>
              <div className="divide-y divide-slate-100/50 max-h-64 overflow-y-auto">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 flex justify-between items-center hover:bg-slate-50/30 transition-colors"
                  >
                    <span
                      className={`font-mono font-bold ${
                        item.is_validated_handover
                          ? 'line-through text-slate-400'
                          : 'text-slate-800'
                      }`}
                    >
                      {item.barcode_resi}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-lg text-[0.6rem] font-bold ${
                        item.is_validated_handover
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/50'
                          : 'bg-amber-50 text-amber-600 border border-amber-200/50'
                      }`}
                    >
                      {item.is_validated_handover ? '✓ MATCHED' : '⌛ PENDING'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Counter */}
          <div className="lg:col-span-1">
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/30 p-6 border border-white/50 text-center sticky top-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Sisa Resi Countdown
              </p>
              <p
                className={`text-6xl font-black my-3 tracking-tight ${
                  remainingCount === 0 ? 'text-emerald-600' : 'text-slate-800'
                }`}
              >
                {remainingCount}
              </p>
              <p className="text-xs text-slate-400 font-medium">
                {remainingCount === 0
                  ? '✅ Manifest beres sempurna!'
                  : 'Paket menunggu validasi'}
              </p>
              <div className="mt-4 pt-4 border-t border-slate-200/50">
                <p className="text-xs text-slate-400 font-mono">
                  Sesi: {selectedSessionCode}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}