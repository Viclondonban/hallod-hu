import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  // Build base URL correctly behind Railway's reverse proxy.
  // Railway sets x-forwarded-host / x-forwarded-proto; request.url only has the internal host.
  const forwardedHost  = request.headers.get('x-forwarded-host');
  const forwardedProto = (request.headers.get('x-forwarded-proto') || 'https').split(',')[0].trim();
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (forwardedHost ? `${forwardedProto}://${forwardedHost}` : new URL(request.url).origin);

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Safe to ignore in Server Components
            }
          },
        },
      }
    );
    
    // Exchange the code for a session
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // Redirect explicitly to the production domain /admin
      return NextResponse.redirect(`${baseUrl}/admin`);
    }
  }

  // If error or no code, return to homepage
  return NextResponse.redirect(`${baseUrl}/`);
}