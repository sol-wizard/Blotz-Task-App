export { default } from 'next-auth/middleware';
import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  // auth middleware
  const response = await withAuth(req);
  if (response) {
    return response;
  }

  return NextResponse.next();
}

// customize auth redirect strategy
async function withAuth(req) {
  const pathname = req.nextUrl.pathname.replace(/\/$/, '');
  // config path no need to check auth
  const excludeAuthPath = ['/auth', '/auth/signin', '/auth/signup'];

  if (excludeAuthPath.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const token = await getToken({ req });
  if (!token) {
    const signinUrl = new URL('/auth/signin', req.url);
    signinUrl.searchParams.set('callbackUrl', req.nextUrl.pathname);
    return NextResponse.redirect(signinUrl);
  }

  return NextResponse.next();
}

// match all pages
export const config = {
  matcher: [
    // Protect all routes except for these
    '/((?!_next|api|auth|assets|favicon.ico).*)',
  ],
};