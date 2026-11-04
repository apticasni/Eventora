'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus } from 'lucide-react';
import { api, OrganizerEventSummary } from '@/lib/api';
import { formatDate } from '@/lib/utils';

export default function OrganizerEventsPage() {
  const [events, setEvents] = useState<OrganizerEventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadEvents() {
      try {
        const response = await api.organizer.events();
        if (!active) return;
        if (!response.success || !response.data) {
          setEvents([]);
          setError(response.message || 'Unable to load your workshops. Please try again.');
          return;
        }
        setEvents(response.data);
      } catch {
        if (active) {
          setEvents([]);
          setError('Unable to load your workshops. Please check your connection and try again.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadEvents();
    return () => {
      active = false;
    };
  }, [retryCount]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <Link
        href="/organizer"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-forest hover:text-terracotta"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Organizer Studio</span>
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e5dfd3] pb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-terracotta">Organizer Portal</span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-forest">Your Workshops</h1>
          <p className="mt-2 text-sm text-[#71695d]">Manage and review the workshops you have created.</p>
        </div>
        <Link
          href="/organizer/events/new"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-forest text-white text-xs font-bold hover:bg-forest-light"
        >
          <Plus className="w-4 h-4" />
          Create Workshop
        </Link>
      </div>

      {loading ? (
        <div role="status" aria-live="polite" className="rounded-3xl border border-[#ded7ca] bg-white p-12 text-center text-sm text-[#71695d]">
          Loading your workshops…
        </div>
      ) : error ? (
        <div role="alert" className="rounded-3xl border border-red-200 bg-red-50 p-10 text-center space-y-4">
          <p className="text-sm text-red-800">{error}</p>
          <button
            onClick={() => {
              setLoading(true);
              setError(null);
              setRetryCount((count) => count + 1);
            }}
            className="px-5 py-2.5 rounded-xl bg-forest text-white text-xs font-bold hover:bg-forest-light"
          >
            Try Again
          </button>
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-3xl border border-[#ded7ca] bg-white p-12 text-center space-y-4">
          <h2 className="font-serif text-2xl font-bold text-forest">No workshops yet</h2>
          <p className="text-sm text-[#71695d]">Create a workshop to start building your event roster.</p>
          <Link
            href="/organizer/events/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-forest text-white text-xs font-bold hover:bg-forest-light"
          >
            <Plus className="w-4 h-4" />
            Create Workshop
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <article key={event.id} className="rounded-2xl border border-[#ded7ca] bg-white p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#f2ede4] px-2.5 py-1 text-[10px] font-bold uppercase text-forest">
                      {event.status.toLowerCase()}
                    </span>
                    <span className="text-xs text-[#71695d]">{event.category.name}</span>
                  </div>
                  <h2 className="font-serif text-xl font-bold text-forest">{event.title}</h2>
                  <p className="text-xs text-[#71695d]">
                    {formatDate(event.startDate)} · {event._count.bookings} bookings · {event.bookedSeats}/{event.totalCapacity} seats
                  </p>
                </div>
                {event.status === 'PUBLISHED' && (
                  <Link
                    href={`/events/${event.slug}`}
                    className="shrink-0 rounded-xl border border-forest px-4 py-2.5 text-center text-xs font-bold text-forest hover:bg-[#f2ede4]"
                  >
                    View Public Listing
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
