'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import ToastContainer from '@/components/common/ToastContainer';
import { supabase } from '@/lib/supabase';

export default function OperatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, isOperator } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/');
      } else if (!isOperator) {
        router.push('/dashboard');
      }
    }
  }, [user, loading, isOperator, router]);

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

  const isSortingActive = pathname === '/sorting';
  const isHandoverActive = pathname === '/handover';

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col max-w-md mx-auto">
      <ToastContainer />
      
      {/* Status Bar */}
      <div className="bg-slate-800 px-4 py-2 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-white text-xs font-medium">Online</span>
        </div>
        <div className="flex items-center gap-2 text-slate-400 text-xs">
          <span>📶</span>
          <span>🔋</span>
          <span className="font-mono">{new Date().toLocaleTimeString()}</span>
        </div>
        <button
          onClick={handleLogout}
          className="px-2 py-1 bg-rose-500/20 text-rose-400 text-xs font-medium rounded-lg hover:bg-rose-500/30 transition-colors"
        >
          Logout
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pb-20">
        {children}
      </div>

      {/* BOTTOM NAVIGATION */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-slate-800 border-t border-slate-700 z-50">
        <div className="flex justify-around p-2">
          {/* Tombol Sorting */}
          <button
            onClick={() => router.push('/sorting')}
            className={`flex flex-col items-center transition-colors ${
              isSortingActive ? 'text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              isSortingActive ? 'bg-indigo-500 shadow-lg shadow-indigo-500/50' : ''
            }`}>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-[10px] mt-1">Sorting</span>
          </button>

          {/* Tombol Handover */}
          <button
            onClick={() => router.push('/handover')}
            className={`flex flex-col items-center transition-colors ${
              isHandoverActive ? 'text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              isHandoverActive ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50' : ''
            }`}>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <span className="text-[10px] mt-1">Handover</span>
          </button>
        </div>
      </div>
    </div>
  );
}