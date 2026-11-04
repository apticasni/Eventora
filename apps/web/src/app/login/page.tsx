'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard/bookings';
  const googleStatus = searchParams.get('google');
  const { login, refreshUser } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(() => {
    if (googleStatus === 'cancelled') {
      return 'Google sign-in was cancelled. You can try again or use your email and password.';
    }
    if (googleStatus === 'failed') {
      return 'Google sign-in could not be completed. Please try again.';
    }
    return null;
  });

  useEffect(() => {
    if (googleStatus === 'success') {
      void refreshUser().then(() => router.replace(redirect));
    }
  }, [googleStatus, redirect, refreshUser, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await login(email, password);
    if (res.success) {
      router.push(redirect);
    } else {
      setError(res.message || 'Invalid email or password.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-3xl border border-[#ded7ca] p-8 sm:p-10 shadow-warm-lg space-y-8">
        {/* Editorial Heading */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-block mb-2">
            <div className="w-12 h-12 rounded-2xl bg-forest flex items-center justify-center text-[#faf8f5] mx-auto shadow-sm">
              <span className="font-serif font-bold text-2xl">E</span>
            </div>
          </Link>
          <h2 className="font-serif text-3xl font-bold text-forest">Welcome back</h2>
          <p className="text-xs text-[#71695d]">
            Sign in to access your registered tickets, calendar events, and waitlists.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-forest mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#8c8273] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#ded7ca] bg-[#faf8f5] focus:bg-white focus:outline-none text-xs sm:text-sm font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-forest mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#8c8273] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#ded7ca] bg-[#faf8f5] focus:bg-white focus:outline-none text-xs sm:text-sm font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-forest hover:bg-forest-light text-[#faf8f5] font-bold text-sm shadow-warm transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Sign In to Eventora</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="relative flex items-center">
          <div className="flex-1 border-t border-[#e5dfd3]" />
          <span className="px-3 text-[11px] text-[#8c8273]">OR</span>
          <div className="flex-1 border-t border-[#e5dfd3]" />
        </div>

        <a
          href={api.auth.googleSignInUrl}
          className="w-full py-3 rounded-xl border border-[#ded7ca] bg-white hover:bg-[#faf8f5] text-forest font-bold text-sm transition-all flex items-center justify-center gap-3"
        >
          <span aria-hidden="true" className="font-bold text-base">G</span>
          <span>Continue with Google</span>
        </a>

        <div className="text-center text-xs text-[#71695d]">
          Don&apos;t have an account yet?{' '}
          <Link href="/register" className="font-bold text-forest hover:text-terracotta underline">
            Register now
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="py-24 text-center font-serif text-forest">Loading login...</div>}>
      <LoginForm />
    </Suspense>
  );
}
