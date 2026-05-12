'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

// Inner component — uses useSearchParams, must be wrapped in Suspense
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/account';

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/customer/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json() as { ok: boolean; error?: { message: string } };
      if (!json.ok) { setError(json.error?.message ?? 'Login failed.'); return; }
      router.push(next);
      router.refresh();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            required autoComplete="email"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#01696f]/30 focus:border-[#01696f]"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
          <input
            type="password" value={password} onChange={e => setPassword(e.target.value)}
            required autoComplete="current-password"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#01696f]/30 focus:border-[#01696f]"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}

        <button
          type="submit" disabled={loading}
          className="w-full py-3 bg-[#01696f] text-white font-semibold text-sm rounded-xl hover:bg-[#0c4e54] transition-colors disabled:opacity-50"
        >
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        Don&apos;t have an account?{' '}
        <Link href="/account/register" className="text-[#01696f] font-medium hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}

export default function CustomerLoginPage() {
  return (
    <main className="min-h-screen bg-[#f7f6f2] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="text-xl font-bold text-gray-900 tracking-tight">DTF Pipeline</Link>
          <p className="text-sm text-gray-500 mt-2">Sign in to your account</p>
        </div>
        <Suspense fallback={
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center text-sm text-gray-400">
            Loading…
          </div>
        }>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
