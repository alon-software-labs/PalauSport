import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { supabaseKey, supabaseUrl } from './config';

const PROTECTED_PREFIXES = ['/dashboard', '/reservations', '/invoices'];
const AUTH_PAGES = ['/login', '/signup'];

function isProtectedRoute(pathname: string) {
  return PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isAuthPage(pathname: string) {
  return AUTH_PAGES.some((page) => pathname === page || pathname.startsWith(`${page}/`));
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Get session first, then verify JWT with getClaims (pass token explicitly for middleware reliability)
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;
  let userRole: string | undefined;

  if (accessToken) {
    const { data: claimsData } = await supabase.auth.getClaims(accessToken);
    const payload = claimsData?.claims as { user_role?: string } | undefined;
    userRole = payload?.user_role;
  }
  const hasSession = !!accessToken;

  // Redirect unauthenticated users from protected routes
  if (isProtectedRoute(request.nextUrl.pathname) && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Restrict CRM to employees only: only user_role === 'employee' is allowed
  // Missing/invalid user_role (hook not enabled) or 'client' → access denied
  if (isProtectedRoute(request.nextUrl.pathname) && hasSession && userRole !== 'employee') {
    const url = request.nextUrl.clone();
    url.pathname = '/access-denied';
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages
  if (isAuthPage(request.nextUrl.pathname) && hasSession) {
    const url = request.nextUrl.clone();
    if (userRole === 'employee') {
      url.pathname = '/dashboard';
    } else {
      url.pathname = '/access-denied';
    }
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
