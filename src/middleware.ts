import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Public paths - tidak perlu auth
  const publicPaths = ['/', '/login'];
  if (publicPaths.includes(path)) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Jika tidak ada user, redirect ke login
  if (!user) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = userData?.role || 'OPERATOR';

  // =========================================================
  // ROLE-BASED PATH PROTECTION
  // =========================================================

  // Admin only paths
  const adminPaths = ['/dashboard', '/admin', '/history', '/users'];
  
  // Operator paths (bisa diakses oleh ADMIN juga)
  const operatorPaths = ['/sorting', '/handover'];

  // =========================================================
  // RULES:
  // 1. ADMIN bisa akses SEMUA path (admin + operator)
  // 2. OPERATOR hanya bisa akses operator paths
  // 3. SECURITY hanya bisa akses /handover
  // =========================================================

  // Jika ADMIN → izinkan SEMUA akses
  if (role === 'ADMIN') {
    // Admin boleh akses semua, termasuk operator paths
    return response;
  }

  // Jika OPERATOR → hanya boleh akses operator paths
  if (role === 'OPERATOR') {
    // Jika operator mencoba akses admin path → redirect ke sorting
    if (adminPaths.some(p => path.startsWith(p))) {
      return NextResponse.redirect(new URL('/sorting', request.url));
    }
    // Jika operator akses operator path → izinkan
    if (operatorPaths.some(p => path.startsWith(p))) {
      return response;
    }
    // Selain itu redirect ke sorting
    return NextResponse.redirect(new URL('/sorting', request.url));
  }

  // Jika SECURITY → hanya boleh akses /handover
  if (role === 'SECURITY') {
    if (path !== '/handover') {
      return NextResponse.redirect(new URL('/handover', request.url));
    }
    return response;
  }

  // Default redirect ke sorting
  return NextResponse.redirect(new URL('/sorting', request.url));
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};