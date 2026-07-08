'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function MobileMenuPage() {
  const router = useRouter();
  const [operatorName, setOperatorName] = useState('');
  const [sessionCount, setSessionCount] = useState(0);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/');
        return;
      }
      setOperatorName(session.user.user_metadata?.full_name || 'Operator');
      await fetchSessionCount(session.user.id);
    };
    init();
  }, [router]);

  const fetchSessionCount = async (opId: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { count } = await supabase
      .from('sorting_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('operator_id', opId)
      .eq('status', 'RUNNING')
      .gte('created_at', today.toISOString());

    setSessionCount(count || 0);
  };

  return (
    <div className="flex-1 p-4 flex flex-col justify-center">
      {/* Profile Card */}
      <div className="bg-slate-800 rounded-3xl p-6 shadow-2xl mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-indigo-500/30">
            {operatorName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-slate-400 text-xs uppercase tracking-wider">Operator</p>
            <p className="text-white text-lg font-bold">{operatorName}</p>
            <p className="text-slate-500 text-xs font-mono">
              Sesi aktif hari ini: <span className="text-indigo-400 font-bold">{sessionCount}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Menu Grid */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => router.push('/mobile/scan')}
          className="bg-slate-800 rounded-3xl p-6 shadow-2xl hover:bg-slate-700 transition-all duration-200 text-left active:scale-95"
        >
          <div className="text-4xl mb-3">📥</div>
          <h3 className="text-white font-bold text-sm">Scan Sorting</h3>
          <p className="text-slate-400 text-xs mt-1">Inbound otomatis</p>
          <div className="mt-3 inline-block px-3 py-1 bg-indigo-500/20 text-indigo-400 text-[10px] font-bold rounded-full">
            FAST SCAN
          </div>
        </button>

        <button
          onClick={() => router.push('/mobile/handover')}
          className="bg-slate-800 rounded-3xl p-6 shadow-2xl hover:bg-slate-700 transition-all duration-200 text-left active:scale-95"
        >
          <div className="text-4xl mb-3">🚚</div>
          <h3 className="text-white font-bold text-sm">Scan Handover</h3>
          <p className="text-slate-400 text-xs mt-1">Serah terima kurir</p>
          <div className="mt-3 inline-block px-3 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-full">
            COUNTDOWN
          </div>
        </button>
      </div>

      {/* Footer Info */}
      <div className="mt-8 text-center">
        <p className="text-slate-500 text-xs font-mono">
          COOL MOBILE v2.0 • Lapangan
        </p>
      </div>
    </div>
  );
}