import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Middleware kosong - izinkan semua akses
export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [], // Tidak match apapun
};