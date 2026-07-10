"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import OperatorShell from "@/components/mobile/OperatorShell";
import SignaturePad from "@/components/mobile/SignaturePad";
import { playAcceptedSound, playRejectedSound } from "@/lib/sound";

interface ClosedSession {
  id: string;
  session_code: string;
  transporter_name: string;
  total_items: number;
}

interface RemainingItem {
  id: string;
  barcode_resi: string;
}

type ExceptionReason = "NOT_FOUND" | "CANCELLED";
type Stage = "list" | "scanning" | "exceptions" | "form";

export default function MobileHandoverPage() {
  const router = useRouter();
  const [operatorId, setOperatorId] = useState("");
  const [operatorName, setOperatorName] = useState("");
  const [closedSessions, setClosedSessions] = useState<ClosedSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ClosedSession | null>(null);
  const [remainingItems, setRemainingItems] = useState<RemainingItem[]>([]);
  const [originalTotal, setOriginalTotal] = useState(0);
  const [barcode, setBarcode] = useState("");
  const [stage, setStage] = useState<Stage>("list");
  const [exceptionReasons, setExceptionReasons] = useState<Record<string, ExceptionReason>>({});

  const [driver, setDriver] = useState("");
  const [nopol, setNopol] = useState("");
  const [securityName, setSecurityName] = useState("");
  const [driverSignature, setDriverSignature] = useState<string | null>(null);
  const [securitySignature, setSecuritySignature] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ text: "", isError: false });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const getSessionUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.push("/");

      setOperatorId(session.user.id);

      const { data: userRow } = await supabase
        .from("users")
        .select("full_name")
        .eq("id", session.user.id)
        .single();

      setOperatorName(userRow?.full_name || "Operator");
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

  const handleSelectSession = async (session: ClosedSession) => {
    setSelectedSession(session);
    setStatusMsg({ text: "", isError: false });
    setExceptionReasons({});
    setDriverSignature(null);
    setSecuritySignature(null);
    setStage("scanning");

    const { data } = await supabase
      .from("sorting_details")
      .select("id, barcode_resi")
      .eq("session_id", session.id)
      .eq("is_validated_handover", false);

    const items = data || [];
    setRemainingItems(items);
    setOriginalTotal(items.length);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleBackToList = () => {
    setSelectedSession(null);
    setRemainingItems([]);
    setStage("list");
    fetchClosedSessions();
  };

  const handleScanItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanBarcode = barcode.trim().toUpperCase();
    if (!cleanBarcode || !selectedSession) return;

    setStatusMsg({ text: "", isError: false });

    const target = remainingItems.find(
      (item) => item.barcode_resi.toUpperCase() === cleanBarcode
    );

    if (!target) {
      if (navigator.vibrate) navigator.vibrate([60, 60]);
      playRejectedSound();
      setStatusMsg({ text: "Resi salah / bukan milik sesi ini, atau sudah pernah discan.", isError: true });
      setBarcode("");
      return;
    }

    const { error: updErr } = await supabase
      .from("sorting_details")
      .update({ is_validated_handover: true })
      .eq("id", target.id);

    if (!updErr) {
      if (navigator.vibrate) navigator.vibrate(40);
      playAcceptedSound();
      setRemainingItems((prev) => prev.filter((item) => item.id !== target.id));
      setStatusMsg({ text: `Cocok: ${cleanBarcode}`, isError: false });
    } else {
      playRejectedSound();
    }
    setBarcode("");
  };

  const handleFinishClick = () => {
    if (remainingItems.length === 0) {
      setStage("form");
    } else {
      setStage("exceptions");
    }
  };

  const setReason = (id: string, reason: ExceptionReason) => {
    setExceptionReasons((prev) => ({ ...prev, [id]: reason }));
  };

  const allReasonsFilled = remainingItems.every((item) => exceptionReasons[item.id]);

  const submitBeritaAcara = async () => {
    if (!driver || !nopol || !securityName || !driverSignature || !securitySignature) {
      alert("Nama kurir, nopol, nama security, dan KEDUA tanda tangan wajib diisi!");
      return;
    }

    setSubmitting(true);

    const { data: details } = await supabase
      .from("sorting_details")
      .select("id, barcode_resi, scanned_at, is_validated_handover")
      .eq("session_id", selectedSession?.id);

    const exceptionCount = Object.keys(exceptionReasons).length;
    const matchedCount = (details?.length || 0) - exceptionCount;

    if (details) {
      const logs = details.map((d) => {
        let status = "DONE";
        if (!d.is_validated_handover) {
          const reason = exceptionReasons[d.id];
          status = reason === "CANCELLED" ? "CANCEL" : "TIDAK DITEMUKAN";
        }
        return {
          session_id: selectedSession?.id,
          session_code: selectedSession?.session_code,
          transporter_name: selectedSession?.transporter_name,
          resi_number: d.barcode_resi,
          sorting_at: d.scanned_at,
          sorting_by: operatorName,
          handover_by: operatorName,
          driver,
          transportation_number: nopol,
          status,
          security_sign: securityName,
          driver_sign: driver,
        };
      });
      await supabase.from("history_logs").insert(logs);

      const exceptionEntries = details.filter((d) => !d.is_validated_handover);
      for (const item of exceptionEntries) {
        await supabase
          .from("sorting_details")
          .update({
            is_validated_handover: true,
            discrepancy_reason: exceptionReasons[item.id] || "NOT_FOUND",
          })
          .eq("id", item.id);
      }
    }

    await supabase.from("handover_manifests").insert({
      session_id: selectedSession?.id,
      courier_name: driver,
      security_name: securityName,
      courier_signature: driverSignature,
      security_signature: securitySignature,
      total_packages_handed: matchedCount,
      total_discrepancy: exceptionCount,
      handover_by: operatorId,
    });

    await supabase.from("sorting_sessions").update({ status: "RECONCILED" }).eq("id", selectedSession?.id);

    setSubmitting(false);
    alert("Sukses! Berita acara & manifest handover tersimpan, sesi resmi diarsipkan.");

    setSelectedSession(null);
    setRemainingItems([]);
    setExceptionReasons({});
    setStage("list");
    setDriver("");
    setNopol("");
    setSecurityName("");
    setDriverSignature(null);
    setSecuritySignature(null);
    fetchClosedSessions();
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
            Handover
          </span>
        </div>

        {stage === "list" && (
          <div className="space-y-2">
            <p className="text-stone-500 text-xs uppercase font-bold tracking-widest px-1">
              Antrean Serah Terima ({closedSessions.length})
            </p>
            {closedSessions.length === 0 ? (
              <div className="p-8 bg-white border-2 border-dashed border-stone-300 rounded-2xl text-center text-stone-500 text-sm">
                Belum ada sesi yang siap diserahterimakan.
              </div>
            ) : (
              closedSessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleSelectSession(s)}
                  className="w-full text-left bg-white p-4 rounded-2xl border-l-4 border-l-orange-500 border border-stone-200 shadow-sm active:scale-[0.98] transition-transform"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-base font-extrabold text-stone-900 font-mono">{s.session_code}</span>
                    <span className="text-orange-700 font-bold font-mono text-sm">{s.total_items} Pcs</span>
                  </div>
                  <p className="text-stone-600 text-xs mt-1 font-medium">Kurir: {s.transporter_name}</p>
                </button>
              ))
            )}
          </div>
        )}

        {stage === "scanning" && selectedSession && (
          <div className="space-y-4">
            <button onClick={handleBackToList} className="text-stone-500 text-xs font-bold flex items-center gap-1">
              ← Kembali ke daftar
            </button>

            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm text-center">
              <p className="text-[0.65rem] text-stone-400 font-bold uppercase tracking-widest">Sesi</p>
              <p className="text-lg font-extrabold text-stone-900 font-mono">{selectedSession.session_code}</p>
              <p className="text-stone-500 text-xs mt-1">{selectedSession.transporter_name}</p>
              <p className="text-4xl font-black font-mono text-orange-600 my-2">{remainingItems.length}</p>
              <p className="text-stone-400 text-[11px]">dari {originalTotal} resi belum discan</p>
            </div>

            {statusMsg.text && (
              <div className={`p-3 rounded-xl text-center font-bold text-sm border-2 ${
                statusMsg.isError
                  ? "bg-rose-50 text-rose-800 border-rose-300"
                  : "bg-emerald-50 text-emerald-800 border-emerald-300"
              }`}>
                {statusMsg.text}
              </div>
            )}

            <form onSubmit={handleScanItem} className="bg-white p-3 rounded-2xl border border-stone-200 shadow-sm flex gap-2">
              <input
                ref={inputRef}
                type="text"
                placeholder="Scan resi kurir..."
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="flex-1 px-4 py-3 bg-stone-50 border-2 border-stone-300 rounded-xl text-stone-900 font-mono text-base font-semibold focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100 placeholder:text-stone-400"
              />
              <button type="submit" className="px-5 bg-orange-600 hover:bg-orange-700 text-white font-extrabold rounded-xl active:scale-95 transition-all uppercase text-sm">
                Scan
              </button>
            </form>

            <div className="space-y-1.5">
              <p className="text-stone-500 text-xs uppercase font-bold tracking-widest px-1">Belum Discan</p>
              {remainingItems.length === 0 ? (
                <div className="p-4 bg-emerald-50 border-2 border-emerald-200 rounded-xl text-center text-emerald-700 text-sm font-bold">
                  Semua resi sudah discan.
                </div>
              ) : (
                <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                  {remainingItems.map((item) => (
                    <div key={item.id} className="bg-white border border-stone-200 rounded-lg px-3 py-2 font-mono text-sm text-stone-700 font-semibold">
                      {item.barcode_resi}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleFinishClick}
              className="w-full py-4 bg-stone-900 hover:bg-stone-800 text-white font-extrabold rounded-xl text-sm tracking-wide uppercase active:scale-[0.98] transition-all"
            >
              Selesaikan Serah Terima
            </button>
          </div>
        )}

        {stage === "exceptions" && selectedSession && (
          <div className="space-y-4">
            <button onClick={() => setStage("scanning")} className="text-stone-500 text-xs font-bold flex items-center gap-1">
              ← Kembali scan
            </button>

            <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4">
              <p className="text-amber-800 font-bold text-sm">
                Masih ada {remainingItems.length} resi belum discan. Tandai alasannya per resi sebelum lanjut.
              </p>
            </div>

            <div className="space-y-2">
              {remainingItems.map((item) => (
                <div key={item.id} className="bg-white border border-stone-200 rounded-xl p-3">
                  <p className="font-mono font-bold text-stone-900 text-sm mb-2">{item.barcode_resi}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setReason(item.id, "NOT_FOUND")}
                      className={`flex-1 py-2.5 rounded-lg text-xs font-bold border-2 transition-colors ${
                        exceptionReasons[item.id] === "NOT_FOUND"
                          ? "bg-amber-500 text-white border-amber-500"
                          : "bg-white text-stone-500 border-stone-300"
                      }`}
                    >
                      Tidak Ditemukan
                    </button>
                    <button
                      onClick={() => setReason(item.id, "CANCELLED")}
                      className={`flex-1 py-2.5 rounded-lg text-xs font-bold border-2 transition-colors ${
                        exceptionReasons[item.id] === "CANCELLED"
                          ? "bg-rose-600 text-white border-rose-600"
                          : "bg-white text-stone-500 border-stone-300"
                      }`}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setStage("form")}
              disabled={!allReasonsFilled}
              className="w-full py-4 bg-orange-600 hover:bg-orange-700 disabled:bg-stone-300 disabled:cursor-not-allowed text-white font-extrabold rounded-xl text-sm tracking-wide uppercase active:scale-[0.98] transition-all"
            >
              Lanjut ke Berita Acara
            </button>
          </div>
        )}

        {stage === "form" && selectedSession && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border-2 border-emerald-300 shadow-sm space-y-4">
              <div>
                <p className="font-extrabold text-stone-900 text-sm">Isian Berita Acara Handover</p>
                <p className="text-stone-500 text-xs">{selectedSession.session_code} · {selectedSession.transporter_name}</p>
              </div>

              {remainingItems.length > 0 && (
                <div className="bg-amber-50 border border-amber-300 rounded-lg px-3 py-2 text-xs text-amber-800 font-semibold">
                  {remainingItems.length} resi diarsipkan sebagai exception (tidak ditemukan/cancel).
                </div>
              )}

              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Nama Lengkap Supir/Kurir"
                  value={driver}
                  onChange={(e) => setDriver(e.target.value)}
                  className="w-full px-4 py-3 bg-stone-50 border-2 border-stone-300 rounded-xl text-stone-900 font-medium focus:outline-none focus:border-orange-500 placeholder:text-stone-400"
                />
                <input
                  type="text"
                  placeholder="No. Polisi Armada (ex: D 1234 ABC)"
                  value={nopol}
                  onChange={(e) => setNopol(e.target.value)}
                  className="w-full px-4 py-3 bg-stone-50 border-2 border-stone-300 rounded-xl text-stone-900 font-medium focus:outline-none focus:border-orange-500 placeholder:text-stone-400"
                />
                <input
                  type="text"
                  placeholder="Nama Security Saksi"
                  value={securityName}
                  onChange={(e) => setSecurityName(e.target.value)}
                  className="w-full px-4 py-3 bg-stone-50 border-2 border-stone-300 rounded-xl text-stone-900 font-medium focus:outline-none focus:border-orange-500 placeholder:text-stone-400"
                />
              </div>

              <SignaturePad label="Tanda Tangan Kurir" onChange={setDriverSignature} />
              <SignaturePad label="Tanda Tangan Security" onChange={setSecuritySignature} />

              <button
                onClick={submitBeritaAcara}
                disabled={submitting}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-extrabold rounded-xl shadow-lg shadow-emerald-600/25 active:scale-[0.98] transition-all text-sm tracking-wide uppercase"
              >
                {submitting ? "Menyimpan..." : "Submit & Arsipkan"}
              </button>
            </div>
          </div>
        )}

        <footer className="text-center text-[11px] text-stone-400 font-mono font-semibold pt-2">
          COOL SYSTEM V2 · LOGISTICS LAYER
        </footer>
      </div>
    </OperatorShell>
  );
}