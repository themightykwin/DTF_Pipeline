'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface LogoutButtonProps {
  className?: string;
  label?: string;
}

export default function LogoutButton({ className, label = 'Sign out' }: LogoutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await fetch('/api/customer/auth/logout', { method: 'POST' });
    } finally {
      window.location.href = '/';
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className={className}
    >
      {loading ? 'Signing out…' : label}
    </button>
  );
}
