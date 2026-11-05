'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, CheckCircle, Lock } from 'lucide-react';
import { api } from '@/lib/api';

function subscribeToResetToken(onChange: () => void) {
  onChange();
  return () => undefined;
}

function getResetTokenSnapshot() {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.hash.slice(1)).get('token') || '';
}

function getServerResetTokenSnapshot() {
  return '';
}

function ResetPasswordForm() {
  const router = useRouter();
  const token = useSyncExternalStore(
    subscribeToResetToken,
    getResetTokenSnapshot,
    getServerResetTokenSnapshot,
  );
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (window.location.hash) window.history.replaceState(null, '', '/reset-password');
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    const result = await api.auth.resetPassword({ token, newPassword });
    setLoading(false);
    if (!result.success) {
      setError(result.message || 'This reset link is invalid or has expired. Request a new one.');
      return;
    }
    setSuccess(true);
    window.setTimeout(() => router.replace('/login'), 1800);
  };

  return (
    <div className="flex min-h-[75vh] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6 rounded-3xl border border-[#ded7ca] bg-white p-8 shadow-warm-lg sm:p-10">
        <div className="space-y-2 text-center">
          <h1 className="font-serif text-3xl font-bold text-forest">Choose a new password</h1>
          <p className="text-sm text-[#71695d]">Your reset link can be used once and expires after 15 minutes.</p>
        </div>

        {success ? (
          <div className="space-y-3 text-center" role="status">
            <CheckCircle className="mx-auto h-9 w-9 text-emerald-700" aria-hidden="true" />
            <p className="text-sm font-semibold text-forest">Password updated. Returning to sign in…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block text-sm font-semibold text-forest" htmlFor="new-password">New password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8c8273]" aria-hidden="true" />
              <input
                id="new-password"
                type="password"
                required
                minLength={8}
                maxLength={100}
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="w-full rounded-xl border border-[#ded7ca] bg-[#faf8f5] py-3 pl-10 pr-4 text-sm focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-forest"
              />
            </div>
            {!token && <p className="text-sm text-red-700" role="alert">This reset link is invalid or has expired. Request a new one.</p>}
            {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
            <button
              type="submit"
              disabled={loading || !token}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-forest px-4 py-3 text-sm font-bold text-white hover:bg-forest-light disabled:opacity-60"
            >
              {loading ? 'Updating…' : <>Update password <ArrowRight className="h-4 w-4" aria-hidden="true" /></>}
            </button>
          </form>
        )}

        <div className="text-center text-sm">
          <Link href="/forgot-password" className="font-semibold text-forest hover:text-terracotta">Request another reset link</Link>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
