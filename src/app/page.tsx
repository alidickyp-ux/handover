'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import ToastContainer, { showToast } from '@/components/common/ToastContainer';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Cek session saat load
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && !isRedirecting) {
        setIsRedirecting(true);
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .single();

        const role = userData?.role || 'OPERATOR';
        
        // Full page redirect - ADMIN ke /admin/dashboard
        if (role === 'ADMIN') {
          window.location.href = '/admin/dashboard';
        } else if (role === 'SECURITY') {
          window.location.href = '/handover';
        } else {
          window.location.href = '/menu';
        }
      }
    };
    checkSession();
  }, [isRedirecting]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRedirecting) return;
    
    setLoading(true);

    const internalEmail = `${username.trim().toLowerCase()}@cool.internal`;

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: internalEmail,
        password: password,
      });

      if (error) {
        setLoading(false);
        showToast('Username atau password salah. Silakan coba lagi.', 'error', 4000);
        return;
      }

      if (data.session) {
        showToast('Selamat datang!', 'success', 1500);
        setLoading(false);
        setIsRedirecting(true);
        
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', data.session.user.id)
          .single();

        const role = userData?.role || 'OPERATOR';
        
        setTimeout(() => {
          if (role === 'ADMIN') {
            window.location.href = '/admin/dashboard';
          } else if (role === 'SECURITY') {
            window.location.href = '/handover';
          } else {
            window.location.href = '/menu';
          }
        }, 500);
      }
    } catch (error) {
      setLoading(false);
      showToast('Terjadi kesalahan sistem', 'error', 4000);
    }
  };

  // Tampilkan loading saat redirect
  if (isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-white to-slate-100">
        <div className="flex flex-col items-center gap-3">
          <svg className="w-8 h-8 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm text-slate-500 font-medium">Redirecting...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-white to-slate-100 p-4">
      <ToastContainer />
      
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl shadow-slate-200/50 p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-700 text-white text-2xl font-bold mb-4 shadow-lg shadow-indigo-200">
              C
            </div>
            <h1 className="text-2xl font-bold text-slate-800">COOL System</h1>
            <p className="text-sm text-slate-500 mt-1">Sorting &amp; Handover Management</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Username</label>
              <input
                type="text"
                required
                placeholder="Masukkan username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 placeholder:text-slate-400"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 placeholder:text-slate-400"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-all duration-200 shadow-lg shadow-indigo-200 hover:shadow-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Memproses...</span>
                </>
              ) : (
                'Masuk ke Sistem'
              )}
            </button>
          </form>

          <div className="text-center mt-8 pt-6 border-t border-slate-100">
            <p className="text-xs text-slate-400">&copy; 2026 COOL System. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
} 