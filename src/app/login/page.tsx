'use client';
import { createBrowserClient } from '@supabase/ssr';

export default function LoginPage() {
  // 🌐 THE BROWSER CLIENT (For client-side pages)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { 
        redirectTo: `${window.location.origin}/auth/callback` 
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl text-center">
        <h1 className="text-2xl font-bold mb-6 text-gray-900">Admin Belépés</h1>
        <button 
          onClick={handleLogin}
          className="w-full py-3 px-4 bg-white border border-gray-300 rounded-xl flex items-center justify-center gap-3 hover:bg-gray-50 transition-all font-semibold text-gray-700 shadow-sm"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
          Belépés Google fiókkal
        </button>
        <p className="mt-4 text-xs text-gray-400">Csak engedélyezett adminoknak.</p>
      </div>
    </div>
  );
}