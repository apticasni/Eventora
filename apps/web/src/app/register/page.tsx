'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Lock, Mail, User as UserIcon, ArrowRight, AlertCircle, Briefcase } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'ATTENDEE' | 'ORGANIZER'>('ATTENDEE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await register(name, email, password, role);
    if (res.success) {
      if (role === 'ORGANIZER') {
        router.push('/organizer');
      } else {
        router.push('/dashboard/bookings');
      }
    } else {
      setError(res.message || 'Registration failed. Please check inputs.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-3xl border border-[#ded7ca] p-8 sm:p-10 shadow-warm-lg space-y-8">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-block mb-2">
            <div className="w-12 h-12 rounded-2xl bg-forest flex items-center justify-center text-[#faf8f5] mx-auto shadow-sm">
              <span className="font-serif font-bold text-2xl">E</span>
            </div>
          </Link>
          <h2 className="font-serif text-3xl font-bold text-forest">Create Your Account</h2>
          <p className="text-xs text-[#71695d]">
            Join thousands of masterclass attendees, creators, and workshop leaders.
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
            <label className="block text-xs font-bold text-forest mb-1.5">Full Name</label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-[#8c8273] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#ded7ca] bg-[#faf8f5] focus:bg-white focus:outline-none text-xs sm:text-sm font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-forest mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#8c8273] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.com"
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
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#ded7ca] bg-[#faf8f5] focus:bg-white focus:outline-none text-xs sm:text-sm font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-forest mb-2">I want to join as</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('ATTENDEE')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  role === 'ATTENDEE'
                    ? 'border-forest bg-[#faf8f5] ring-2 ring-forest/20'
                    : 'border-[#ded7ca] hover:bg-[#faf8f5]'
                }`}
              >
                <div className="font-bold text-xs text-forest">Learner</div>
                <div className="text-[10px] text-[#71695d]">Discover & attend events</div>
              </button>

              <button
                type="button"
                onClick={() => setRole('ORGANIZER')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  role === 'ORGANIZER'
                    ? 'border-terracotta bg-terracotta/5 ring-2 ring-terracotta/20'
                    : 'border-[#ded7ca] hover:bg-[#faf8f5]'
                }`}
              >
                <div className="font-bold text-xs text-terracotta">Organizer</div>
                <div className="text-[10px] text-[#71695d]">Host & sell masterclasses</div>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-forest hover:bg-forest-light text-[#faf8f5] font-bold text-sm shadow-warm transition-all flex items-center justify-center gap-2 pt-3"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Complete Registration</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="text-center text-xs text-[#71695d]">
          Already have an account?{' '}
          <Link href="/login" className="font-bold text-forest hover:text-terracotta underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
