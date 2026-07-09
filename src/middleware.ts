import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

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

  if (!user) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = userData?.role || 'OPERATOR';

  const adminPaths = ['/dashboard', '/history', '/users'];
  const operatorPaths = ['/sorting', '/handover', '/menu'];

  if (role === 'ADMIN' && operatorPaths.some(p => path.startsWith(p))) {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url));
  }
  if (role === 'OPERATOR' && adminPaths.some(p => path.startsWith(p))) {
    return NextResponse.redirect(new URL('/sorting', request.url));
  }
  if (role === 'SECURITY' && path !== '/handover') {
    return NextResponse.redirect(new URL('/handover', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};