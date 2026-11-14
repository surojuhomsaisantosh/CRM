import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase environment variables are not yet configured, allow request to pass through
  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({ name, value, ...options });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: '', ...options });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({ name, value: '', ...options });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthenticated = Boolean(user);

  const isLoginPage = request.nextUrl.pathname === '/crm/login';
  const isResetPasswordPage = request.nextUrl.pathname === '/crm/reset-password';
  const isPublicAuthPage = isLoginPage || isResetPasswordPage || request.nextUrl.pathname === '/crm/forgot-password';
  const isCrmRoute = request.nextUrl.pathname.startsWith('/crm');

  // If user is not logged in and visiting protected CRM route
  if (!isAuthenticated && isCrmRoute && !isPublicAuthPage) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/crm/login';
    return NextResponse.redirect(redirectUrl);
  }

  // If user is logged in and trying to access the login page
  if (isAuthenticated && isLoginPage) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/crm';
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: ['/crm/:path*'],
};
