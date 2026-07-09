import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const userAgent = request.headers.get('user-agent') || '';
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  
  const path = request.nextUrl.pathname;

  // Jika path root, redirect berdasarkan device
  if (path === '/') {
    if (isMobile) {
      return NextResponse.redirect(new URL('/mobile', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/'],
};