'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface ActiveSession {
  id: string;
  session_code: string;
  transporter_name: string;
  total_items: number;
  created_at: string;
}

export default function MobileScanPage() {
  const router = useRouter();
  const [operatorId, setOperatorId] = useState('');
  const [operatorName, setOperatorName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [status, setStatus] = useState<{ message: string; type: 'success' | 'error' | 'info' | '' }>({
    message: '',
    type: '',
  });
  const [sessionCount, setSessionCount] = useState(0);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [closingSession, setClosingSession] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/');
        return;
      }
      setOperatorId(session.user.id);
      setOperatorName(session.user.user_metadata?.full_name || 'Operator');
      await fetchData(session.user.id);
      setTimeout(() => inputRef.current?.focus(), 300);
    };
    init();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [router]);

  const fetchData = useCallback(async (opId: string) => {
    await Promise.all([
      fetchSessionCount(opId),
      fetchActiveSessions(opId)
    ]);
  }, []);

  const fetchSessionCount = useCallback(async (opId: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count } = await supabase
      .from('sorting_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('operator_id', opId)
      .eq('status', 'RUNNING')
      .gte('created_at', today.toISOString());

    setSessionCount(count || 0);
  }, []);

  const fetchActiveSessions = useCallback(async (opId: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('sorting_sessions')
      .select(`
        id,
        session_code,
        created_at,
        master_transporters ( transporter_name )
      `)
      .eq('operator_id', opId)
      .eq('status', 'RUNNING')
      .gte('created_at', today.toISOString())
      .order('created_at', { ascending: false });

    if (!error && data) {
      const sessionsWithCount = await Promise.all(
        data.map(async (s: any) => {
          const { count } = await supabase
            .from('sorting_details')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', s.id);

          return {
            id: s.id,
            session_code: s.session_code,
            transporter_name: s.master_transporters?.transporter_name || 'Unknown',
            total_items: count || 0,
            created_at: s.created_at,
          };
        })
      );
      setActiveSessions(sessionsWithCount);
    }
  }, []);

  const handleCloseSession = async (sessionId: string, sessionCode: string) => {
    const confirm = window.confirm(`Tutup sesi ${sessionCode}?`);
    if (!confirm) return;

    setClosingSession(sessionId);

    try {
      const { error } = await supabase
        .from('sorting_sessions')
        .update({ status: 'CLOSED' })
        .eq('id', sessionId);

      if (error) throw error;

      if (navigator.vibrate) navigator.vibrate([50, 50, 50]);

      setStatus({ 
        message: `✅ Sesi ${sessionCode} berhasil ditutup!`, 
        type: 'success' 
      });

      await fetchData(operatorId);

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setStatus({ message: '', type: '' });
      }, 3000);

    } catch (error) {
      console.error('Error closing session:', error);
      setStatus({ 
        message: '❌ Gagal menutup sesi', 
        type: 'error' 
      });
    } finally {
      setClosingSession(null);
    }
  };

  const handleScan = useCallback(async () => {
    const barcodeValue = barcode.trim();
    if (!barcodeValue) return;

    setLoading(true);
    setStatus({ message: '', type: '' });

    try {
      if (navigator.vibrate) navigator.vibrate(50);

      // CEK DUPLIKAT: Cek apakah resi sudah ada di session MANAPUN (semua session)
      const { data: existingResi, error: checkError } = await supabase
        .from('sorting_details')
        .select('session_id, sorting_sessions(session_code, status)')
        .eq('barcode_resi', barcodeValue)
        .maybeSingle();

      if (checkError) throw checkError;

      // Jika resi sudah ada di session manapun
      if (existingResi) {
        const sessionData = existingResi.sorting_sessions as any;
        const sessionCode = sessionData?.session_code || 'unknown';
        const sessionStatus = sessionData?.status || 'unknown';
        
        setStatus({ 
          message: `❌ Resi ${barcodeValue} sudah discan di session ${sessionCode} (${sessionStatus})`, 
          type: 'error' 
        });
        
        if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
        
        setBarcode('');
        setLoading(false);
        setTimeout(() => inputRef.current?.focus(), 50);
        return;
      }

      // Jika resi belum ada, lanjutkan proses sorting
      const { data, error } = await supabase.rpc('process_auto_sorting', {
        p_barcode: barcodeValue,
        p_operator_id: operatorId,
      });

      if (error) throw error;

      const result = typeof data === 'string' ? JSON.parse(data) : data;

      if (result.success === false) {
        setStatus({ message: result.message, type: 'error' });
        if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
      } else {
        setStatus({ message: `✓ ${result.message}`, type: 'success' });
        await fetchData(operatorId);

        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          setStatus({ message: '', type: '' });
        }, 1500);
      }
    } catch (err: any) {
      setStatus({ message: err.message || 'Error sistem', type: 'error' });
      if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
    } finally {
      setBarcode('');
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [barcode, operatorId, fetchData]);

  // Auto submit for hardware scanner
  useEffect(() => {
    if (barcode.length > 0 && !loading) {
      const timer = setTimeout(() => {
        handleScan();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [barcode, handleScan, loading]);

  return (
    <div className="flex-1 p-4 space-y-4">
      {/* Scanner Card */}
      <div className="bg-slate-800 rounded-3xl p-6 shadow-2xl">
        {/* Scanner Icon */}
        <div className="flex justify-center mb-6">
          <div
            className={`w-24 h-24 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
              status.type === 'success'
                ? 'border-emerald-500 bg-emerald-500/20'
                : status.type === 'error'
                ? 'border-rose-500 bg-rose-500/20'
                : 'border-indigo-500 bg-indigo-500/20'
            }`}
          >
            <svg
              className={`w-12 h-12 transition-colors duration-300 ${
                status.type === 'success'
                  ? 'text-emerald-400'
                  : status.type === 'error'
                  ? 'text-rose-400'
                  : 'text-indigo-400'
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
        </div>

        {/* Counter */}
        <div className="text-center mb-6">
          <p className="text-slate-400 text-xs uppercase tracking-wider">Sesi Aktif Hari Ini</p>
          <p className="text-4xl font-bold text-white mt-1">{sessionCount}</p>
        </div>

        {/* Status Message */}
        {status.message && (
          <div
            className={`p-3 rounded-xl text-center font-medium mb-4 transition-all duration-300 ${
              status.type === 'success'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : status.type === 'error'
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                : 'bg-slate-700 text-slate-300'
            }`}
          >
            {status.message}
          </div>
        )}

        {/* Input Area */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleScan();
          }}
          className="space-y-4"
        >
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              autoFocus
              disabled={loading}
              placeholder="Scan barcode..."
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              className="w-full px-4 py-4 bg-slate-700 text-white text-lg font-mono rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500 disabled:opacity-50"
            />
            {loading && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <svg
                  className="w-5 h-5 animate-spin text-indigo-400"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 active:shadow-indigo-500/50 transition-all duration-200 disabled:opacity-50 text-lg active:scale-95"
          >
            {loading ? 'Memproses...' : 'Scan Resi'}
          </button>
        </form>

        <div className="mt-4 text-center text-xs text-slate-500 font-mono">
          Tekan Enter atau scan untuk memproses
        </div>
      </div>

      {/* Active Sessions Cards */}
      {activeSessions.length > 0 && (
        <div className="space-y-3">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider px-1">
            Sesi Aktif ({activeSessions.length})
          </p>
          
          {activeSessions.map((session) => (
            <div
              key={session.id}
              className="bg-slate-800 rounded-2xl p-4 shadow-2xl border border-slate-700"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-emerald-400 text-xs font-mono font-bold">
                      RUNNING
                    </span>
                  </div>
                  <p className="text-white font-bold text-lg mt-1">
                    {session.session_code}
                  </p>
                  <p className="text-slate-400 text-sm">
                    {session.transporter_name} • {session.total_items} items
                  </p>
                  <p className="text-slate-500 text-xs mt-1">
                    {new Date(session.created_at).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })} WIB
                  </p>
                </div>
                
                <button
                  onClick={() => handleCloseSession(session.id, session.session_code)}
                  disabled={closingSession === session.id}
                  className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 font-bold rounded-xl transition-all duration-200 disabled:opacity-50 text-sm active:scale-95"
                >
                  {closingSession === session.id ? (
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    '🔒 Tutup'
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}