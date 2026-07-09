"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface ClosedSession {
  id: string;
  session_code: string;
  transporter_name: string;
  total_items: number;
}

export default function MobileHandoverPage() {
  const router = useRouter();
  const [operatorName, setOperatorName] = useState("");
  const [closedSessions, setClosedSessions] = useState<ClosedSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ClosedSession | null>(null);
  const [barcode, setBarcode] = useState("");
  const [countdown, setCountdown] = useState(0);

  // BA Form Sign
  const [driver, setDriver] = useState("");
  const [nopol, setNopol] = useState("");
  const [securityName, setSecurityName] = useState("");
  const [isFinished, setIsFinished] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ text: "", isError: false });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const getSessionUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.push("/");
      setOperatorName(session.user.user_metadata?.full_name || "Operator");
      fetchClosedSessions();
    };
    getSessionUser();
  }, [router]);

  const fetchClosedSessions = async () => {
    const { data, error } = await supabase
      .from("sorting_sessions")
      .select("id, session_code, master_transporters(transporter_name)")
      .eq("status", "CLOSED");

    if (!error && data) {
      const formatted = await Promise.all(data.map(async (s: any) => {
        const { count } = await supabase
          .from("sorting_details")
          .select("*", { count: "exact", head: true })
          .eq("session_id", s.id)
          .eq("is_validated_handover", false);

        return {
          id: s.id,
          session_code: s.session_code,
          transporter_name: s.master_transporters?.transporter_name || "Unknown",
          total_items: count || 0
        };
      }));
      setClosedSessions(formatted.filter(s => s.total_items > 0));
    }
  };

  const handleSelectSession = (id: string) => {
    const target = closedSessions.find(s => s.id === id) || null;
    setSelectedSession(target);
    setCountdown(target?.total_items || 0);
    setIsFinished(false);
    setStatusMsg({ text: "", isError: false });
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleScanItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanBarcode = barcode.trim().toUpperCase();
    if (!cleanBarcode || !selectedSession) return;

    setStatusMsg({ text: "", isError: false });

    const { data: match, error } = await supabase
      .from("sorting_details")
      .select("id, is_validated_handover")
      .eq("session_id", selectedSession.id)
      .eq("barcode_resi", cleanBarcode)
      .maybeSingle();

    if (error || !match) {
      if (navigator.vibrate) navigator.vibrate([60, 60]);
      setStatusMsg({ text: `❌ RESI SALAH/BUKAN MILIK SESI INI!`, isError: true });
      setBarcode("");
      return;
    }

    if (match.is_validated_handover) {
      setStatusMsg({ text: `⚠️ Resi ini sudah divalidasi sebelumnya.`, isError: true });
      setBarcode("");
      return;
    }

    const { error: updErr } = await supabase
      .from("sorting_details")
      .update({ is_validated_handover: true })
      .eq("id", match.id);

    if (!updErr) {
      if (navigator.vibrate) navigator.vibrate(40);
      const nextCount = countdown - 1;
      setCountdown(nextCount);
      setStatusMsg({ text: `✓ MATCHED: ${cleanBarcode}`, isError: false });
      if (nextCount === 0) setIsFinished(true);
    }
    setBarcode("");
  };

  const submitBeritaAcara = async () => {
    if (!driver || !nopol || !securityName) return alert("Semua kolom isian serah terima wajib diisi!");

    // 1. Tarik detail manifest untuk arsip total
    const { data: details } = await supabase
      .from("sorting_details")
      .select("barcode_resi, scanned_at")
      .eq("session_id", selectedSession?.id);

    if (details) {
      const logs = details.map(d => ({
        session_id: selectedSession?.id,
        session_code: selectedSession?.session_code,
        transporter_name: selectedSession?.transporter_name,
        resi_number: d.barcode_resi,
        sorting_at: d.scanned_at,
        sorting_by: operatorName,
        handover_by: operatorName,
        driver: driver,
        transportation_number: nopol,
        status: "DONE",
        security_sign: securityName,
        driver_sign: driver
      }));
      await supabase.from("history_logs").insert(logs);
    }

    // 2. Lenyapkan sesi aktif dari radar monitoring gawat darurat
    await supabase.from("sorting_sessions").update({ status: "RECONCILED" }).eq("id", selectedSession?.id);

    alert("Sukses! Berita acara disimpan dan card sesi resmi diarsipkan.");
    setSelectedSession(null);
    setIsFinished(false);
    fetchClosedSessions();
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans text-[0.75rem] max-w-md mx-auto p-4 flex flex-col justify-between">
      <div className="space-y-4">
        <header className="flex justify-between items-center bg-slate-800 p-3 rounded-xl border border-slate-700 shadow">
          <div>
            <p className="text-[0.6rem] text-slate-400 font-mono font-bold uppercase tracking-wider">COOL NATIVE APP</p>
            <p className="font-bold text-[0.8rem] text-white">Handover Lapangan</p>
          </div>
          <span className="text-[0.65rem] bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded font-mono font-bold">MOBILE</span>
        </header>

        <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 shadow">
          <label className="block text-slate-400 text-[0.63rem] font-bold uppercase mb-1.5">Pilih Antrean Manifest Closed</label>
          <select 
            onChange={(e) => handleSelectSession(e.target.value)}
            className="w-full p-2.5 bg-slate-700 border border-slate-600 rounded-lg font-mono font-bold text-emerald-400 focus:outline-none"
          >
            <option value="">-- PILIH SESI SIAP SERAH TERIMA --</option>
            {closedSessions.map(s => (
              <option key={s.id} value={s.id}>[{s.transporter_name}] {s.session_code} ({s.total_items} Pcs)</option>
            ))}
          </select>
        </div>

        {selectedSession && (
          <div className="space-y-4">
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 text-center shadow-inner">
              <p className="text-[0.6rem] text-slate-500 font-mono uppercase tracking-widest">Sisa Sesi Monitor Countdown</p>
              <p className="text-[4rem] font-black font-mono tracking-tight text-yellow-400 my-1 leading-none">{countdown}</p>
              <p className="text-[0.68rem] text-slate-400 font-bold font-mono">{selectedSession.session_code}</p>
            </div>

            {statusMsg.text && (
              <div className={`p-2.5 rounded-xl text-center font-bold font-mono ${statusMsg.isError ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"}`}>
                {statusMsg.text}
              </div>
            )}

            {!isFinished ? (
              <form onSubmit={handleScanItem} className="bg-slate-800 p-3 rounded-xl border border-slate-700 flex space-x-2">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Scan resi kurir..."
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  className="flex-1 p-3 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-[0.85rem] focus:outline-none focus:border-indigo-500 placeholder:text-slate-600"
                />
                <button type="submit" className="px-5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 active:scale-95 transition-all">SCAN</button>
              </form>
            ) : (
              <div className="bg-slate-800 p-4 rounded-xl border border-emerald-500/30 space-y-3 shadow-2xl animate-fade-in">
                <p className="font-bold text-emerald-400 text-[0.78rem]">✍️ Isian Berita Acara Handover</p>
                <div className="space-y-2">
                  <input type="text" placeholder="Nama Lengkap Supir/Kurir" value={driver} onChange={(e)=>setDriver(e.target.value)} className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder:text-slate-600" />
                  <input type="text" placeholder="No. Polisi Armada (ex: D 1234 ABC)" value={nopol} onChange={(e)=>setNopol(e.target.value)} className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder:text-slate-600" />
                  <input type="text" placeholder="Nama Security Saksi" value={securityName} onChange={(e)=>setSecurityName(e.target.value)} className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder:text-slate-600" />
                  <button onClick={submitBeritaAcara} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-lg active:scale-95 transition-all text-[0.8rem] tracking-wide mt-2">
                    SUBMIT & ARCHIVE CARD
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <footer className="text-center text-[0.6rem] text-slate-600 font-mono pt-4">COOL SYSTEM V2 &bull; LOGISTICS LAYER</footer>
    </div>
  );
}