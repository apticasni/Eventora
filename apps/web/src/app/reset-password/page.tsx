'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Lock, KeyRound, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get('email') || '';

  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await api.auth.resetPassword({ email, otp, newPassword });
    if (res.success) {
      setSuccess(true);
      setTimeout(() => router.push('/login'), 2000);
    } else {
      setError(res.message || 'Verification failed. Please check the OTP.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-3xl border border-[#ded7ca] p-8 sm:p-10 shadow-warm-lg space-y-6">
        <div className="text-center space-y-2">
          <h2 className="font-serif text-3xl font-bold text-forest">Set New Password</h2>
          <p className="text-xs text-[#71695d]">
            Enter the 6-digit verification code and your new password.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2 text-emerald-900">
            <CheckCircle className="w-8 h-8 mx-auto text-emerald-600" />
            <p className="text-sm font-bold">Password Reset Successful!</p>
            <p className="text-xs">Redirecting to login...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-forest mb-1.5">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-[#ded7ca] bg-[#faf8f5] focus:bg-white text-xs sm:text-sm font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-forest mb-1.5">6-Digit OTP</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-[#8c8273] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#ded7ca] bg-[#faf8f5] focus:bg-white text-xs sm:text-sm font-bold tracking-widest"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-forest mb-1.5">New Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#8c8273] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#ded7ca] bg-[#faf8f5] focus:bg-white text-xs sm:text-sm font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-forest hover:bg-forest-light text-white font-bold text-sm shadow-warm transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Save Password & Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="py-24 text-center font-serif text-forest">Loading reset...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
