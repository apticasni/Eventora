'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Category } from '@eventora/shared';
import { api } from '@/lib/api';
import { MOCK_CATEGORIES } from '@/lib/mockData';
import {
  eventsDiscoveryStateFromResponse,
  initialEventsDiscoveryState,
} from '@/lib/eventsDiscovery';
import { getCategoryFilter, getEventsHrefWithCategory } from '@/lib/eventsNavigation';
import { EventCard } from '@/components/events/EventCard';
import {
  Search,
  Filter,
  SlidersHorizontal,
  X,
  MapPin,
  Calendar,
  Sparkles,
  RefreshCw
} from 'lucide-react';

function EventsDiscoveryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get('q') || '';

  const [search, setSearch] = useState(initialQ);
  const [format, setFormat] = useState<string>('all');
  const [priceFilter, setPriceFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date');

  const [eventsState, setEventsState] = useState(initialEventsDiscoveryState);
  const [categories, setCategories] = useState<Category[]>(MOCK_CATEGORIES);
  const [retryCount, setRetryCount] = useState(0);
  const category = getCategoryFilter(searchParams);

  useEffect(() => {
    let active = true;

    async function fetchEvents() {
      setEventsState({ status: 'loading' });
      try {
        const res = await api.events.list({
          q: search || undefined,
          category: category !== 'all' ? category : undefined,
          format: format !== 'all' ? (format as any) : undefined,
          isFree: priceFilter === 'free' ? 'true' : undefined,
          sortBy: sortBy as any,
        });
        if (active) setEventsState(eventsDiscoveryStateFromResponse(res));
      } catch {
        if (active) {
          setEventsState({
            status: 'error',
            message: 'Unable to load experiences. Please check your connection and try again.',
          });
        }
      }
    }

    fetchEvents();

    return () => {
      active = false;
    };
  }, [search, category, format, priceFilter, sortBy, retryCount]);

  const events = eventsState.status === 'success' ? eventsState.events : [];
  const loading = eventsState.status === 'loading';

  // Client-side filtering fallback
  const filteredEvents = events.filter((e) => {
    if (search) {
      const q = search.toLowerCase();
      const match =
        e.title.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.city?.toLowerCase().includes(q) ||
        e.instructorName?.toLowerCase().includes(q);
      if (!match) return false;
    }

    if (category !== 'all' && e.category?.slug !== category) return false;
    if (format !== 'all' && e.format !== format) return false;
    if (priceFilter === 'free' && !e.isFree) return false;
    if (priceFilter === 'paid' && e.isFree) return false;
    if (cityFilter !== 'all' && e.city?.toLowerCase() !== cityFilter.toLowerCase()) return false;

    return true;
  });

  // Extract unique cities
  const cities = Array.from(
    new Set(events.map((e) => e.city).filter(Boolean) as string[])
  );

  const resetFilters = () => {
    setSearch('');
    router.replace(getEventsHrefWithCategory(searchParams, 'all'), { scroll: false });
    setFormat('all');
    setPriceFilter('all');
    setCityFilter('all');
    setSortBy('date');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Editorial Header */}
      <div className="space-y-3 border-b border-[#e5dfd3] pb-8">
        <span className="text-xs font-bold uppercase tracking-widest text-terracotta">
          Curated Catalog
        </span>
        <h1 className="font-serif text-3xl sm:text-5xl font-bold text-forest">
          Explore Workshops & Masterclasses
        </h1>
        <p className="text-sm sm:text-base text-[#5c5446] max-w-2xl font-normal">
          Filter through upcoming cohorts across engineering, design systems, executive leadership, culinary arts, and photography.
        </p>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-2xl border border-[#ded7ca] p-4 sm:p-5 shadow-warm space-y-4">
        {/* Top search input row */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 text-[#8c8273] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by topic, keyword, or instructor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-[#ded7ca] bg-[#faf8f5] focus:bg-white focus:outline-none focus:ring-2 focus:ring-forest/20 text-sm font-medium"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8c8273] hover:text-forest"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-[#ded7ca] bg-[#faf8f5] text-xs font-semibold text-forest focus:outline-none"
            >
              <option value="date">Sort: Upcoming First</option>
              <option value="popularity">Sort: Most Popular</option>
              <option value="price">Sort: Price (Low to High)</option>
              <option value="price_desc">Sort: Price (High to Low)</option>
            </select>

            {(search || category !== 'all' || format !== 'all' || priceFilter !== 'all' || cityFilter !== 'all') && (
              <button
                onClick={resetFilters}
                className="p-2.5 rounded-xl border border-[#ded7ca] bg-[#f2ede4] text-xs font-bold text-forest hover:bg-[#e6dfd1] transition-colors"
                title="Reset Filters"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Filter Badges Row */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#f0ede6]">
          {/* Category Dropdown */}
          <select
            value={category}
            onChange={(e) => router.replace(
              getEventsHrefWithCategory(searchParams, e.target.value),
              { scroll: false },
            )}
            className="px-3 py-1.5 rounded-lg border border-[#ded7ca] bg-white text-xs font-medium text-[#40382b] focus:outline-none"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Format (In-Person / Online) */}
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-[#ded7ca] bg-white text-xs font-medium text-[#40382b] focus:outline-none"
          >
            <option value="all">All Formats</option>
            <option value="IN_PERSON">In-Person Only</option>
            <option value="ONLINE">Virtual Only</option>
          </select>

          {/* Price (Free / Paid) */}
          <select
            value={priceFilter}
            onChange={(e) => setPriceFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-[#ded7ca] bg-white text-xs font-medium text-[#40382b] focus:outline-none"
          >
            <option value="all">All Prices</option>
            <option value="free">Free Only</option>
            <option value="paid">Paid Masterclasses</option>
          </select>

          {/* City Filter */}
          {cities.length > 0 && (
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-[#ded7ca] bg-white text-xs font-medium text-[#40382b] focus:outline-none"
            >
              <option value="all">All Cities</option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          )}

          <div className="ml-auto text-xs text-[#8c8273] font-medium">
            {loading ? (
              'Loading experiences…'
            ) : (
              <>Showing <span className="font-bold text-forest">{filteredEvents.length}</span> experiences</>
            )}
          </div>
        </div>
      </div>

      {/* Events Results Grid */}
      {loading ? (
        <div role="status" aria-live="polite" className="rounded-3xl border border-[#ded7ca] bg-white p-12 text-center text-sm text-[#71695d]">
          Loading experiences…
        </div>
      ) : eventsState.status === 'error' ? (
        <div role="alert" className="rounded-3xl border border-red-200 bg-red-50 p-12 text-center space-y-4 max-w-xl mx-auto">
          <h3 className="font-serif text-2xl font-bold text-forest">We could not load experiences</h3>
          <p className="text-sm text-[#71695d]">{eventsState.message}</p>
          <button
            onClick={() => setRetryCount((count) => count + 1)}
            className="px-6 py-2.5 rounded-xl bg-forest text-[#faf8f5] text-xs font-bold hover:bg-forest-light transition-all"
          >
            Try Again
          </button>
        </div>
      ) : filteredEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-[#ded7ca] p-16 text-center space-y-4 max-w-xl mx-auto shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-[#faf8f5] flex items-center justify-center mx-auto text-3xl">
            🔍
          </div>
          <h3 className="font-serif text-2xl font-bold text-forest">
            {search || category !== 'all' || format !== 'all' || priceFilter !== 'all' || cityFilter !== 'all'
              ? 'No experiences found'
              : 'No experiences available yet'}
          </h3>
          <p className="text-sm text-[#71695d]">
            {search || category !== 'all' || format !== 'all' || priceFilter !== 'all' || cityFilter !== 'all'
              ? 'We could not find any events matching your selected filters. Try broadening your search or resetting filters.'
              : 'There are no published experiences to show right now. Please check back soon.'}
          </p>
          {(search || category !== 'all' || format !== 'all' || priceFilter !== 'all' || cityFilter !== 'all') && (
            <button
              onClick={resetFilters}
              className="px-6 py-2.5 rounded-xl bg-forest text-[#faf8f5] text-xs font-bold hover:bg-forest-light transition-all"
            >
              Clear All Filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function EventsDiscoveryPage() {
  return (
    <Suspense fallback={<div className="py-24 text-center font-serif text-forest">Loading catalog...</div>}>
      <EventsDiscoveryContent />
    </Suspense>
  );
}
