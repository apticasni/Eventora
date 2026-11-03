import React from 'react';
import Link from 'next/link';
import { Event } from '@eventora/shared';
import { formatDate, formatCurrency } from '@/lib/utils';
import { Calendar, MapPin, Users, Video, Star } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';

interface EventCardProps {
  event: Event;
  featured?: boolean;
}

export function EventCard({ event, featured = false }: EventCardProps) {
  const isSoldOut = event.availableSeats <= 0;

  return (
    <div className={`group bg-[#ffffff] rounded-2xl border border-[#e5dfd3] overflow-hidden shadow-warm hover:shadow-warm-lg transition-all duration-300 flex flex-col ${
      featured ? 'lg:col-span-2 md:flex-row' : ''
    }`}>
      {/* Cover Image */}
      <div className={`relative overflow-hidden bg-[#f0ede6] ${
        featured ? 'md:w-1/2 aspect-[16/10] md:aspect-auto' : 'aspect-[16/10]'
      }`}>
        <img
          src={event.coverImage || 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop'}
          alt={event.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
          <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-white/95 text-forest backdrop-blur-sm shadow-sm">
            {event.category?.name || 'Workshop'}
          </span>

          <span className={`px-2.5 py-1 rounded-full text-xs font-medium backdrop-blur-sm flex items-center gap-1 ${
            event.format === 'ONLINE'
              ? 'bg-blue-900/80 text-blue-100'
              : 'bg-emerald-950/80 text-emerald-100'
          }`}>
            {event.format === 'ONLINE' ? <Video className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
            {event.format === 'ONLINE' ? 'Virtual' : event.city || 'In-Person'}
          </span>
        </div>

        {/* Sold out overlay tag if applicable */}
        {isSoldOut && (
          <div className="absolute bottom-3 left-3 bg-terracotta text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
            Sold Out • Waitlist Open
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="p-6 flex-1 flex flex-col justify-between">
        <div>
          {/* Date & Rating Meta */}
          <div className="flex items-center justify-between text-xs text-[#71695d] mb-2 font-medium">
            <span className="flex items-center gap-1.5 text-forest font-semibold">
              <Calendar className="w-3.5 h-3.5 text-terracotta" />
              {formatDate(event.startDate)}
            </span>
            {event.averageRating && (
              <span className="flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                {event.averageRating} ({event.reviewCount || 0})
              </span>
            )}
          </div>

          {/* Title */}
          <Link href={`/events/${event.slug}`}>
            <h3 className="font-serif text-xl font-bold text-forest group-hover:text-terracotta transition-colors line-clamp-2 leading-snug mb-2">
              {event.title}
            </h3>
          </Link>

          {/* Description snippet */}
          <p className="text-sm text-[#5c5446] line-clamp-2 leading-relaxed mb-4">
            {event.shortDescription || event.description}
          </p>
        </div>

        {/* Footer Area: Instructor & Price / Seats */}
        <div className="pt-4 border-t border-[#f0ede6] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Avatar
              src={event.instructorAvatar || event.organizer?.avatar}
              name={event.instructorName || event.organizer?.name || 'Instructor'}
              className="w-7 h-7 rounded-full border border-[#ded7ca]"
            />
            <span className="text-xs text-[#40382b] font-medium truncate max-w-[120px]">
              {event.instructorName || event.organizer?.name || 'Master Instructor'}
            </span>
          </div>

          <div className="text-right">
            <div className="text-base font-serif font-bold text-forest">
              {event.isFree ? (
                <span className="text-emerald-700 font-sans text-sm uppercase tracking-wider font-semibold">Free</span>
              ) : (
                formatCurrency(event.price, event.currency)
              )}
            </div>
            <div className="text-[11px] text-[#8c8273]">
              {isSoldOut ? (
                <span className="text-terracotta font-medium">Waitlist only</span>
              ) : (
                <span>{event.availableSeats} seats remaining</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
