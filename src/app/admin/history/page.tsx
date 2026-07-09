"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface HistoryLog {
  id: string;
  session_code: string;
  transporter_name: string;
  resi_number: string;
  sorting_at: string;
  sorting_by: string;
  handover_at: string;
  handover_by: string;
  driver: string;
  transportation_number: string;
  status: string;
}

export default function HistorySupervisiPage() {
  const [logs, setLogs] = useState<HistoryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchHistory = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("history_logs")
      .select("*")
      .order("handover_at", { ascending: false });

    if (!error && data) setLogs(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Fungsi Export CSV bawaan browser (Clean & Ringan)
  const downloadCSV = () => {
    if (logs.length === 0) return;
    const headers = ["Session Code,Transporter,Resi,Sorting At,Sorting By,Handover At,Handover By,Driver,No Polisi,Status\n"];
    const rows = logs.map(l => 
      `"${l.session_code}","${l.transporter_name}","${l.resi_number}","${l.sorting_at}","${l.sorting_by}","${l.handover_at}","${l.handover_by}","${l.driver}","${l.transportation_number}","${l.status}"`
    ).join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `COOL_History_Export_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
  };

  const filteredLogs = logs.filter(l => 
    l.resi_number.toLowerCase().includes(search.toLowerCase()) ||
    l.session_code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 bg-white min-h-screen font-sans text-[0.75rem] text-gray-700">
      <header className="flex justify-between items-center border-b border-gray-200 pb-4 mb-4">
        <div>
          <h1 className="text-[1rem] font-bold text-gray-900 tracking-tight">COOL Control Tower &bull; History Logs</h1>
          <p className="text-gray-400 text-[0.7rem]">Arsip final rekonsiliasi paket sorting dan serah terima kurir lapangan.</p>
        </div>
        <div className="flex space-x-2">
          <input 
            type="text" 
            placeholder="Cari nomor resi / sesi..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded focus:outline-none"
          />
          <button onClick={downloadCSV} className="px-3 py-1.5 bg-gray-900 text-white font-medium rounded hover:bg-gray-800 transition-colors">
            📥 Export CSV
          </button>
        </div>
      </header>

      <div className="border border-gray-200 rounded overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold text-[0.68rem] uppercase tracking-wider">
              <th className="p-2.5 pl-4">Kode Sesi</th>
              <th className="p-2.5">Ekspedisi</th>
              <th className="p-2.5">No. Resi</th>
              <th className="p-2.5">Sorting By</th>
              <th className="p-2.5">Handover By</th>
              <th className="p-2.5">Kurir Driver</th>
              <th className="p-2.5">No. Polisi</th>
              <th className="p-2.5 pr-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {loading ? (
              <tr><td colSpan={8} className="p-8 text-center text-gray-400">Menghubungkan ke database pusat...</td></tr>
            ) : filteredLogs.length === 0 ? (
              <tr><td colSpan={8} className="p-8 text-center text-gray-400">Tidak ada riwayat transaksi yang ditemukan.</td></tr>
            ) : (
              filteredLogs.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-2.5 pl-4 font-mono font-bold text-indigo-600">{l.session_code}</td>
                  <td className="p-2.5 font-medium">{l.transporter_name}</td>
                  <td className="p-2.5 font-mono text-gray-900">{l.resi_number}</td>
                  <td className="p-2.5 text-gray-500">{l.sorting_by}</td>
                  <td className="p-2.5 text-gray-500">{l.handover_by}</td>
                  <td className="p-2.5 font-medium text-gray-800">{l.driver}</td>
                  <td className="p-2.5 font-mono text-gray-400">{l.transportation_number}</td>
                  <td className="p-2.5 text-center pr-4">
                    <span className="px-1.5 py-0.5 rounded text-[0.63rem] font-mono bg-emerald-50 text-emerald-600 border border-emerald-100">
                      {l.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}