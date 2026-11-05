'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, CheckCircle, Mail } from 'lucide-react';
import { api } from '@/lib/api';

const GENERIC_RESPONSE = 'If an account exists for that address, password-reset instructions will be sent.';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    const result = await api.auth.forgotPassword(email);
    setLoading(false);
    if (result.success) {
      setSubmitted(true);
    } else {
      setError('We could not submit your request right now. Please try again.');
    }
  };

  return (
    <div className="flex min-h-[75vh] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6 rounded-3xl border border-[#ded7ca] bg-white p-8 shadow-warm-lg sm:p-10">
        <div className="space-y-2 text-center">
          <h1 className="font-serif text-3xl font-bold text-forest">Reset your password</h1>
          <p className="text-sm text-[#71695d]">Enter the email address associated with your account.</p>
        </div>

        {submitted ? (
          <div className="space-y-3 text-center" role="status">
            <CheckCircle className="mx-auto h-9 w-9 text-emerald-700" aria-hidden="true" />
            <p className="text-sm text-[#40382b]">{GENERIC_RESPONSE}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block text-sm font-semibold text-forest" htmlFor="recovery-email">Email address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8c8273]" aria-hidden="true" />
              <input
                id="recovery-email"
                type="email"
                required
                maxLength={254}
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-[#ded7ca] bg-[#faf8f5] py-3 pl-10 pr-4 text-sm focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-forest"
              />
            </div>
            {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-forest px-4 py-3 text-sm font-bold text-white hover:bg-forest-light disabled:opacity-60"
            >
              {loading ? 'Sending…' : <>Send reset link <ArrowRight className="h-4 w-4" aria-hidden="true" /></>}
            </button>
          </form>
        )}

        <div className="text-center">
          <Link href="/login" className="inline-flex items-center gap-2 text-sm font-semibold text-forest hover:text-terracotta">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Return to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
