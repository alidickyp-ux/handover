'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import ToastContainer from '@/components/common/ToastContainer';
import { supabase } from '@/lib/supabase';

export default function SecurityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, isSecurity } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/');
      } else if (!isSecurity) {
        router.push('/sorting');
      }
    }
  }, [user, loading, isSecurity, router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col max-w-md mx-auto">
      <ToastContainer />
      
      <div className="bg-slate-800 px-4 py-2 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-white text-xs font-medium">🔒 Security Mode</span>
        </div>
        <div className="flex items-center gap-2 text-slate-400 text-xs">
          <span className="font-mono">{new Date().toLocaleTimeString()}</span>
        </div>
        <button
          onClick={handleLogout}
          className="px-2 py-1 bg-rose-500/20 text-rose-400 text-xs font-medium rounded-lg hover:bg-rose-500/30 transition-colors"
        >
          Logout
        </button>
      </div>

      <div className="flex-1">{children}</div>

      <div className="bg-slate-800 border-t border-slate-700 p-3 text-center">
        <p className="text-slate-500 text-[10px] font-mono">
          🔒 COOL SYSTEM • SECURITY MODE • Handover Only
        </p>
      </div>
    </div>
  );
}