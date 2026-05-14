'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function EntryPage() {
  const [activeView, setActiveView] = useState<'front' | 'back'>('front');

  return (
    <main className="min-h-screen bg-[#0A0A0A] flex flex-col">
      {/* Nav */}
      <nav
        className="sticky top-0 z-50 flex items-center justify-between px-8 py-4"
        style={{ background: '#0D0D0D', borderBottom: '1px solid #222' }}
      >
        {/* Left — brand */}
        <Link href="/" className="flex items-center gap-2">
          <span style={{ color: '#E8FF47', fontSize: 10 }}>●</span>
          <span
            className="text-lg font-bold text-[#F5F5F5]"
            style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700 }}
          >
            DTF Pipeline
          </span>
        </Link>

        {/* Center — nav links */}
        <div className="hidden md:flex items-center gap-7">
          {['How it Works', 'Pricing', 'Sign In'].map((label) => (
            <a
              key={label}
              href="#"
              className="text-sm text-[#888] hover:text-[#F5F5F5] transition-colors"
              style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500 }}
            >
              {label}
            </a>
          ))}
        </div>

        {/* Right — CTA */}
        <Link
          href="/account/register"
          className="px-5 py-2 text-sm transition-opacity hover:opacity-90"
          style={{
            background: '#E8FF47',
            color: '#0A0A0A',
            borderRadius: 9999,
            fontFamily: "'Inter', sans-serif",
            fontWeight: 600,
          }}
        >
          Create Account
        </Link>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex items-center px-8 md:px-16 py-16">
        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left column */}
          <div>
            {/* Eyebrow */}
            <p
              className="text-xs tracking-[0.2em] mb-6"
              style={{
                color: '#E8FF47',
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              CUSTOM APPAREL · DTF PRINTING
            </p>

            {/* Headline */}
            <div
              className="leading-[0.95]"
              style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800 }}
            >
              <p style={{ fontSize: 76, color: '#F5F5F5', lineHeight: '0.95' }}>Design it.</p>
              <p style={{ fontSize: 76, color: '#F5F5F5', lineHeight: '0.95' }}>Print it.</p>
              <p style={{ fontSize: 76, color: '#E8FF47', lineHeight: '0.95' }}>Done.</p>
            </div>

            {/* Subheadline */}
            <p
              className="text-lg text-[#888] max-w-md mt-6"
              style={{ fontFamily: "'Inter', sans-serif", fontWeight: 400 }}
            >
              Upload your artwork, pick your garment, and get DTF-quality prints shipped to your door.
            </p>

            {/* CTAs */}
            <div className="flex flex-col gap-3 max-w-xs mt-8">
              <Link
                href="/account/register"
                className="w-full text-center py-3.5 text-sm transition-all"
                style={{
                  background: '#E8FF47',
                  color: '#0A0A0A',
                  borderRadius: 8,
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 700,
                  boxShadow: '0 0 20px rgba(232,255,71,0.25)',
                }}
              >
                Start Designing →
              </Link>
              <Link
                href="/account/login"
                className="w-full text-center py-3.5 text-sm text-[#F5F5F5] transition-colors hover:border-[#888]"
                style={{
                  border: '1px solid #3A3A3A',
                  borderRadius: 8,
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 500,
                }}
              >
                Sign In
              </Link>
            </div>

            {/* Stat badges */}
            <div className="flex flex-wrap gap-4 mt-10">
              {['2,400+ Designs Created', '48hr Turnaround', 'Free Revisions'].map((stat) => (
                <span
                  key={stat}
                  className="px-4 py-2 rounded-full text-xs text-[#888]"
                  style={{
                    background: '#131313',
                    border: '1px solid #2A2A2A',
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 500,
                  }}
                >
                  {stat}
                </span>
              ))}
            </div>
          </div>

          {/* Right column — garment preview card */}
          <div className="flex items-center justify-center">
            <div
              className="relative overflow-hidden flex flex-col w-full"
              style={{
                background: '#131313',
                border: '1px solid #2A2A2A',
                borderRadius: 12,
                aspectRatio: '1 / 1',
                maxWidth: 420,
              }}
            >
              {/* Front/Back toggle */}
              <div className="flex justify-center mt-4">
                <div
                  className="inline-flex gap-1 p-1"
                  style={{
                    background: '#0D0D0D',
                    border: '1px solid #2A2A2A',
                    borderRadius: 9999,
                  }}
                >
                  <button
                    onClick={() => setActiveView('front')}
                    className="px-4 py-1.5 text-xs transition-all"
                    style={{
                      borderRadius: 9999,
                      fontFamily: "'Inter', sans-serif",
                      fontWeight: activeView === 'front' ? 600 : 500,
                      background: activeView === 'front' ? '#E8FF47' : 'transparent',
                      color: activeView === 'front' ? '#0A0A0A' : '#888',
                    }}
                  >
                    Front
                  </button>
                  <button
                    onClick={() => setActiveView('back')}
                    className="px-4 py-1.5 text-xs transition-all"
                    style={{
                      borderRadius: 9999,
                      fontFamily: "'Inter', sans-serif",
                      fontWeight: activeView === 'back' ? 600 : 500,
                      background: activeView === 'back' ? '#E8FF47' : 'transparent',
                      color: activeView === 'back' ? '#0A0A0A' : '#888',
                    }}
                  >
                    Back
                  </button>
                </div>
              </div>

              {/* T-shirt SVG */}
              <div className="flex-1 flex items-center justify-center p-8">
                <svg
                  viewBox="0 0 200 220"
                  style={{ width: '100%', maxWidth: '240px' }}
                  fill="none"
                >
                  <path
                    d="M60 10 L10 50 L30 70 L30 190 L170 190 L170 70 L190 50 L140 10 Q120 30 100 30 Q80 30 60 10Z"
                    fill="#2A2A2A"
                    stroke="#3A3A3A"
                    strokeWidth="1"
                  />
                  <rect
                    x="82"
                    y="65"
                    width="36"
                    height="36"
                    rx="4"
                    fill="#E8FF47"
                    transform="rotate(15 100 83)"
                  />
                </svg>
              </div>

              {/* Caption */}
              <p
                className="mt-auto pb-4 text-center"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  color: '#444',
                }}
              >
                Preview artwork placement
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer note */}
      <footer className="py-6 text-center">
        <p className="text-xs text-[#444]">
          Store owner?{' '}
          <Link
            href="/admin/login"
            className="underline hover:text-[#888] transition-colors"
          >
            Admin login
          </Link>
        </p>
      </footer>
    </main>
  );
}
