"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function MenuPage() {
  const router = useRouter();
  const [operatorName, setOperatorName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.push("/");

      const { data: userRow } = await supabase
        .from("users")
        .select("full_name")
        .eq("id", session.user.id)
        .single();

      setOperatorName(userRow?.full_name || "Operator");
      setLoading(false);
    };
    init();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-slate-400 text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col max-w-md mx-auto px-6 py-10">
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <div>
          <p className="text-[0.6rem] text-slate-400 font-mono font-bold uppercase tracking-wider">COOL NATIVE APP</p>
          <p className="text-white font-semibold text-base mt-0.5">Halo, {operatorName}</p>
        </div>
        <button
          onClick={handleLogout}
          className="px-3 py-1.5 bg-rose-500/20 text-rose-400 text-xs font-medium rounded-lg hover:bg-rose-500/30 transition-colors"
        >
          Logout
        </button>
      </div>

      <p className="text-slate-500 text-xs mb-10">Pilih aktivitas yang ingin dijalankan</p>

      {/* Pilihan menu */}
      <div className="flex flex-col gap-4">
        <button
          onClick={() => router.push("/sorting")}
          className="bg-slate-800 border border-slate-700 rounded-2xl p-6 text-left hover:border-indigo-500 active:scale-[0.98] transition-all"
        >
          <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="text-white font-semibold text-base">Sorting</div>
          <div className="text-slate-400 text-xs mt-1">Scan &amp; sortir resi masuk</div>
        </button>

        <button
          onClick={() => router.push("/handover")}
          className="bg-slate-800 border border-slate-700 rounded-2xl p-6 text-left hover:border-emerald-500 active:scale-[0.98] transition-all"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
          <div className="text-white font-semibold text-base">Handover</div>
          <div className="text-slate-400 text-xs mt-1">Serah terima ke kurir</div>
        </button>
      </div>

      <footer className="text-center text-[0.6rem] text-slate-600 font-mono mt-auto pt-10">
        COOL SYSTEM V2 &bull; ROUTING ENGINE
      </footer>
    </div>
  );
}