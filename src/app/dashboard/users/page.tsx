'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { showToast } from '@/components/common/ToastContainer';
import { User } from '@/types';

export default function UsersManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'OPERATOR'>('OPERATOR');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      showToast('Gagal memuat data users', 'error', 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const internalEmail = `${username.trim().toLowerCase()}@cool.internal`;

    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: internalEmail,
        password: password,
        options: {
          data: { full_name: fullName },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Gagal membuat akun');

      // Create user profile
      const { error: profileError } = await supabase.from('users').insert([
        {
          id: authData.user.id,
          full_name: fullName,
          role: role,
          is_active: true,
        },
      ]);

      if (profileError) throw profileError;

      showToast(`✅ User '${fullName}' berhasil didaftarkan!`, 'success', 3000);
      setFullName('');
      setUsername('');
      setPassword('');
      setRole('OPERATOR');
      fetchUsers();
    } catch (error: any) {
      showToast(error.message || 'Gagal mendaftarkan user', 'error', 4000);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleUserStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      const newStatus = !currentStatus;
      showToast(
        `User berhasil ${newStatus ? 'diaktifkan' : 'dinonaktifkan'}`,
        'success',
        3000
      );
      fetchUsers();
    } catch (error) {
      console.error('Error toggling user status:', error);
      showToast('Gagal mengubah status user', 'error', 3000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center gap-3 text-slate-400">
          <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm font-medium">Memuat data users...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex justify-between items-center pb-6 border-b border-slate-200/50">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent tracking-tight">
            Manajemen Pengguna
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Kelola hak akses dan aktivasi akun operator
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-sm text-slate-600 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-xl border border-slate-200/50 shadow-sm">
            Total: <span className="font-bold text-indigo-600">{users.length}</span> Users
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/30 p-6 border border-white/50 h-fit">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200/50">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-200/50">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-sm">Registrasi Baru</h2>
              <p className="text-xs text-slate-400">Tambah operator ke sistem</p>
            </div>
          </div>

          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Nama Lengkap
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Dicky Permana"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50/50 border-2 border-slate-200/50 text-slate-800 text-sm focus:outline-none focus:border-indigo-500 focus:bg-white transition-all duration-200"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Username Login
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: dicky"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50/50 border-2 border-slate-200/50 text-slate-800 text-sm focus:outline-none focus:border-indigo-500 focus:bg-white transition-all duration-200"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                placeholder="Minimal 6 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50/50 border-2 border-slate-200/50 text-slate-800 text-sm focus:outline-none focus:border-indigo-500 focus:bg-white transition-all duration-200"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Role Akses
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'ADMIN' | 'OPERATOR')}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50/50 border-2 border-slate-200/50 text-slate-800 text-sm focus:outline-none focus:border-indigo-500 focus:bg-white transition-all duration-200"
              >
                <option value="OPERATOR">👤 OPERATOR GUDANG</option>
                <option value="ADMIN">👑 ADMIN INVENTORY</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl font-semibold text-sm transition-all duration-200 shadow-lg shadow-indigo-200/50 hover:shadow-xl hover:shadow-indigo-200/70 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <span>Tambah Pengguna</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Table */}
        <div className="lg:col-span-2 bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/30 border border-white/50 overflow-hidden">
          <div className="p-4 border-b border-slate-200/50 flex justify-between items-center bg-gradient-to-r from-slate-50/50 to-white">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <h2 className="font-bold text-slate-800 text-sm">Daftar Pengguna</h2>
            </div>
            <button
              onClick={fetchUsers}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-600 rounded-xl border border-slate-200/50 transition-all duration-200 text-xs font-medium flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>

          <div className="overflow-x-auto p-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-slate-500 font-semibold text-[0.65rem] uppercase tracking-wider">
                  <th className="p-3 pl-4">Nama Lengkap</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-center pr-4">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/50">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400">
                      <div className="flex flex-col items-center gap-2">
                        <svg className="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span className="text-sm font-medium">Belum ada pengguna terdaftar</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-indigo-50/30 transition-colors duration-150 group">
                      <td className="p-3 pl-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center text-indigo-600 font-semibold text-xs">
                            {user.full_name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-slate-800 text-sm">{user.full_name}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[0.65rem] font-medium ${
                          user.role === 'ADMIN'
                            ? 'bg-purple-50 text-purple-600 border border-purple-200/50'
                            : 'bg-blue-50 text-blue-600 border border-blue-200/50'
                        }`}>
                          {user.role === 'ADMIN' ? '👑' : '👤'} {user.role}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-50/50">
                          <span className={`w-2 h-2 rounded-full ${user.is_active ? 'bg-emerald-500 shadow-sm shadow-emerald-200' : 'bg-rose-400 shadow-sm shadow-rose-200'}`}></span>
                          <span className={`text-xs font-medium ${user.is_active ? 'text-emerald-700' : 'text-rose-600'}`}>
                            {user.is_active ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-center pr-4">
                        <button
                          onClick={() => toggleUserStatus(user.id, user.is_active)}
                          className={`px-3 py-1 rounded-lg border transition-all duration-200 text-xs font-medium ${
                            user.is_active
                              ? 'border-rose-200 bg-white text-rose-600 hover:bg-rose-50 hover:border-rose-300 shadow-sm'
                              : 'border-emerald-200 bg-white text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300 shadow-sm'
                          }`}
                        >
                          {user.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}