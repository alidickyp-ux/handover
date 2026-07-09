"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface ActiveSession {
  id: string;
  session_code: string;
  transporter_name: string;
  total_items: number;
  created_at: string;
}

export default function MobileSortingPage() {
  const router = useRouter();
  const [operatorId, setOperatorId] = useState("");
  const [operatorName, setOperatorName] = useState("");
  const [barcode, setBarcode] = useState("");
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [closingSessionId, setClosingSessionId] = useState<string | null>(null);

  const [statusMsg, setStatusMsg] = useState({ text: "", type: "" });
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Inisialisasi Operator & Data Sesi
  useEffect(() => {
    const initSorting = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.push("/");

      setOperatorId(session.user.id);
      setOperatorName(session.user.user_metadata?.full_name || "Operator");
      await fetchLiveSessions(session.user.id);
      
      // Auto-focus konstan untuk Android Scanner Gun
      setTimeout(() => inputRef.current?.focus(), 200);
    };
    initSorting();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [router]);

  // Ambil data manifest berjalan hari ini
  const fetchLiveSessions = useCallback(async (opId: string) => {
    const currentOpId = opId || operatorId;
    if (!currentOpId) return;

    const { data, error } = await supabase
      .from("sorting_sessions")
      .select(`
        id,
        session_code,
        created_at,
        master_transporters ( transporter_name )
      `)
      .eq("operator_id", currentOpId)
      .eq("status", "RUNNING")
      .gte("created_at", new Date().toISOString().split('T')[0] + 'T00:00:00.000Z')
      .order("created_at", { ascending: false });

    if (!error && data) {
      const formatted = await Promise.all(
        data.map(async (s: any) => {
          const { count } = await supabase
            .from("sorting_details")
            .select("*", { count: "exact", head: true })
            .eq("session_id", s.id);

          return {
            id: s.id,
            session_code: s.session_code,
            transporter_name: s.master_transporters?.transporter_name || "Unknown",
            total_items: count || 0,
            created_at: s.created_at,
          };
        })
      );
      setActiveSessions(formatted);
    }
  }, [operatorId]);

  // Eksekusi Scan Utama (Panggil RPC Database)
  const handleScanSorting = async () => {
    const cleanBarcode = barcode.trim();
    if (!cleanBarcode) return;

    setLoading(true);
    setStatusMsg({ text: "", type: "" });

    try {
      if (navigator.vibrate) navigator.vibrate(40);

      // 1. Validasi Duplikat Global
      const { data: duplicate, error: checkErr } = await supabase
        .from("sorting_details")
        .select(`session_id, sorting_sessions ( session_code, status )`)
        .eq("barcode_resi", cleanBarcode)
        .maybeSingle();

      if (checkErr) throw checkErr;

      if (duplicate) {
        const sessionInfo = duplicate.sorting_sessions as any;
        if (navigator.vibrate) navigator.vibrate([60, 60]);
        setStatusMsg({
          text: `❌ RESI DUPLIKAT! Sudah ada di sesi ${sessionInfo?.session_code || "unknown"} (${sessionInfo?.status || "unknown"})`,
          type: "error"
        });
        setBarcode("");
        setLoading(false);
        return;
      }

      // 2. Tembak ke RPC Auto Prefix Router
      const { data, error } = await supabase.rpc("process_auto_sorting", {
        p_barcode: cleanBarcode,
        p_operator_id: operatorId
      });

      if (error) throw error;
      const result = typeof data === "string" ? JSON.parse(data) : data;

      if (result.success === false) {
        if (navigator.vibrate) navigator.vibrate([60, 60]);
        setStatusMsg({ text: result.message, type: "error" });
      } else {
        setStatusMsg({ text: `✓ ${result.message}`, type: "success" });
        await fetchLiveSessions(operatorId);
      }

    } catch (err: any) {
      setStatusMsg({ text: err.message || "Sistem error database", type: "error" });
    } finally {
      setBarcode("");
      setLoading(false);
      // Jaga focus kembali ke kolom agar siap scan paket selanjutnya
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  };

  // Kunci Sesi (Pindah Status ke CLOSED agar masuk antrean Handover)
  const handleLockSession = async (id: string, code: string) => {
    const ask = window.confirm(`Kunci & Close sesi ${code}?\nData akan dipindahkan ke bagian serah terima Handover.`);
    if (!ask) return;

    setClosingSessionId(id);
    const { error } = await supabase
      .from("sorting_sessions")
      .update({ status: "CLOSED" })
      .eq("id", id);

    if (!error) {
      if (navigator.vibrate) navigator.vibrate([40, 40]);
      setStatusMsg({ text: `🔒 Sesi ${code} resmi di-CLOSE!`, type: "info" });
      await fetchLiveSessions(operatorId);
    }
    setClosingSessionId(null);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans text-[0.75rem] max-w-md mx-auto p-4 flex flex-col justify-between">
      <div className="space-y-4">
        {/* APP BAR STATUS */}
        <header className="flex justify-between items-center bg-slate-800 p-3 rounded-xl border border-slate-700 shadow">
          <div>
            <p className="text-[0.6rem] text-slate-400 font-mono font-bold uppercase tracking-wider">COOL NATIVE APP</p>
            <p className="font-bold text-[0.8rem] text-white">Ops: {operatorName}</p>
          </div>
          <span className="text-[0.65rem] bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded font-mono font-bold">SORTING</span>
        </header>

        {/* NOTIFIKASI LIVE SCAN */}
        {statusMsg.text && (
          <div className={`p-3 rounded-xl text-center font-bold font-mono transition-all border ${
            statusMsg.type === "success" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
            statusMsg.type === "error" ? "bg-rose-500/20 text-rose-400 border-rose-500/30" : "bg-blue-500/20 text-blue-400 border-blue-500/30"
          }`}>
            {statusMsg.text}
          </div>
        )}

        {/* INPUT HARDWARE SCANNER BOX */}
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-2xl">
          <form onSubmit={(e) => { e.preventDefault(); handleScanSorting(); }} className="space-y-2">
            <label className="block text-slate-400 font-bold uppercase text-[0.63rem] tracking-wider">Arahkan Laser / Tembak Barcode Paket</label>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                autoFocus
                disabled={loading}
                placeholder="Scan resi (JX..., SPXID...)"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="w-full p-3.5 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-[0.9rem] focus:outline-none focus:border-indigo-500 placeholder:text-slate-700 disabled:opacity-50"
              />
            </div>
            <button type="submit" disabled={loading} className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold rounded-lg text-[0.8rem] tracking-wide shadow active:scale-95 transition-all uppercase">
              {loading ? "Menyimpan Data..." : "Proses Scan Masuk"}
            </button>
          </form>
        </div>

        {/* REAL-TIME SESSION COUNTER CARDS */}
        <div className="space-y-2">
          <p className="text-slate-500 text-[0.65rem] uppercase font-bold tracking-wider px-1">Sesi Running Terbuka ({activeSessions.length})</p>
          {activeSessions.length === 0 ? (
            <div className="p-6 bg-slate-950 border border-dashed border-slate-800 rounded-xl text-center text-slate-500">
              Belum ada kantong sortir terbuka. Tembak resi pertama untuk memicu pembuatan sesi otomatis.
            </div>
          ) : (
            <div className="space-y-2">
              {activeSessions.map((s) => (
                <div key={s.id} className="bg-slate-800 p-3 rounded-xl border border-slate-700 shadow flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="text-[0.8rem] font-bold text-white font-mono">{s.session_code}</span>
                    </div>
                    <p className="text-slate-400 text-[0.65rem] mt-0.5 font-medium">
                      Kurir: <span className="text-slate-200 font-bold">{s.transporter_name}</span> &bull; Terkumpul: <span className="text-yellow-400 font-bold font-mono text-[0.75rem]">{s.total_items} Pcs</span>
                    </p>
                  </div>
                  
                  <button
                    onClick={() => handleLockSession(s.id, s.session_code)}
                    disabled={closingSessionId === s.id}
                    className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-400 font-bold rounded-lg transition-colors text-[0.68rem]"
                  >
                    {closingSessionId === s.id ? "..." : "🔒 Close"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <footer className="text-center text-[0.6rem] text-slate-600 font-mono pt-4">COOL SYSTEM V2 &bull; ROUTING ENGINE</footer>
    </div>
  );
}