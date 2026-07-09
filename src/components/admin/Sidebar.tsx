'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { User } from '@/types';

interface SidebarProps {
  user: User | null;
}

export default function Sidebar({ user }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const isActive = (path: string) => {
    return pathname === path || pathname?.startsWith(path + '/');
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const menuItems = [
    {
      path: '/dashboard',
      label: 'Dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z" />
        </svg>
      ),
    },
    {
      path: '/admin/sorting',
      label: 'Sorting Monitor',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      ),
    },
    {
      path: '/admin/handover',
      label: 'Handover Console',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      ),
    },
    {
      path: '/admin/history',
      label: 'History & Export',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      path: '/admin/users',
      label: 'Manajemen Users',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
  ];

  return (
    <aside
      className={`${
        isCollapsed ? 'w-20' : 'w-64'
      } bg-white/80 backdrop-blur-xl border-r border-white/50 shadow-xl shadow-slate-200/30 flex flex-col justify-between min-h-screen sticky top-0 transition-all duration-300`}
    >
      <div>
        {/* Logo */}
        <div className={`p-4 border-b border-slate-200/50 flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-200/50 flex-shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <span className="font-bold text-slate-800 text-sm tracking-tight block">COOL SYSTEM</span>
              <p className="text-[0.6rem] text-slate-400 font-medium tracking-wider uppercase">Inventory</p>
            </div>
          )}
        </div>

        {/* Toggle Button */}
        <button
          onClick={toggleSidebar}
          className={`w-full p-2 hover:bg-slate-100/50 transition-colors ${isCollapsed ? 'justify-center' : ''}`}
        >
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-end'}`}>
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d={isCollapsed ? "M13 5l7 7-7 7M5 5l7 7-7 7" : "M11 19l-7-7 7-7M19 5l-7 7 7 7"} />
            </svg>
          </div>
        </button>

        {/* Navigation */}
        <nav className="p-3 space-y-1">
          {!isCollapsed && (
            <p className="px-3 py-2 text-[0.6rem] uppercase font-semibold text-slate-400 tracking-wider">Menu Utama</p>
          )}
          
          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={`w-full flex items-center rounded-xl transition-all duration-200 group ${
                isActive(item.path)
                  ? 'bg-gradient-to-r from-indigo-50 to-violet-50 text-indigo-600 font-medium shadow-sm shadow-indigo-100/50 border-l-2 border-indigo-500'
                  : 'text-slate-600 hover:bg-indigo-50/50 hover:text-indigo-600'
              } ${isCollapsed ? 'justify-center p-3' : 'px-3 py-2.5'}`}
              title={isCollapsed ? item.label : ''}
            >
              <span className={`${isActive(item.path) ? 'text-indigo-600' : 'text-slate-400 group-hover:text-indigo-600'} flex-shrink-0`}>
                {item.icon}
              </span>
              {!isCollapsed && <span className="ml-3 text-sm">{item.label}</span>}
            </button>
          ))}
        </nav>
      </div>

      {/* User Info & Logout */}
      <div className={`p-4 border-t border-slate-200/50 ${isCollapsed ? 'flex justify-center' : ''}`}>
        <div className={`flex items-center ${isCollapsed ? 'flex-col' : 'justify-between w-full'}`}>
          {!isCollapsed && (
            <>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center text-indigo-600 font-bold text-sm flex-shrink-0">
                  {user?.full_name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="overflow-hidden">
                  <p className="font-medium text-slate-800 text-sm truncate">{user?.full_name || 'User'}</p>
                  <p className="text-[0.6rem] text-slate-400 font-mono">{user?.role || 'Operator'}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50/50 rounded-xl transition-all duration-200 flex-shrink-0"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </>
          )}
          {isCollapsed && (
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50/50 rounded-xl transition-all duration-200"
              title="Logout"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}