'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function MobileMenuPage() {
  const router = useRouter();
  const [operatorName, setOperatorName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/');
        return;
      }
      setOperatorName(session.user.user_metadata?.full_name || 'Operator');
      setLoading(false);
    };
    init();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-slate-400 text-xs">Selamat datang,</p>
          <p className="text-white text-lg font-bold">{operatorName}</p>
        </div>
        <button
          onClick={handleLogout}
          className="px-3 py-1.5 bg-slate-700 text-slate-300 text-xs font-medium rounded-lg hover:bg-slate-600 transition-colors"
        >
          Logout
        </button>
      </div>

      {/* 2 Menu Utama */}
      <div className="flex-1 flex flex-col gap-4 justify-center">
        <button
          onClick={() => router.push('/mobile/scan')}
          className="bg-slate-800 rounded-3xl p-8 shadow-2xl hover:bg-slate-700 transition-all duration-200 active:scale-95 text-center"
        >
          <div className="text-5xl mb-4">📥</div>
          <h2 className="text-white text-2xl font-bold">Scan Sorting</h2>
          <p className="text-slate-400 text-sm mt-2">Inbound otomatis scan resi</p>
          <div className="mt-4 inline-block px-4 py-1.5 bg-indigo-500/20 text-indigo-400 text-xs font-bold rounded-full">
            FAST SCAN
          </div>
        </button>

        <button
          onClick={() => router.push('/mobile/handover')}
          className="bg-slate-800 rounded-3xl p-8 shadow-2xl hover:bg-slate-700 transition-all duration-200 active:scale-95 text-center"
        >
          <div className="text-5xl mb-4">🚚</div>
          <h2 className="text-white text-2xl font-bold">Scan Handover</h2>
          <p className="text-slate-400 text-sm mt-2">Serah terima dengan kurir</p>
          <div className="mt-4 inline-block px-4 py-1.5 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-full">
            COUNTDOWN
          </div>
        </button>
      </div>

      {/* Footer */}
      <div className="text-center mt-6">
        <p className="text-slate-500 text-xs font-mono">
          COOL MOBILE v2.0
        </p>
      </div>
    </div>
  );
}