'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function CustomerRegisterPage() {
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/customer/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const json = await res.json() as { ok: boolean; error?: { message: string } };
      if (!json.ok) { setError(json.error?.message ?? 'Registration failed.'); setLoading(false); return; }
      // Hard navigate so the browser sends the new session cookie
      window.location.href = '/account';
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  // ── Input style helper ────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
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
  };

  function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
    e.currentTarget.style.borderColor = '#E8FF47';
    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(232,255,71,0.15)';
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    e.currentTarget.style.borderColor = '#2A2A2A';
    e.currentTarget.style.boxShadow = 'none';
  }

  const labelStyle: React.CSSProperties = {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    fontSize: '14px',
    color: '#888888',
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#0A0A0A',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 16px',
      }}
    >
      <div style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column' }}>

        {/* ── Header ── */}
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
            Create your account
          </p>
        </div>

        {/* ── Card ── */}
        <div
          style={{
            background: '#131313',
            border: '1px solid #2A2A2A',
            borderRadius: '12px',
            padding: '40px',
            width: '100%',
          }}
        >
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Name */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={labelStyle}>Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                placeholder="Your name"
                style={inputStyle}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </div>

            {/* Email */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
                style={inputStyle}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </div>

            {/* Password */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={labelStyle}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="At least 8 characters"
                style={inputStyle}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </div>

            {/* Confirm Password */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={labelStyle}>Confirm Password</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="Repeat password"
                style={inputStyle}
                onFocus={handleFocus}
                onBlur={handleBlur}
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
                marginTop: '4px',
              }}
              onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#C8DF1F'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#E8FF47'; }}
            >
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          {/* Login link */}
          <p
            style={{
              textAlign: 'center',
              fontSize: '14px',
              fontFamily: 'Inter, sans-serif',
              color: '#888888',
              marginTop: '24px',
            }}
          >
            Already have an account?{' '}
            <Link
              href="/account/login"
              style={{
                color: '#E8FF47',
                fontWeight: 500,
                textDecoration: 'none',
              }}
            >
              Sign in
            </Link>
          </p>
        </div>

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
