import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  // Redirect all protected routes to the main page since we no longer maintain the web app
  const pathname = req.nextUrl.pathname.replace(/\/$/, '');
  
  // If trying to access dashboard or other protected routes, redirect to main page
  if (pathname.startsWith('/dashboard') || 
      pathname.startsWith('/tasks') || 
      pathname.startsWith('/schedule') ||
      pathname.startsWith('/goal-to-task') ||
      pathname.startsWith('/task-list') ||
      pathname.startsWith('/search')) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Apply to all routes except static files
    '/((?!_next/static|_next/image|favicon.ico|assets).*)',
  ],
};