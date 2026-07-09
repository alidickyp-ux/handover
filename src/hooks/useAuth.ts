'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { User } from '@/types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          setLoading(false);
          return;
        }

        setSession(session);
        
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (!error && data) {
          setUser(data);
        } else {
          // Jika user tidak ditemukan, logout
          await supabase.auth.signOut();
          setUser(null);
        }
      } catch (error) {
        console.error('useAuth error:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    getUser();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setUser(null);
          setSession(null);
        } else if (event === 'SIGNED_IN' && session) {
          setSession(session);
          const { data } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();
          if (data) setUser(data);
          setLoading(false);
        }
      }
    );

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  // Role checks
  const isAdmin = user?.role === 'ADMIN';
  const isOperator = user?.role === 'OPERATOR';
  const isSecurity = user?.role === 'SECURITY';

  return { 
    user, 
    session, 
    loading, 
    logout,
    isAdmin,
    isOperator,
    isSecurity,
    role: user?.role 
  };
}