'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Event, Review } from '@eventora/shared';
import { api } from '@/lib/api';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, formatTime, formatCurrency } from '@/lib/utils';
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  Users,
  CheckCircle2,
  Share2,
  Download,
  AlertCircle,
  Star,
  Sparkles,
  ArrowLeft,
  ShieldCheck,
  Check,
  Bookmark,
} from 'lucide-react';
import { EventCoverImage } from '@/components/events/EventCoverImage';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function EventDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const router = useRouter();
  const { user } = useAuth();

  const [event, setEvent] = useState<Event | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [eventLoadError, setEventLoadError] = useState<string | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [canRetryPayment, setCanRetryPayment] = useState(false);
  const [bookingMessage, setBookingMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [waitlistJoined, setWaitlistJoined] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [savedEventKey, setSavedEventKey] = useState<string | null>(null);
  const [savingEvent, setSavingEvent] = useState(false);

  // New review form state
  const [userRating, setUserRating] = useState(5);
  const [userComment, setUserComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    async function loadEvent() {
      setLoading(true);
      try {
        const res = await api.events.get(slug);
        if (res.success && res.data) {
          setEvent(res.data);
          setEventLoadError(null);
          const revRes = await api.reviews.forEvent(res.data.id);
          if (revRes.success && revRes.data?.reviews) {
            setReviews(revRes.data.reviews);
          }
        } else {
          setEvent(null);
          setEventLoadError(res.message || 'This event is not available in the catalog.');
        }
      } catch {
        setEvent(null);
        setEventLoadError('Unable to load this event. Please check your connection and try again.');
      } finally {
        setLoading(false);
      }
    }
    loadEvent();
  }, [slug]);

  const userId = user?.id;
  const eventId = event?.id;
  const isSaved = Boolean(userId && eventId && savedEventKey === `${userId}:${eventId}`);

  useEffect(() => {
    let active = true;
    if (!userId || !eventId) return () => { active = false; };
    api.savedEvents.list().then((res) => {
      if (active && res.success && res.data) {
        setSavedEventKey(res.data.some((saved) => saved.eventId === eventId) ? `${userId}:${eventId}` : null);
      }
    });
    return () => { active = false; };
  }, [userId, eventId]);

  const toggleSavedEvent = async () => {
    if (!event) return;
    if (!user) {
      router.push(`/login?redirect=/events/${slug}`);
      return;
    }
    setSavingEvent(true);
    try {
      const response = isSaved
        ? await api.savedEvents.remove(event.id)
        : await api.savedEvents.save(event.id);
      if (!response.success) {
        setBookingMessage({ type: 'error', text: response.message || 'Could not update your saved events.' });
        return;
      }
      setSavedEventKey(isSaved ? null : `${user.id}:${event.id}`);
    } finally {
      setSavingEvent(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-forest border-t-transparent rounded-full mx-auto" />
        <p className="mt-4 text-sm font-serif text-[#71695d]">Curating experience details...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="font-serif text-3xl font-bold text-forest">Experience Not Found</h2>
        <p className="text-sm text-[#71695d]">{eventLoadError || 'The event you are looking for may have concluded or been relocated.'}</p>
        <Link href="/events" className="inline-block px-6 py-2.5 bg-forest text-white rounded-xl text-sm font-semibold">
          Browse Active Catalog
        </Link>
      </div>
    );
  }

  const isSoldOut = event.availableSeats <= 0;
  const totalPrice = event.isFree ? 0 : event.price * selectedSeats;

  // Handle Registration / Razorpay Checkout
  const handleBooking = async () => {
    if (!user) {
      router.push(`/login?redirect=/events/${slug}`);
      return;
    }

    setBookingLoading(true);
    setBookingMessage(null);
    setCanRetryPayment(false);

    try {
      // 1. Create booking on backend
      const bookingRes = await api.bookings.create({
        eventId: event.id,
        seats: selectedSeats,
      });

      if (!bookingRes.success || !bookingRes.data) {
        setBookingMessage({
          type: 'error',
          text: bookingRes.message || 'Could not create a booking. Please try again.',
        });
        return;
      }

      const { booking, needsPayment } = bookingRes.data;

      // Free event -> Confirmed immediately!
      if (!needsPayment) {
        setBookingMessage({
          type: 'success',
          text: 'Booking confirmed! Your digital QR tickets have been added to your wallet.',
        });
        setTimeout(() => {
          router.push('/dashboard/bookings');
        }, 1500);
        return;
      }
      setCanRetryPayment(true);

      // Paid event -> Initialize Razorpay Test Checkout
      const orderRes = await api.payments.createOrder(booking.id);
      if (!orderRes.success || !orderRes.data) {
        setBookingMessage({
          type: 'error',
          text: orderRes.message || 'Could not start payment. Your seats are held until you complete checkout or cancel.',
        });
        return;
      }

      const orderData = orderRes.data;
      const configuredTestKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      if (
        !configuredTestKey?.startsWith('rzp_test_') ||
        orderData.keyId !== configuredTestKey
      ) {
        setBookingMessage({
          type: 'error',
          text: 'Razorpay Test Mode keys are missing or do not match. Configure the same test key ID in the API and web environments.',
        });
        return;
      }

      // Configure Razorpay checkout
      const options = {
        key: configuredTestKey,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Eventora Experiences',
        description: `Booking for ${event.title}`,
        order_id: orderData.orderId,
        handler: async function (response: any) {
          try {
            const verifyRes = await api.payments.verify({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              bookingId: booking.id,
            });

            if (verifyRes.success) {
              setCanRetryPayment(false);
              setBookingMessage({
                type: 'success',
                text: 'Payment verified! Your tickets and QR passes are ready in your wallet.',
              });
              setTimeout(() => {
                router.push('/dashboard/bookings');
              }, 1500);
            } else {
              setCanRetryPayment(true);
              setBookingMessage({
                type: 'error',
                text: verifyRes.message || 'Payment is not confirmed yet. You can retry this test order.',
              });
            }
          } catch {
            setCanRetryPayment(true);
            setBookingMessage({
              type: 'error',
              text: 'Payment confirmation could not be checked. Your booking remains pending; retry the same test order.',
            });
          }
        },
        prefill: {
          name: user.name,
          email: user.email,
        },
        theme: {
          color: '#1a3a2a',
        },
        modal: {
          ondismiss: () => {
            setCanRetryPayment(true);
            setBookingMessage({
              type: 'error',
              text: 'Checkout was closed. Your booking is still pending; reopen the same test order to pay or contact support if you need help.',
            });
          },
        },
      };

      if (typeof window.Razorpay !== 'undefined') {
        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function () {
          setCanRetryPayment(true);
          setBookingMessage({
            type: 'error',
            text: 'This payment attempt failed. Your seat remains reserved and the same Razorpay test order can be retried.',
          });
        });
        rzp.open();
      } else {
        setCanRetryPayment(true);
        setBookingMessage({
          type: 'error',
          text: 'Razorpay checkout could not be loaded. Please refresh and try again.',
        });
      }
    } catch (err: any) {
      setCanRetryPayment(true);
      setBookingMessage({
        type: 'error',
        text: err?.message || 'Failed to complete registration.',
      });
    } finally {
      setBookingLoading(false);
    }
  };

  // Handle Waitlist Join
  const handleJoinWaitlist = async () => {
    if (!user) {
      router.push(`/login?redirect=/events/${slug}`);
      return;
    }
    try {
      const res = await api.waitlist.join(event.id);
      if (!res.success) {
        setBookingMessage({ type: 'error', text: res.message || 'Could not join the waitlist.' });
        return;
      }
      setWaitlistJoined(true);
      setBookingMessage({
        type: 'success',
        text: res.message || "You have been added to the waitlist queue! We'll email you immediately if a seat opens.",
      });
    } catch {
      setBookingMessage({
        type: 'error',
        text: 'Could not join the waitlist. Please try again.',
      });
    }
  };

  // Submit Review
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmittingReview(true);
    try {
      const res = await api.reviews.create({
        eventId: event.id,
        rating: userRating,
        comment: userComment,
      });
      if (res.success && res.data) {
        setReviews([res.data, ...reviews]);
        setUserComment('');
      } else {
        setBookingMessage({ type: 'error', text: res.message || 'Could not submit your review. Please try again.' });
      }
    } catch {
      setBookingMessage({ type: 'error', text: 'Could not submit your review. Please try again.' });
    } finally {
      setSubmittingReview(false);
    }
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="pb-24">
      {/* Editorial Top Navigation */}
      <div className="bg-[#f5f2eb] border-b border-[#e2dacb] py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <Link
            href="/events"
            className="inline-flex items-center gap-2 text-xs font-semibold text-forest hover:text-terracotta transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to All Experiences</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleSavedEvent}
              disabled={savingEvent}
              aria-pressed={isSaved}
              aria-label={isSaved ? 'Remove event from saved events' : 'Save event'}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#ded7ca] bg-white text-xs font-semibold text-[#5c5446] hover:bg-[#faf8f5] disabled:opacity-50"
            >
              <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-terracotta text-terracotta' : ''}`} />
              <span>{isSaved ? 'Saved' : 'Save event'}</span>
            </button>
            <button
              onClick={copyShareLink}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#ded7ca] bg-white text-xs font-semibold text-[#5c5446] hover:bg-[#faf8f5] transition-colors"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Link Copied' : 'Share Experience'}</span>
            </button>

            <a
              href={api.calendar.icsUrl(event.id)}
              download={`${event.slug}.ics`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#ded7ca] bg-white text-xs font-semibold text-[#5c5446] hover:bg-[#faf8f5] transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Add to Calendar (.ics)</span>
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Left Column: Narrative, Details, Schedule, Instructor & Reviews */}
          <div className="lg:col-span-8 space-y-12">
            {/* Header info */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-forest text-white">
                  {event.category?.name || 'Masterclass'}
                </span>

                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#eae4d6] text-forest flex items-center gap-1.5">
                  {event.format === 'ONLINE' ? <Video className="w-3.5 h-3.5" /> : <MapPin className="w-3.5 h-3.5" />}
                  {event.format === 'ONLINE' ? 'Virtual Studio' : `${event.venueName || 'In-Person'}, ${event.city || ''}`}
                </span>
              </div>

              <h1 className="font-serif text-3xl sm:text-5xl font-bold text-forest leading-[1.15]">
                {event.title}
              </h1>

              <p className="text-base sm:text-lg text-[#5c5446] leading-relaxed">
                {event.shortDescription || event.description}
              </p>
            </div>

            {/* Hero Image */}
            <div className="relative aspect-[16/9] rounded-3xl overflow-hidden shadow-warm border border-[#ded7ca]">
              <EventCoverImage
                src={event.coverImage}
                alt={event.title}
                label={event.category?.name || 'Eventora experience'}
                fallbackSrc={event.images?.[0]}
                categorySlug={event.category?.slug}
                sizes="(max-width: 1024px) 100vw, 66vw"
                loading="eager"
              />
            </div>

            {/* Quick Metadata Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 rounded-2xl bg-white border border-[#ded7ca] shadow-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-[#8c8273]">
                  <Calendar className="w-3.5 h-3.5 text-terracotta" />
                  <span>Date</span>
                </div>
                <p className="text-sm font-bold text-forest">{formatDate(event.startDate, { timeZone: event.timezone || 'UTC' })}</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-[#8c8273]">
                  <Clock className="w-3.5 h-3.5 text-terracotta" />
                  <span>Time</span>
                </div>
                <p className="text-sm font-bold text-forest">{formatTime(event.startDate)}</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-[#8c8273]">
                  <Users className="w-3.5 h-3.5 text-terracotta" />
                  <span>Capacity</span>
                </div>
                <p className="text-sm font-bold text-forest">{event.totalCapacity} Attendees</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-[#8c8273]">
                  <Sparkles className="w-3.5 h-3.5 text-terracotta" />
                  <span>Remaining</span>
                </div>
                <p className="text-sm font-bold text-forest">
                  {isSoldOut ? (
                    <span className="text-terracotta">Sold Out</span>
                  ) : (
                    `${event.availableSeats} Available`
                  )}
                </p>
              </div>
            </div>

            {/* About the Workshop */}
            <div className="space-y-6">
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-forest">
                About the Workshop
              </h2>
              <div className="prose prose-stone max-w-none text-base text-[#40382b] leading-relaxed whitespace-pre-line">
                {event.description}
              </div>
            </div>

            {/* What You Will Learn */}
            {event.whatYouLearn && event.whatYouLearn.length > 0 && (
              <div className="space-y-5 bg-[#faf8f5] p-8 rounded-3xl border border-[#ded7ca]">
                <h3 className="font-serif text-2xl font-bold text-forest">What You Will Master</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {event.whatYouLearn.map((outcome, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-terracotta shrink-0 mt-0.5" />
                      <span className="text-sm text-[#40382b] font-medium leading-snug">{outcome}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Requirements */}
            {event.requirements && event.requirements.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-serif text-xl font-bold text-forest">Prerequisites & Materials</h3>
                <ul className="list-disc list-inside space-y-1.5 text-sm text-[#5c5446]">
                  {event.requirements.map((req, idx) => (
                    <li key={idx}>{req}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Instructor Profile Card */}
            <div className="bg-white p-8 rounded-3xl border border-[#ded7ca] shadow-warm space-y-4">
              <span className="text-xs font-bold uppercase tracking-widest text-terracotta">
                Lead Facilitator
              </span>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                <Avatar
                  src={event.instructorAvatar || event.organizer?.avatar}
                  name={event.instructorName || event.organizer?.name || 'Instructor'}
                  className="h-20 w-20 rounded-full border-2 border-forest"
                />
                <div className="space-y-1.5">
                  <h4 className="font-serif text-2xl font-bold text-forest">
                    {event.instructorName || event.organizer?.name}
                  </h4>
                  <p className="text-sm text-[#5c5446]">
                    {event.instructorBio || event.organizer?.bio || 'Experienced educator and practitioner.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Reviews Section */}
            <div className="space-y-6 pt-6 border-t border-[#ded7ca]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-2xl font-bold text-forest">Attendee Reviews</h3>
                  <p className="text-xs text-[#71695d]">
                    Verified feedback from alumni who completed this experience
                  </p>
                </div>
                {event.averageRating && (
                  <div className="flex items-center gap-1.5 text-sm font-bold text-forest bg-[#faf8f5] px-3 py-1 rounded-lg border border-[#ded7ca]">
                    <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                    <span>{event.averageRating} / 5.0</span>
                    <span className="text-xs text-[#8c8273]">({reviews.length} reviews)</span>
                  </div>
                )}
              </div>

              {/* Add review form if logged in */}
              {user && (
                <form onSubmit={handleSubmitReview} className="bg-white p-5 rounded-2xl border border-[#ded7ca] space-y-3">
                  <h4 className="text-sm font-bold text-forest">Leave a Review</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#71695d]">Your Rating:</span>
                    <select
                      value={userRating}
                      onChange={(e) => setUserRating(Number(e.target.value))}
                      className="px-2 py-1 rounded border border-[#ded7ca] text-xs font-semibold text-forest bg-white"
                    >
                      <option value="5">5 ★★★★★ — Exceptional</option>
                      <option value="4">4 ★★★★☆ — Very Good</option>
                      <option value="3">3 ★★★☆☆ — Good</option>
                      <option value="2">2 ★★☆☆☆ — Fair</option>
                      <option value="1">1 ★☆☆☆☆ — Poor</option>
                    </select>
                  </div>
                  <label htmlFor="event-review-comment" className="sr-only">Your review</label>
                  <textarea
                    id="event-review-comment"
                    placeholder="Share your takeaways and experience with future attendees..."
                    value={userComment}
                    onChange={(e) => setUserComment(e.target.value)}
                    rows={3}
                    className="w-full p-3 rounded-xl border border-[#ded7ca] bg-[#faf8f5] text-xs focus:bg-white focus:outline-none"
                    required
                  />
                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="px-5 py-2 rounded-xl bg-forest text-white text-xs font-semibold hover:bg-forest-light transition-colors"
                  >
                    {submittingReview ? 'Submitting...' : 'Post Review'}
                  </button>
                </form>
              )}

              {/* Reviews List */}
              <div className="space-y-4">
                {reviews.length > 0 ? (
                  reviews.map((rev) => (
                    <div key={rev.id} className="p-5 rounded-2xl bg-white border border-[#ded7ca] space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <Avatar
                            src={rev.user?.avatar}
                            name={rev.user?.name || 'Attendee'}
                            className="w-7 h-7 rounded-full border border-[#ded7ca]"
                          />
                          <span className="text-xs font-bold text-forest">{rev.user?.name || 'Attendee'}</span>
                        </div>
                        <div className="flex text-amber-500 text-xs">
                          {'★'.repeat(rev.rating)}
                        </div>
                      </div>
                      {rev.comment && <p className="text-xs text-[#5c5446] leading-relaxed">{rev.comment}</p>}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[#8c8273] italic">No reviews yet for this cohort.</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Sticky Booking / Registration Card */}
          <div className="lg:col-span-4">
            <div className="sticky top-28 bg-white rounded-3xl border border-[#ded7ca] p-7 shadow-warm-lg space-y-6">
              {/* Pricing Header */}
              <div className="border-b border-[#f0ede6] pb-5 flex items-end justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#8c8273] block mb-0.5">
                    Registration Fee
                  </span>
                  <div className="font-serif text-3xl font-bold text-forest">
                    {event.isFree ? (
                      <span className="text-emerald-700 font-sans uppercase">Complimentary</span>
                    ) : (
                      formatCurrency(event.price, event.currency)
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-[#71695d]">Per Attendee</span>
                </div>
              </div>

              {/* Seat Availability Meter */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-forest">Seat Availability</span>
                  <span className={isSoldOut ? 'text-terracotta' : 'text-emerald-700'}>
                    {isSoldOut ? 'Cohort Full' : `${event.availableSeats} of ${event.totalCapacity} left`}
                  </span>
                </div>
                <div className="w-full bg-[#f0ede6] h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isSoldOut ? 'bg-terracotta' : 'bg-forest'
                    }`}
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round((event.bookedSeats / event.totalCapacity) * 100)
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* Seat Selector (if not sold out) */}
              {!isSoldOut ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-forest mb-2">
                      Select Number of Seats (Max 5)
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {[1, 2, 3, 4, 5].map((num) => (
                        <button
                          key={num}
                          type="button"
                          disabled={num > event.availableSeats}
                          onClick={() => setSelectedSeats(num)}
                          className={`py-2 text-sm font-bold rounded-xl border transition-all ${
                            selectedSeats === num
                              ? 'bg-forest text-white border-forest shadow-sm'
                              : num > event.availableSeats
                              ? 'bg-[#f7f5f0] text-[#c0b8aa] border-[#ded7ca] cursor-not-allowed'
                              : 'bg-white text-[#40382b] border-[#ded7ca] hover:bg-[#faf8f5]'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Price breakdown for paid */}
                  {!event.isFree && (
                    <div className="bg-[#faf8f5] p-3.5 rounded-xl border border-[#ebe4d8] space-y-1.5 text-xs text-[#5c5446]">
                      <div className="flex justify-between">
                        <span>Seat ticket × {selectedSeats}</span>
                        <span>₹{(event.price * selectedSeats).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>GST & Platform Fee</span>
                        <span className="text-emerald-700 font-semibold">Included</span>
                      </div>
                      <div className="border-t border-[#ded7ca] pt-1.5 flex justify-between font-bold text-forest text-sm">
                        <span>Total Payable</span>
                        <span>₹{totalPrice.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  )}

                  {/* Reserve Button */}
                  <button
                    onClick={handleBooking}
                    disabled={bookingLoading}
                    className="w-full py-4 rounded-xl bg-forest hover:bg-forest-light text-[#faf8f5] font-bold text-sm shadow-warm transition-all flex items-center justify-center gap-2"
                  >
                    {bookingLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>{event.isFree ? 'Claim Free Passes' : `Pay ₹${totalPrice.toLocaleString('en-IN')}`}</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                /* Sold Out / Waitlist Flow */
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1.5">
                    <p className="font-bold flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-terracotta" />
                      Cohort Capacity Reached
                    </p>
                    <p>
                      This session is fully booked. Join our FIFO waitlist to receive priority access if an attendee cancels. You will have a 2-hour window to claim your ticket.
                    </p>
                  </div>

                  {waitlistJoined ? (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-1 text-emerald-900">
                      <p className="text-xs font-bold">✓ Waitlist Position Reserved</p>
                      <p className="text-[11px] text-emerald-700">We will notify you via email when a seat is released.</p>
                    </div>
                  ) : (
                    <button
                      onClick={handleJoinWaitlist}
                      className="w-full py-4 rounded-xl bg-terracotta hover:bg-terracotta-dark text-white font-bold text-sm shadow-md transition-all"
                    >
                      Join Waitlist Queue
                    </button>
                  )}
                </div>
              )}

              {/* Feedback Alert */}
              {bookingMessage && (
                <div
                  className={`p-3.5 rounded-xl text-xs font-semibold ${
                    bookingMessage.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  {bookingMessage.text}
                </div>
              )}
              {canRetryPayment && !event.isFree && (
                <button
                  type="button"
                  onClick={handleBooking}
                  disabled={bookingLoading}
                  className="w-full rounded-xl border border-forest px-4 py-2.5 text-xs font-bold text-forest hover:bg-[#f2ede4] disabled:opacity-50"
                >
                  {bookingLoading ? 'Reopening secure checkout…' : 'Retry payment'}
                </button>
              )}

              {/* Security & Guarantee Trust Seals */}
              <div className="pt-4 border-t border-[#f0ede6] space-y-2 text-xs text-[#8c8273]">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Razorpay 256-bit encrypted checkout</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Individual QR ticket code for each seat</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Cancel anytime up to 24 hours prior for full refund</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
