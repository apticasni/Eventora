'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Event, Category } from '@eventora/shared';
import { api } from '@/lib/api';
import { MOCK_EVENTS, MOCK_CATEGORIES } from '@/lib/mockData';
import { EventCard } from '@/components/events/EventCard';
import { EventCoverImage } from '@/components/events/EventCoverImage';
import { Avatar } from '@/components/ui/Avatar';
import { formatDate } from '@/lib/utils';
import {
  Search,
  Sparkles,
  ArrowRight,
  ArrowUpRight,
  MapPin,
  Calendar,
  Award,
  Users,
  Compass,
  CheckCircle,
  ShieldCheck,
  TrendingUp,
  ChevronRight,
  Code2,
  Palette,
  Briefcase,
  Heart,
  Camera,
  Music,
  ChefHat,
  Rocket
} from 'lucide-react';

const categoryStyles: Record<string, { icon: typeof Code2; color: string }> = {
  technology: { icon: Code2, color: 'bg-blue-50 text-blue-700 ring-blue-100' },
  design: { icon: Palette, color: 'bg-violet-50 text-violet-700 ring-violet-100' },
  business: { icon: Briefcase, color: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
  'health-wellness': { icon: Heart, color: 'bg-rose-50 text-rose-700 ring-rose-100' },
  photography: { icon: Camera, color: 'bg-amber-50 text-amber-700 ring-amber-100' },
  music: { icon: Music, color: 'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-100' },
  cooking: { icon: ChefHat, color: 'bg-orange-50 text-orange-700 ring-orange-100' },
  leadership: { icon: Rocket, color: 'bg-cyan-50 text-cyan-700 ring-cyan-100' },
};

const categoryDescriptions: Record<string, string> = {
  technology: 'Build practical skills in software, AI and emerging tech.',
  design: 'Create thoughtful digital products and design systems.',
  business: 'Turn ambitious ideas into sustainable growth.',
  'health-wellness': 'Make space for mindfulness, movement and wellbeing.',
  photography: 'Tell richer stories through the art of photography.',
  music: 'Explore instruments, production and sound.',
  cooking: 'Learn techniques and recipes from working chefs.',
  leadership: 'Lead teams with clarity, empathy and purpose.',
};

export default function HomePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [events, setEvents] = useState<Event[]>(MOCK_EVENTS);
  const [categories, setCategories] = useState<Category[]>(MOCK_CATEGORIES);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [evRes, catRes] = await Promise.all([
          api.events.list({ limit: 12 }),
          api.events.categories(),
        ]);
        if (evRes.success && evRes.data?.items?.length) {
          setEvents(evRes.data.items);
        }
        if (catRes.success && catRes.data?.length) {
          setCategories(catRes.data);
        }
      } catch {
        // Fallback to rich mock data
      }
    }
    loadData();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/events?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push('/events');
    }
  };

  const featuredEvents = events.filter((e) => e.isFeatured);
  const heroFeatured = featuredEvents[0] || events[0];

  const filteredUpcoming = events
    .filter((e) => selectedCategory === 'all' || e.category?.slug === selectedCategory)
    .slice(0, 6);

  return (
    <div className="space-y-24 pb-20">
      {/* 1. Large Editorial Hero Section */}
      <section className="relative pt-12 md:pt-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Hero Narrative */}
          <div className="lg:col-span-7 space-y-8">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#f2ede4] border border-[#e2dacb] text-xs font-semibold text-forest uppercase tracking-widest">
              <Sparkles className="w-3.5 h-3.5 text-terracotta" />
              <span>Curated Masterclasses & Gatherings</span>
            </div>

            <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-forest leading-[1.08]">
              Where curious minds gather to{' '}
              <span className="italic font-normal text-terracotta underline decoration-terracotta/30 decoration-wavy">
                master
              </span>{' '}
              their craft.
            </h1>

            <p className="text-lg sm:text-xl text-[#5c5446] leading-relaxed max-w-2xl font-normal">
              Step inside intimate workshops, masterclasses, and intensive retreats led by world-class practitioners. Deeply tactile, rigorously focused, unmistakably human.
            </p>

            {/* Editorial Search Bar */}
            <form
              onSubmit={handleSearchSubmit}
              className="p-2 sm:p-2.5 bg-white rounded-2xl border border-[#ded7ca] shadow-warm-lg flex flex-col sm:flex-row gap-2 max-w-2xl"
            >
              <div className="flex-1 flex items-center gap-3 px-4 py-2 sm:py-0">
                <Search className="w-5 h-5 text-[#8c8273]" />
                <input
                  type="text"
                  placeholder="Search by topic, city, or instructor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent border-none text-forest placeholder-[#8c8273] focus:outline-none text-sm sm:text-base font-medium"
                />
              </div>

              <button
                type="submit"
                className="bg-forest hover:bg-forest-light text-[#faf8f5] px-7 py-3.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <span>Find Experience</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Micro Stats & Proof */}
            <div className="flex flex-wrap items-center gap-8 pt-4 border-t border-[#ebe4d8] text-xs sm:text-sm text-[#71695d]">
              <div>
                <span className="block font-serif text-2xl font-bold text-forest">150+</span>
                <span>Vetted Masterclasses</span>
              </div>
              <div className="w-px h-8 bg-[#ded7ca]" />
              <div>
                <span className="block font-serif text-2xl font-bold text-forest">98.4%</span>
                <span>Attendee Satisfaction</span>
              </div>
              <div className="w-px h-8 bg-[#ded7ca]" />
              <div>
                <span className="block font-serif text-2xl font-bold text-forest">15k+</span>
                <span>Alumni Connected</span>
              </div>
            </div>
          </div>

          {/* Right Hero: Spotlight Event Frame */}
          {heroFeatured && (
            <div className="lg:col-span-5 relative">
              <div className="absolute -inset-2 bg-gradient-to-tr from-terracotta/20 to-emerald-200/20 rounded-3xl blur-xl" />
              <div className="relative bg-white rounded-3xl border border-[#ded7ca] shadow-warm-lg p-6 space-y-5">
                <div className="relative aspect-[16/11] rounded-2xl overflow-hidden">
                  <EventCoverImage
                    src={heroFeatured.coverImage}
                    alt={heroFeatured.title}
                    label={heroFeatured.category?.name || 'Featured workshop'}
                    fallbackSrc={heroFeatured.images?.[0]}
                    categorySlug={heroFeatured.category?.slug}
                    sizes="(max-width: 1024px) 100vw, 40vw"
                    loading="eager"
                  />
                  <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-forest">
                    Featured Workshop
                  </div>
                  <div className="absolute bottom-3 right-3 bg-forest text-white px-3 py-1 rounded-full text-xs font-semibold">
                    {heroFeatured.isFree ? 'Free' : `₹${heroFeatured.price.toLocaleString('en-IN')}`}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-[#71695d]">
                    <Calendar className="w-3.5 h-3.5 text-terracotta" />
                    <span>{formatDate(heroFeatured.startDate, { timeZone: heroFeatured.timezone || 'UTC' })}</span>
                    <span>•</span>
                    <MapPin className="w-3.5 h-3.5 text-terracotta" />
                    <span>{heroFeatured.city || 'Virtual'}</span>
                  </div>

                  <h3 className="font-serif text-2xl font-bold text-forest hover:text-terracotta transition-colors leading-snug">
                    <Link href={`/events/${heroFeatured.slug}`}>{heroFeatured.title}</Link>
                  </h3>

                  <p className="text-sm text-[#5c5446] line-clamp-2 leading-relaxed">
                    {heroFeatured.shortDescription || heroFeatured.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-[#f0ede6] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={heroFeatured.instructorAvatar || heroFeatured.organizer?.avatar}
                      name={heroFeatured.instructorName || heroFeatured.organizer?.name || 'Instructor'}
                      className="w-10 h-10 rounded-full border border-[#ded7ca]"
                    />
                    <div>
                      <p className="text-xs text-[#8c8273]">Instructed by</p>
                      <p className="text-xs font-bold text-forest">{heroFeatured.instructorName || 'Master'}</p>
                    </div>
                  </div>

                  <Link
                    href={`/events/${heroFeatured.slug}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#f2ede4] hover:bg-[#e6dfd1] text-xs font-bold text-forest transition-colors"
                  >
                    <span>Reserve Seat</span>
                    <ChevronRight className="w-4 h-4 text-terracotta" />
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 2. Category Exploration Section */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-terracotta block mb-1">
              Curated Disciplines
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-forest">
              Explore by Discipline
            </h2>
          </div>
          <Link
            href="/events"
            className="text-sm font-semibold text-forest hover:text-terracotta inline-flex items-center gap-1 transition-colors"
          >
            <span>Browse Full Directory</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {categories.map((cat) => {
            const style = categoryStyles[cat.slug] || {
              icon: Sparkles,
              color: 'bg-[#f2ede4] text-forest ring-[#e5dfd3]',
            };
            const CategoryIcon = style.icon;

            return (
              <Link
                key={cat.id}
                href={`/events?category=${cat.slug}`}
                className="group relative flex min-h-36 items-center gap-4 overflow-hidden rounded-3xl border border-[#e6dfd3] bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-forest/25 hover:shadow-warm-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-2"
              >
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 transition-transform duration-300 group-hover:scale-105 ${style.color}`}>
                  <CategoryIcon aria-hidden="true" className="h-5 w-5" strokeWidth={1.8} />
                </span>

                <div className="min-w-0 pr-5">
                  <h3 className="font-serif text-lg font-bold text-forest transition-colors group-hover:text-terracotta">
                    {cat.name}
                  </h3>
                  <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-[#71695d]">
                    {cat.description || categoryDescriptions[cat.slug] || 'Explore expert-led sessions and hands-on experiences.'}
                  </p>
                </div>

                <span className="pointer-events-none absolute right-4 top-4">
                  <ArrowUpRight aria-hidden="true" className="h-4 w-4 text-[#b3a995] transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-forest" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 3. Featured Workshops Grid */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-terracotta block mb-1">
              Editor&apos;s Selection
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-forest">
              Featured Masterclasses
            </h2>
          </div>
          <p className="text-sm text-[#71695d] max-w-md">
            Rigorous hands-on programs selected for exceptional instruction, intimate cohort sizes, and tangible outcomes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {featuredEvents.slice(0, 3).map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      </section>

      {/* 4. Upcoming Events with Category Filtering */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-terracotta block mb-1">
              Upcoming Schedule
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-forest">
              Discover Upcoming Sessions
            </h2>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === 'all'
                  ? 'bg-forest text-white shadow-sm'
                  : 'bg-white border border-[#ded7ca] text-[#5c5446] hover:bg-[#f2ede4]'
              }`}
            >
              All Events
            </button>
            {categories.slice(0, 5).map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.slug)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat.slug
                    ? 'bg-forest text-white shadow-sm'
                    : 'bg-white border border-[#ded7ca] text-[#5c5446] hover:bg-[#f2ede4]'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredUpcoming.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/events"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-forest hover:bg-forest-light text-[#faf8f5] font-semibold text-sm shadow-warm transition-all"
          >
            <span>View All {events.length} Experiences</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* 5. Master Instructors Showcase */}
      <section className="bg-[#f2ede4] py-20 border-y border-[#e2dacb]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-terracotta">
              The Faculty
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-forest">
              Learn Directly from Industry Leaders
            </h2>
            <p className="text-sm text-[#5c5446]">
              Our instructors are active practitioners, startup founders, staff designers, and master craftspeople sharing battle-tested knowledge.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-2xl border border-[#ded7ca] shadow-warm text-center space-y-4">
              <Avatar
                src="https://images.unsplash.com/photo-1494790108755-2616b6bca7f0?w=200&auto=format&fit=crop"
                name="Priya Sharma"
                className="w-24 h-24 rounded-full mx-auto border-2 border-terracotta"
              />
              <div>
                <h3 className="font-serif text-lg font-bold text-forest">Priya Sharma</h3>
                <p className="text-xs text-terracotta font-semibold">Staff Product Designer</p>
              </div>
              <p className="text-xs text-[#5c5446] leading-relaxed">
                8+ years architecting design systems for Fortune 500 apps and mentoring 2,000+ UI/UX designers globally.
              </p>
              <div className="pt-2 border-t border-[#f0ede6] text-xs font-semibold text-forest">
                12 Workshops Hosted • 4.98 ★
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-[#ded7ca] shadow-warm text-center space-y-4">
              <Avatar
                src="https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=200&auto=format&fit=crop"
                name="Rahul Verma"
                className="w-24 h-24 rounded-full mx-auto border-2 border-forest"
              />
              <div>
                <h3 className="font-serif text-lg font-bold text-forest">Rahul Verma</h3>
                <p className="text-xs text-forest font-semibold">Founder & Cloud Architect</p>
              </div>
              <p className="text-xs text-[#5c5446] leading-relaxed">
                Co-founder of two VC-backed startups and creator of production systems serving millions of concurrent requests.
              </p>
              <div className="pt-2 border-t border-[#f0ede6] text-xs font-semibold text-forest">
                18 Workshops Hosted • 4.95 ★
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-[#ded7ca] shadow-warm text-center space-y-4">
              <Avatar
                src="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200&auto=format&fit=crop"
                name="Marco Rossi"
                className="w-24 h-24 rounded-full mx-auto border-2 border-amber-600"
              />
              <div>
                <h3 className="font-serif text-lg font-bold text-forest">Chef Marco Rossi</h3>
                <p className="text-xs text-amber-700 font-semibold">Executive Culinary Artist</p>
              </div>
              <p className="text-xs text-[#5c5446] leading-relaxed">
                Bologna-trained master pasta craftsman celebrating slow food traditions and artisanal techniques.
              </p>
              <div className="pt-2 border-t border-[#f0ede6] text-xs font-semibold text-forest">
                8 Masterclasses Hosted • 5.0 ★
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Testimonials & Social Proof */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="bg-[#ffffff] rounded-3xl border border-[#ded7ca] p-8 md:p-14 shadow-warm-lg">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-4 space-y-4">
              <span className="text-xs font-bold uppercase tracking-widest text-terracotta">
                Attendee Experiences
              </span>
              <h2 className="font-serif text-3xl font-bold text-forest leading-tight">
                &quot;The highest signal-to-noise learning format I have encountered.&quot;
              </h2>
              <p className="text-sm text-[#71695d]">
                Read feedback from attendees who transformed their careers and creative journeys.
              </p>
            </div>

            <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 rounded-2xl bg-[#faf8f5] border border-[#ebe4d8] space-y-3">
                <div className="flex text-amber-500">★★★★★</div>
                <p className="text-sm text-[#40382b] italic">
                  &quot;Priya&apos;s Figma workshop gave me the exact confidence I needed to land my first Staff Designer position. The token architecture segment alone was worth 10x the ticket.&quot;
                </p>
                <div className="pt-2">
                  <p className="text-xs font-bold text-forest">Aisha Khan</p>
                  <p className="text-[11px] text-[#8c8273]">Product Designer at FinTech Co.</p>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-[#faf8f5] border border-[#ebe4d8] space-y-3">
                <div className="flex text-amber-500">★★★★★</div>
                <p className="text-sm text-[#40382b] italic">
                  &quot;The React &amp; Next.js Masterclass saved our startup weeks of architectural debt. You walk away with clean, deployable mental models.&quot;
                </p>
                <div className="pt-2">
                  <p className="text-xs font-bold text-forest">Vikram Singh</p>
                  <p className="text-[11px] text-[#8c8273]">Co-founder & CTO</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Call To Action Banner */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="bg-forest rounded-3xl p-10 md:p-16 text-center text-[#faf8f5] space-y-6 relative overflow-hidden shadow-warm-lg">
          <div className="absolute top-0 right-0 w-96 h-96 bg-forest-light/30 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <span className="text-xs font-bold uppercase tracking-widest text-terracotta bg-white/10 px-3.5 py-1.5 rounded-full">
              Host on Eventora
            </span>
            <h2 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight">
              Have expertise to share with the world?
            </h2>
            <p className="text-base text-[#d1c8b8] leading-relaxed">
              We provide ticket infrastructure, Razorpay integration, QR check-in badges, and a community of high-intent learners.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/organizer/proposals/new"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-terracotta hover:bg-terracotta-dark text-white font-semibold text-sm transition-all shadow-md"
              >
                Submit Workshop Proposal
              </Link>
              <Link
                href="/events"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-[#faf8f5] font-semibold text-sm border border-white/20 transition-all"
              >
                Explore Active Events
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
