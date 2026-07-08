'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface SessionItem {
  id: string;
  session_code: string;
  transporter_name: string;
  total_items: number;
}

export default function MobileHandoverPage() {
  const router = useRouter();
  const [operatorId, setOperatorId] = useState('');
  const [operatorName, setOperatorName] = useState('');
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [selectedSession, setSelectedSession] = useState<SessionItem | null>(null);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [remainingCount, setRemainingCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [driverName, setDriverName] = useState('');
  const [nopol, setNopol] = useState('');
  const [msg, setMsg] = useState({ text: '', isError: false });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/');
        return;
      }
      setOperatorId(session.user.id);
      setOperatorName(session.user.user_metadata?.full_name || 'Operator');
      await fetchSessions();
      setTimeout(() => inputRef.current?.focus(), 100);
    };
    init();
  }, [router]);

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
    }
  };

  const handleSelectSession = async (sessionId: string) => {
    if (!sessionId) {
      setSelectedSession(null);
      setRemainingCount(0);
      setIsFinished(false);
      setMsg({ text: '', isError: false });
      return;
    }

    const session = sessions.find((s) => s.id === sessionId) || null;
    setSelectedSession(session);
    setRemainingCount(session?.total_items || 0);
    setIsFinished(false);
    setMsg({ text: '', isError: false });
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    const barcode = barcodeInput.trim().toUpperCase();
    if (!barcode || !selectedSession) return;

    setLoading(true);
    setMsg({ text: '', isError: false });

    try {
      // Haptic feedback
      if (navigator.vibrate) navigator.vibrate(50);

      const { data: match, error } = await supabase
        .from('sorting_details')
        .select('id, is_validated_handover')
        .eq('session_id', selectedSession.id)
        .eq('barcode_resi', barcode)
        .maybeSingle();

      if (error || !match) {
        setMsg({ text: `❌ Resi ${barcode} tidak cocok`, isError: true });
        if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
        setBarcodeInput('');
        setLoading(false);
        return;
      }

      if (match.is_validated_handover) {
        setMsg({ text: `⚠️ Resi ${barcode} sudah discan`, isError: true });
        setBarcodeInput('');
        setLoading(false);
        return;
      }

      const { error: updError } = await supabase
        .from('sorting_details')
        .update({ is_validated_handover: true })
        .eq('id', match.id);

      if (updError) throw updError;

      const nextCount = remainingCount - 1;
      setRemainingCount(nextCount);
      setMsg({ text: `✓ ${barcode} valid`, isError: false });
      if (navigator.vibrate) navigator.vibrate(50);

      if (nextCount === 0) {
        setIsFinished(true);
        setMsg({ text: '🎉 Semua resi selesai!', isError: false });
      }
    } catch (error) {
      console.error('Error scanning:', error);
      setMsg({ text: 'Error sistem', isError: true });
    } finally {
      setBarcodeInput('');
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleFinalize = async () => {
    if (!driverName.trim() || !nopol.trim()) {
      setMsg({ text: 'Isi nama driver dan no polisi!', isError: true });
      return;
    }

    try {
      // Get all details
      const { data: details } = await supabase
        .from('sorting_details')
        .select('barcode_resi, scanned_at')
        .eq('session_id', selectedSession?.id);

      if (details && details.length > 0) {
        const logs = details.map((d) => ({
          session_id: selectedSession?.id,
          session_code: selectedSession?.session_code,
          transporter_name: selectedSession?.transporter_name,
          resi_number: d.barcode_resi,
          sorting_at: d.scanned_at,
          sorting_by: operatorName,
          handover_by: operatorName,
          driver: driverName,
          transportation_number: nopol,
          status: 'DONE',
          security_sign: operatorName,
        }));

        await supabase.from('history_logs').insert(logs);
      }

      // Update session status
      await supabase
        .from('sorting_sessions')
        .update({ status: 'RECONCILED' })
        .eq('id', selectedSession?.id);

      setMsg({ text: '✅ Handover selesai!', isError: false });
      if (navigator.vibrate) navigator.vibrate([50, 50, 50]);

      setTimeout(() => {
        setSelectedSession(null);
        setIsFinished(false);
        setDriverName('');
        setNopol('');
        setMsg({ text: '', isError: false });
        fetchSessions();
      }, 1500);
    } catch (error) {
      console.error('Error finalizing:', error);
      setMsg({ text: 'Gagal finalisasi', isError: true });
    }
  };

  return (
    <div className="flex-1 p-4 space-y-4">
      {/* Select Session */}
      <div className="bg-slate-800 rounded-2xl p-4">
        <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2">
          Pilih Sesi
        </label>
        <select
          onChange={(e) => handleSelectSession(e.target.value)}
          className="w-full p-3 bg-slate-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
          value={selectedSession?.id || ''}
        >
          <option value="">-- Pilih Sesi ({sessions.length}) --</option>
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.transporter_name} - {s.session_code} ({s.total_items})
            </option>
          ))}
        </select>
      </div>

      {selectedSession && (
        <>
          {/* Counter */}
          <div className="bg-slate-800 rounded-2xl p-6 text-center">
            <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">Sisa Resi</p>
            <p className="text-5xl font-bold text-indigo-400">{remainingCount}</p>
            <p className="text-slate-500 text-xs mt-2 font-mono">{selectedSession.session_code}</p>
          </div>

          {/* Status Message */}
          {msg.text && (
            <div
              className={`p-3 rounded-xl text-center font-medium ${
                msg.isError
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}
            >
              {msg.text}
            </div>
          )}

          {/* Scan Input */}
          {!isFinished ? (
            <form onSubmit={handleScan} className="bg-slate-800 rounded-2xl p-4">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Scan resi..."
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  className="flex-1 p-3 bg-slate-700 text-white font-mono rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 bg-indigo-500 text-white font-bold rounded-xl hover:bg-indigo-600 transition-colors disabled:opacity-50"
                >
                  {loading ? '...' : 'Scan'}
                </button>
              </div>
            </form>
          ) : (
            /* Finalize Form */
            <div className="bg-slate-800 rounded-2xl p-4 space-y-3">
              <p className="text-emerald-400 font-bold text-center">🎉 Selesai!</p>
              <input
                type="text"
                placeholder="Nama Driver/Kurir"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                className="w-full p-3 bg-slate-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-500"
              />
              <input
                type="text"
                placeholder="No. Polisi"
                value={nopol}
                onChange={(e) => setNopol(e.target.value)}
                className="w-full p-3 bg-slate-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-500"
              />
              <button
                onClick={handleFinalize}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/30 active:scale-95 transition-all duration-200"
              >
                Selesaikan Handover
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}