'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Event } from '@eventora/shared';
import { EventCard } from '@/components/events/EventCard';
import { api } from '@/lib/api';
import { Bookmark } from 'lucide-react';

export default function SavedEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.savedEvents.list().then((response) => {
      if (response.success && response.data) {
        setEvents(response.data.map((saved) => saved.event));
      } else {
        setError(response.message || 'Could not load saved events.');
      }
    }).catch(() => setError('Could not load saved events.')).finally(() => setLoading(false));
  }, []);

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <header>
        <p className="text-xs font-bold uppercase tracking-widest text-terracotta">Your collection</p>
        <h1 className="font-serif text-3xl font-bold text-forest">Saved Events</h1>
        <p className="mt-2 text-sm text-[#71695d]">Events you bookmarked to revisit later.</p>
      </header>
      {loading ? (
        <div role="status" className="py-16 text-center text-sm text-[#71695d]">Loading saved events…</div>
      ) : error ? (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">{error}</div>
      ) : events.length ? (
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => <EventCard key={event.id} event={event} />)}
        </div>
      ) : (
        <section className="rounded-3xl border border-[#ded7ca] bg-white p-12 text-center">
          <Bookmark className="mx-auto mb-4 h-10 w-10 text-[#8c8273]" aria-hidden="true" />
          <h2 className="font-serif text-2xl font-bold text-forest">Nothing saved yet</h2>
          <p className="my-3 text-sm text-[#71695d]">Bookmark an event to keep it in your collection.</p>
          <Link className="font-semibold text-forest underline" href="/events">Explore events</Link>
        </section>
      )}
    </main>
  );
}
