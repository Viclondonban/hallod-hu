import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import AdminClientPage from './client-page';
import { deleteSuggestion } from './actions';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  // 🛡️ THE MODERN BOUNCER
  const cookieStore = await cookies(); // Next.js requires awaiting cookies now!

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Components can't set cookies, so we ignore this error securely
          }
        },
      },
    }
  );

  // getUser() re-validates the JWT against Supabase servers on every call.
  // getSession() only reads the cookie and trusts it, which Supabase flags as
  // insecure for any code path that makes an authorisation decision.
  const { data: { user } } = await supabase.auth.getUser();

  // 📋 THE VIP LIST — configured via ADMIN_EMAILS env var (comma-separated)
  const allowedEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim())
    .filter(Boolean);

  // If no user, or the email is NOT on the VIP list, kick them out
  if (!user || !allowedEmails.includes(user.email || '')) {
    redirect('/');
  }

  // 1. Fetch data for the existing dashboard
  const podcasts = await prisma.podcast.findMany({
    select: { id: true, title: true, category: true },
    orderBy: { title: 'asc' }
  });

  const dbCategories = await prisma.category.findMany({
    orderBy: { sortOrder: 'asc' }
  });

  // 2. Fetch the Suggestions
  const suggestions = await prisma.suggestion.findMany({
    orderBy: { createdAt: 'desc' }
  });

  return (
    <main className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Your Main Dashboard Tools */}
        <section className="pt-8">
          <AdminClientPage podcasts={podcasts} dbCategories={dbCategories} />
        </section>

        {/* Visual Divider */}
        <div className="max-w-5xl mx-auto border-t border-gray-200 my-16"></div>

        {/* 📥 SUGGESTION INBOX */}
        <section className="max-w-5xl mx-auto mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center">
              <span className="mr-2 text-xl">📩</span> Podcast ajánlások
              {suggestions.length > 0 && (
                <span className="ml-3 px-2 py-1 bg-blue-600 text-white text-[10px] uppercase font-bold rounded-md tracking-wider">
                  {suggestions.length} új
                </span>
              )}
            </h2>
          </div>
          
          {suggestions.length === 0 ? (
            <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-12 text-center text-gray-400">
              <p className="text-lg">Nincs új ajánlás. Pihenj egyet! ☕</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {suggestions.map((s) => (
                <div key={s.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center group hover:border-blue-200 transition-all">
                  <div className="flex-grow pr-6">
                    <p className="text-gray-900 font-semibold text-lg leading-tight mb-1">{s.content}</p>
                    <div className="flex items-center gap-4 text-[10px] text-gray-400 uppercase tracking-widest font-medium">
                      <span>{new Date(s.createdAt).toLocaleString('hu-HU')}</span>
                      <span className="text-gray-200">|</span>
                      <span>IP: {s.ipAddress || 'Ismeretlen'}</span>
                    </div>
                  </div>
                  
                  <form action={async () => {
                    'use server';
                    await deleteSuggestion(s.id);
                  }}>
                    <button 
                      type="submit"
                      className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      title="Végleges törlés"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}