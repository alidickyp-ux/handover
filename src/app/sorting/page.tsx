"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import OperatorShell from "@/components/mobile/OperatorShell";
import { playAcceptedSound, playRejectedSound } from "@/lib/sound";

interface ActiveSession {
  id: string;
  session_code: string;
  transporter_name: string;
  operator_name: string;
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

  useEffect(() => {
    const initSorting = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.push("/");

      setOperatorId(session.user.id);

      const { data: userRow } = await supabase
        .from("users")
        .select("full_name")
        .eq("id", session.user.id)
        .single();

      setOperatorName(userRow?.full_name || "Operator");
      await fetchLiveSessions();

      setTimeout(() => inputRef.current?.focus(), 200);
    };
    initSorting();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [router]);

  const fetchLiveSessions = useCallback(async () => {
    const { data, error } = await supabase
      .from("sorting_sessions")
      .select(`
        id,
        session_code,
        created_at,
        master_transporters ( transporter_name ),
        users ( full_name )
      `)
      .eq("status", "RUNNING")
      .order("created_at", { ascending: false });

    if (error) {
      console.error('Error fetch sessions:', error);
      return;
    }

    if (data) {
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
            operator_name: s.users?.full_name || "Unknown",
            total_items: count || 0,
            created_at: s.created_at,
          };
        })
      );
      setActiveSessions(formatted);
    }
  }, []);

  const handleScanSorting = async () => {
    const cleanBarcode = barcode.trim();
    if (!cleanBarcode) return;

    setLoading(true);
    setStatusMsg({ text: "", type: "" });

    try {
      if (navigator.vibrate) navigator.vibrate(40);

      const { data: duplicate, error: checkErr } = await supabase
        .from("sorting_details")
        .select(`session_id, sorting_sessions ( session_code, status )`)
        .eq("barcode_resi", cleanBarcode)
        .maybeSingle();

      if (checkErr) throw checkErr;

      if (duplicate) {
        const sessionInfo = duplicate.sorting_sessions as any;
        if (navigator.vibrate) navigator.vibrate([60, 60]);
        playRejectedSound();
        setStatusMsg({
          text: `RESI DUPLIKAT — sudah ada di sesi ${sessionInfo?.session_code || "unknown"} (${sessionInfo?.status || "unknown"})`,
          type: "error"
        });
        setBarcode("");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.rpc("process_auto_sorting", {
        p_barcode: cleanBarcode,
        p_operator_id: operatorId
      });

      if (error) throw error;
      const result = typeof data === "string" ? JSON.parse(data) : data;

      if (result.success === false) {
        if (navigator.vibrate) navigator.vibrate([60, 60]);
        playRejectedSound();
        setStatusMsg({ text: result.message, type: "error" });
      } else {
        playAcceptedSound();
        setStatusMsg({ text: result.message, type: "success" });
        await fetchLiveSessions();
      }

    } catch (err: any) {
      playRejectedSound();
      setStatusMsg({ text: err.message || "Sistem error database", type: "error" });
    } finally {
      setBarcode("");
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  };

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
      setStatusMsg({ text: `Sesi ${code} resmi di-close.`, type: "info" });
      await fetchLiveSessions();
    }
    setClosingSessionId(null);
  };

  return (
    <OperatorShell>
      <div className="p-4 space-y-4">

        <div className="flex justify-between items-center px-1">
          <div>
            <p className="text-[0.65rem] text-stone-400 font-bold uppercase tracking-widest">Ops</p>
            <p className="font-extrabold text-lg text-stone-900 leading-tight">{operatorName}</p>
          </div>
          <span className="text-xs bg-orange-100 text-orange-700 border border-orange-200 px-3 py-1.5 rounded-lg font-bold uppercase tracking-wide">
            Sorting
          </span>
        </div>

        {statusMsg.text && (
          <div className={`p-4 rounded-2xl border-2 font-bold text-sm ${
            statusMsg.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-300" :
            statusMsg.type === "error" ? "bg-rose-50 text-rose-800 border-rose-300" :
            "bg-sky-50 text-sky-800 border-sky-300"
          }`}>
            {statusMsg.type === "success" && "✓ "}
            {statusMsg.type === "error" && "✕ "}
            {statusMsg.text}
          </div>
        )}

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
          <form onSubmit={(e) => { e.preventDefault(); handleScanSorting(); }} className="space-y-3">
            <label className="block text-stone-500 font-bold uppercase text-xs tracking-widest">
              Arahkan laser / tembak barcode paket
            </label>
            <input
              ref={inputRef}
              type="text"
              autoFocus
              disabled={loading}
              placeholder="Scan resi (JX..., SPXID...)"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              className="w-full px-4 py-4 bg-stone-50 border-2 border-stone-300 rounded-xl text-stone-900 font-mono text-lg font-semibold focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100 placeholder:text-stone-400 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white font-extrabold rounded-xl text-base tracking-wide shadow-lg shadow-orange-600/25 active:scale-[0.98] transition-all uppercase disabled:opacity-60"
            >
              {loading ? "Menyimpan..." : "Proses Scan Masuk"}
            </button>
          </form>
        </div>

        <div className="space-y-2">
          <p className="text-stone-500 text-xs uppercase font-bold tracking-widest px-1">
            Sesi Running Terbuka ({activeSessions.length})
          </p>
          {activeSessions.length === 0 ? (
            <div className="p-8 bg-white border-2 border-dashed border-stone-300 rounded-2xl text-center text-stone-500 text-sm">
              Belum ada kantong sortir terbuka.<br/>Tembak resi pertama untuk memulai sesi otomatis.
            </div>
          ) : (
            <div className="space-y-2">
              {activeSessions.map((s) => (
                <div key={s.id} className="bg-white p-4 rounded-2xl border-l-4 border-l-orange-500 border border-stone-200 shadow-sm flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span className="text-base font-extrabold text-stone-900 font-mono truncate">{s.session_code}</span>
                    </div>
                    <p className="text-stone-600 text-xs mt-1 font-medium">
                      Kurir: <span className="text-stone-900 font-bold">{s.transporter_name}</span>
                      {" · "}
                      <span className="text-orange-700 font-bold font-mono">{s.total_items} Pcs</span>
                    </p>
                    <p className="text-stone-400 text-[11px] mt-0.5">
                      Dibuka oleh: <span className="text-stone-600 font-semibold">{s.operator_name}</span>
                    </p>
                  </div>

                  <button
                    onClick={() => handleLockSession(s.id, s.session_code)}
                    disabled={closingSessionId === s.id}
                    className="shrink-0 px-4 py-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold rounded-xl transition-colors text-xs active:scale-95"
                  >
                    {closingSessionId === s.id ? "..." : "Close"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <footer className="text-center text-[11px] text-stone-400 font-mono font-semibold pt-2">
          COOL SYSTEM V2 · ROUTING ENGINE
        </footer>
      </div>
    </OperatorShell>
  );
}