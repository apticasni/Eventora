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
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [sortBy, setSortBy] = useState<string>('date');
  const [page, setPage] = useState(1);

  const [eventsState, setEventsState] = useState(initialEventsDiscoveryState);
  const [categories, setCategories] = useState<Category[]>(MOCK_CATEGORIES);
  const [retryCount, setRetryCount] = useState(0);
  const category = getCategoryFilter(searchParams);

  useEffect(() => {
    api.events.categories().then((res) => {
      if (res.success && res.data) setCategories(res.data);
    });
  }, []);

  useEffect(() => {
    let active = true;

    async function fetchEvents() {
      setEventsState({ status: 'loading' });
      try {
        const res = await api.events.list({
          q: search || undefined,
          category: category !== 'all' ? category : undefined,
          format: format !== 'all' ? (format as any) : undefined,
          isFree: priceFilter === 'free' ? 'true' : priceFilter === 'paid' ? 'false' : undefined,
          city: cityFilter !== 'all' ? cityFilter : undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          minPrice: minPrice || undefined,
          maxPrice: maxPrice || undefined,
          available: availableOnly ? 'true' : undefined,
          sortBy: sortBy as any,
          page,
          limit: 9,
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
  }, [search, category, format, priceFilter, cityFilter, startDate, endDate, minPrice, maxPrice, availableOnly, sortBy, page, retryCount]);

  const events = eventsState.status === 'success' ? eventsState.events : [];
  const loading = eventsState.status === 'loading';

  // Client-side filtering fallback
  const filteredEvents = events;
  const totalPages = eventsState.status === 'success' ? eventsState.totalPages : 0;
  const totalEvents = eventsState.status === 'success' ? eventsState.total : 0;
  const hasActiveFilters = Boolean(
    search || category !== 'all' || format !== 'all' || priceFilter !== 'all' ||
    cityFilter !== 'all' || startDate || endDate || minPrice || maxPrice || availableOnly,
  );

  const resetFilters = () => {
    setSearch('');
    router.replace(getEventsHrefWithCategory(searchParams, 'all'), { scroll: false });
    setFormat('all');
    setPriceFilter('all');
    setCityFilter('all');
    setStartDate('');
    setEndDate('');
    setMinPrice('');
    setMaxPrice('');
    setAvailableOnly(false);
    setSortBy('date');
    setPage(1);
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
              placeholder="Search by event name, topic, or instructor..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
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
              onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
              className="px-4 py-2.5 rounded-xl border border-[#ded7ca] bg-[#faf8f5] text-xs font-semibold text-forest focus:outline-none"
            >
              <option value="date">Sort: Upcoming First</option>
              <option value="popularity">Sort: Most Popular</option>
              <option value="price">Sort: Price (Low to High)</option>
              <option value="price_desc">Sort: Price (High to Low)</option>
            </select>

            {(search || category !== 'all' || format !== 'all' || priceFilter !== 'all' || cityFilter !== 'all' || startDate || endDate || minPrice || maxPrice || availableOnly) && (
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
            onChange={(e) => { setPage(1); router.replace(getEventsHrefWithCategory(searchParams, e.target.value), { scroll: false }); }}
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
            onChange={(e) => { setFormat(e.target.value); setPage(1); }}
            className="px-3 py-1.5 rounded-lg border border-[#ded7ca] bg-white text-xs font-medium text-[#40382b] focus:outline-none"
          >
            <option value="all">All Formats</option>
            <option value="IN_PERSON">In-Person Only</option>
            <option value="ONLINE">Virtual Only</option>
            <option value="HYBRID">Hybrid</option>
          </select>

          {/* Price (Free / Paid) */}
          <select
            value={priceFilter}
            onChange={(e) => { setPriceFilter(e.target.value); setPage(1); }}
            className="px-3 py-1.5 rounded-lg border border-[#ded7ca] bg-white text-xs font-medium text-[#40382b] focus:outline-none"
          >
            <option value="all">All Prices</option>
            <option value="free">Free Only</option>
            <option value="paid">Paid Masterclasses</option>
          </select>

          {/* City Filter */}
          <label className="sr-only" htmlFor="event-location">Location</label>
          <input id="event-location" value={cityFilter === 'all' ? '' : cityFilter} onChange={(e) => { setCityFilter(e.target.value || 'all'); setPage(1); }} placeholder="Location / city" className="w-40 px-3 py-1.5 rounded-lg border border-[#ded7ca] bg-white text-xs" />
          <label className="sr-only" htmlFor="event-start-date">Start date</label>
          <input id="event-start-date" type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} className="px-3 py-1.5 rounded-lg border border-[#ded7ca] bg-white text-xs" />
          <label className="sr-only" htmlFor="event-end-date">End date</label>
          <input id="event-end-date" type="date" value={endDate} min={startDate || undefined} onChange={(e) => { setEndDate(e.target.value); setPage(1); }} className="px-3 py-1.5 rounded-lg border border-[#ded7ca] bg-white text-xs" />
          <label className="sr-only" htmlFor="event-min-price">Minimum price</label>
          <input id="event-min-price" type="number" min="0" max={maxPrice || undefined} value={minPrice} onChange={(e) => { setMinPrice(e.target.value); setPage(1); }} placeholder="Min price" className="w-24 px-3 py-1.5 rounded-lg border border-[#ded7ca] bg-white text-xs" />
          <label className="sr-only" htmlFor="event-max-price">Maximum price</label>
          <input id="event-max-price" type="number" min={minPrice || 0} value={maxPrice} onChange={(e) => { setMaxPrice(e.target.value); setPage(1); }} placeholder="Max price" className="w-24 px-3 py-1.5 rounded-lg border border-[#ded7ca] bg-white text-xs" />
          <label className="inline-flex items-center gap-2 rounded-lg border border-[#ded7ca] bg-white px-3 py-1.5 text-xs">
            <input type="checkbox" checked={availableOnly} onChange={(e) => { setAvailableOnly(e.target.checked); setPage(1); }} />
            Seats available
          </label>

          <div className="ml-auto text-xs text-[#8c8273] font-medium">
            {loading ? (
              'Loading experiences…'
            ) : (
              <>Showing <span className="font-bold text-forest">{filteredEvents.length}</span> of {totalEvents} experiences</>
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
        <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
        {totalPages > 1 && <nav aria-label="Event pages" className="flex items-center justify-center gap-4">
          <button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-[#ded7ca] px-4 py-2 text-sm disabled:opacity-50">Previous</button>
          <span aria-live="polite" className="text-sm text-[#5c5446]">Page {page} of {totalPages}</span>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-[#ded7ca] px-4 py-2 text-sm disabled:opacity-50">Next</button>
        </nav>}
        </>
      ) : (
        <div className="bg-white rounded-3xl border border-[#ded7ca] p-16 text-center space-y-4 max-w-xl mx-auto shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-[#faf8f5] flex items-center justify-center mx-auto text-3xl">
            🔍
          </div>
          <h3 className="font-serif text-2xl font-bold text-forest">
            {hasActiveFilters
              ? 'No experiences found'
              : 'No experiences available yet'}
          </h3>
          <p className="text-sm text-[#71695d]">
            {hasActiveFilters
              ? 'We could not find any events matching your selected filters. Try broadening your search or resetting filters.'
              : 'There are no published experiences to show right now. Please check back soon.'}
          </p>
          {hasActiveFilters && (
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
