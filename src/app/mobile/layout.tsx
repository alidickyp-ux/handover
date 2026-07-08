'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/');
      }
    };
    checkAuth();

    // Disable zoom di mobile
    const metaViewport = document.querySelector('meta[name=viewport]');
    if (metaViewport) {
      metaViewport.setAttribute(
        'content',
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
      );
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col max-w-md mx-auto">
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
      </div>

      {/* Main Content */}
      <div className="flex-1">{children}</div>

      {/* Bottom Navigation */}
      <div className="bg-slate-800 border-t border-slate-700">
        <div className="flex justify-around p-2">
          <button
            onClick={() => router.push('/mobile')}
            className="flex flex-col items-center text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z" />
            </svg>
            <span className="text-[10px]">Home</span>
          </button>
          <button
            onClick={() => router.push('/mobile/scan')}
            className="flex flex-col items-center text-white transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/50 -mt-4">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-[10px] mt-1">Scan</span>
          </button>
          <button
            onClick={() => router.push('/mobile/handover')}
            className="flex flex-col items-center text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <span className="text-[10px]">Handover</span>
          </button>
        </div>
      </div>
    </div>
  );
}