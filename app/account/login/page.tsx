'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

// ─── Inner component — uses useSearchParams, must be wrapped in Suspense ──────

function LoginForm() {
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
      // Hard navigate so the browser sends the new session cookie on the next request.
      // router.push alone won't work because Next.js client nav doesn't re-read httpOnly cookies.
      window.location.href = next;
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        background: '#131313',
        border: '1px solid #2A2A2A',
        borderRadius: '12px',
        padding: '40px',
        width: '100%',
        maxWidth: '400px',
      }}
    >
      {/* Form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Email */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label
            style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 500,
              fontSize: '14px',
              color: '#888888',
            }}
          >
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="you@example.com"
            style={{
              background: '#1A1A1A',
              border: '1px solid #2A2A2A',
              borderRadius: '6px',
              color: '#F5F5F5',
              fontSize: '14px',
              fontFamily: 'Inter, sans-serif',
              padding: '12px 16px',
              outline: 'none',
              width: '100%',
              boxSizing: 'border-box',
              transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#E8FF47';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(232,255,71,0.15)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#2A2A2A';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>

        {/* Password */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label
            style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 500,
              fontSize: '14px',
              color: '#888888',
            }}
          >
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            placeholder="••••••••"
            style={{
              background: '#1A1A1A',
              border: '1px solid #2A2A2A',
              borderRadius: '6px',
              color: '#F5F5F5',
              fontSize: '14px',
              fontFamily: 'Inter, sans-serif',
              padding: '12px 16px',
              outline: 'none',
              width: '100%',
              boxSizing: 'border-box',
              transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#E8FF47';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(232,255,71,0.15)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#2A2A2A';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              background: 'rgba(255,71,71,0.1)',
              border: '1px solid rgba(255,71,71,0.3)',
              borderRadius: '8px',
              padding: '8px 12px',
              color: '#FF4747',
              fontSize: '14px',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
            background: '#E8FF47',
            color: '#0A0A0A',
            fontFamily: 'Inter, sans-serif',
            fontWeight: 700,
            fontSize: '14px',
            borderRadius: '8px',
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.5 : 1,
            boxShadow: '0 0 20px rgba(232,255,71,0.25)',
            transition: 'background 0.15s, opacity 0.15s',
          }}
          onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#C8DF1F'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#E8FF47'; }}
        >
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>

      {/* Register link */}
      <p
        style={{
          textAlign: 'center',
          fontSize: '14px',
          fontFamily: 'Inter, sans-serif',
          color: '#888888',
          marginTop: '24px',
        }}
      >
        Don&apos;t have an account?{' '}
        <Link
          href="/account/register"
          style={{
            color: '#E8FF47',
            fontWeight: 500,
            textDecoration: 'none',
          }}
        >
          Create one
        </Link>
      </p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CustomerLoginPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#0A0A0A',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 16px',
        flexDirection: 'column',
        gap: '0',
      }}
    >
      <div style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '0' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px', textAlign: 'center' }}>
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              textDecoration: 'none',
              marginBottom: '8px',
            }}
          >
            <span style={{ color: '#E8FF47', fontSize: '10px', lineHeight: 1 }}>●</span>
            <span
              style={{
                fontFamily: "'Syne', sans-serif",
                fontWeight: 700,
                fontSize: '20px',
                color: '#F5F5F5',
                letterSpacing: '-0.02em',
              }}
            >
              DTF Pipeline
            </span>
          </Link>
          <p
            style={{
              fontSize: '14px',
              fontFamily: 'Inter, sans-serif',
              color: '#888888',
              marginTop: '4px',
            }}
          >
            Sign in to your account
          </p>
        </div>

        {/* Suspense-wrapped form */}
        <Suspense
          fallback={
            <div
              style={{
                background: '#131313',
                border: '1px solid #2A2A2A',
                borderRadius: '12px',
                padding: '40px',
                textAlign: 'center',
                fontSize: '14px',
                fontFamily: 'Inter, sans-serif',
                color: '#888888',
              }}
            >
              Loading…
            </div>
          }
        >
          <LoginForm />
        </Suspense>

        {/* Back to home */}
        <p
          style={{
            textAlign: 'center',
            marginTop: '20px',
            fontSize: '12px',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          <Link
            href="/"
            style={{
              color: '#444444',
              textDecoration: 'none',
              transition: 'color 0.15s',
            }}
          >
            ← Back to home
          </Link>
        </p>
      </div>
    </main>
  );
}
