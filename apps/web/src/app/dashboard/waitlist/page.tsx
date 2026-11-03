'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Users, Clock, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function WaitlistDashboardPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimMessage, setClaimMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadWaitlist() {
      try {
        const res = await api.waitlist.list();
        if (res.success && res.data) {
          setEntries(res.data);
        } else {
          setEntries([]);
        }
      } catch {
        // Fallback
      } finally {
        setLoading(false);
      }
    }
    loadWaitlist();
  }, []);

  const handleClaim = async (entryId: string) => {
    const res = await api.waitlist.claim(entryId);
    if (!res.success) {
      setClaimMessage(res.message || 'Could not claim this seat.');
      return;
    }
    setClaimMessage(res.message || 'Seat claimed successfully! Your booking is now confirmed.');
    setEntries(entries.map((e) => (e.id === entryId ? { ...e, status: 'CONFIRMED' } : e)));
  };

  const handleLeave = async (eventId: string) => {
    const res = await api.waitlist.leave(eventId);
    if (!res.success) {
      setClaimMessage(res.message || 'Could not leave the waitlist.');
      return;
    }
    setEntries(entries.filter((e) => e.eventId !== eventId));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <span className="text-xs font-bold uppercase tracking-widest text-terracotta">
          Queue Status
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-forest">
          My Waitlist Claims
        </h1>
        <p className="text-xs sm:text-sm text-[#71695d]">
          FIFO queue positions and pending 2-hour claim invitations for fully-booked masterclasses.
        </p>
      </div>

      {claimMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{claimMessage}</span>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-forest border-t-transparent rounded-full mx-auto" />
        </div>
      ) : entries.length > 0 ? (
        <div className="space-y-4">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="bg-white rounded-3xl border border-[#ded7ca] p-6 sm:p-8 shadow-warm flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      entry.status === 'OFFERED'
                        ? 'bg-amber-100 text-amber-800 animate-pulse'
                        : entry.status === 'CONFIRMED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-stone-100 text-stone-700'
                    }`}
                  >
                    {entry.status === 'OFFERED' ? 'Seat Offered • Claim Window Open' : entry.status}
                  </span>

                  <span className="text-xs font-medium text-[#71695d]">
                    Position #{entry.position} in queue
                  </span>
                </div>

                <h3 className="font-serif text-2xl font-bold text-forest">
                  {entry.event?.title}
                </h3>

                {entry.status === 'OFFERED' && (
                  <div className="flex items-center gap-2 text-xs text-amber-900 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                    <Clock className="w-4 h-4 text-terracotta shrink-0" />
                    <span>
                      2-Hour Claim Window: Seat reserved until{' '}
                      <strong>{entry.offerExpiresAt ? new Date(entry.offerExpiresAt).toLocaleTimeString() : '2 hours'}</strong>. If unclaimed, it passes to the next attendee.
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                {entry.status === 'OFFERED' && (
                  <button
                    onClick={() => handleClaim(entry.id)}
                    className="px-6 py-3 rounded-xl bg-terracotta hover:bg-terracotta-dark text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
                  >
                    <span>Claim Your Seat</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}

                {entry.status === 'WAITING' && (
                  <button
                    onClick={() => handleLeave(entry.eventId)}
                    className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-semibold"
                  >
                    Leave Queue
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-[#ded7ca] p-16 text-center space-y-4 max-w-lg mx-auto shadow-sm">
          <Users className="w-12 h-12 text-[#8c8273] mx-auto" />
          <h3 className="font-serif text-2xl font-bold text-forest">No waitlist entries</h3>
          <p className="text-xs text-[#71695d]">
            When masterclasses reach capacity, you can join their waitlist to get prioritized seat release notifications.
          </p>
        </div>
      )}
    </div>
  );
}
