'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { Booking } from '@eventora/shared';
import { formatDate, formatCurrency } from '@/lib/utils';
import {
  Ticket,
  Calendar,
  MapPin,
  QrCode,
  Download,
  AlertTriangle,
  X,
  CheckCircle,
  Clock,
  Printer
} from 'lucide-react';
import QRCode from 'qrcode';

export default function AttendeeBookingsPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingsLoadedAt, setBookingsLoadedAt] = useState(0);
  const [selectedTicket, setSelectedTicket] = useState<{
    code: string;
    eventTitle: string;
    seatNumber: number;
    qrUrl?: string;
  } | null>(null);

  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadBookings() {
      try {
        const res = await api.bookings.list();
        if (res.success && res.data) {
          setBookings(res.data);
          setBookingsLoadedAt(Date.now());
        } else {
          setBookings([]);
        }
      } catch {
        // Fallback
      } finally {
        setLoading(false);
      }
    }
    loadBookings();
  }, []);

  useEffect(() => {
    if (!selectedTicket && !cancellingId) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedTicket(null);
        setCancellingId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTicket, cancellingId]);

  const openTicketModal = async (ticket: any, eventTitle: string) => {
    try {
      const qrUrl = await QRCode.toDataURL(ticket.code, {
        margin: 2,
        color: { dark: '#1a3a2a', light: '#ffffff' },
        width: 250,
      });
      setSelectedTicket({
        code: ticket.code,
        eventTitle,
        seatNumber: ticket.seatNumber,
        qrUrl,
      });
    } catch {
      setSelectedTicket({
        code: ticket.code,
        eventTitle,
        seatNumber: ticket.seatNumber,
      });
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    try {
      const res = await api.bookings.cancel(bookingId, cancelReason);
      if (!res.success) {
        setActionMessage(res.message || 'Failed to cancel booking.');
        return;
      }
      setBookings(
        bookings.map((b) =>
          b.id === bookingId ? { ...b, status: res.data?.status || 'CANCELLED' } : b
        )
      );
      setCancellingId(null);
      setActionMessage(res.message || 'Booking cancelled.');
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      setActionMessage(err?.message || 'Failed to cancel booking.');
    }
  };

  const bookingSections = [
    { title: 'Upcoming', bookings: bookings.filter((booking) => booking.status !== 'CANCELLED' && booking.status !== 'REFUNDED' && (!booking.event?.endDate || new Date(booking.event.endDate).getTime() > bookingsLoadedAt) && booking.event?.status !== 'COMPLETED') },
    { title: 'Completed', bookings: bookings.filter((booking) => booking.status !== 'CANCELLED' && booking.status !== 'REFUNDED' && (booking.event?.status === 'COMPLETED' || (booking.event?.endDate && new Date(booking.event.endDate).getTime() <= bookingsLoadedAt))) },
    { title: 'Cancelled', bookings: bookings.filter((booking) => booking.status === 'CANCELLED' || booking.status === 'REFUNDED') },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e5dfd3] pb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-terracotta">
            Attendee Wallet
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-forest">
            My Tickets & Bookings
          </h1>
          <p className="text-xs sm:text-sm text-[#71695d]">
            View digital QR passes, export calendar invites, or manage registration cohorts.
          </p>
        </div>

        <Link
          href="/events"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-forest hover:bg-forest-light text-white text-xs font-semibold self-start"
        >
          <span>Explore More Events</span>
        </Link>
      </div>

      {actionMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold">
          {actionMessage}
        </div>
      )}

      {/* Bookings List */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-forest border-t-transparent rounded-full mx-auto" />
        </div>
      ) : bookings.length > 0 ? (
        <div className="space-y-10">
          {bookingSections.map((section) => section.bookings.length > 0 && (
            <section key={section.title} aria-labelledby={`bookings-${section.title.toLowerCase()}`}>
              <h2 id={`bookings-${section.title.toLowerCase()}`} className="mb-4 font-serif text-2xl font-bold text-forest">{section.title}</h2>
              <div className="space-y-6">
          {section.bookings.map((booking) => (
            <div
              key={booking.id}
              className="bg-white rounded-3xl border border-[#ded7ca] p-6 sm:p-8 shadow-warm flex flex-col md:flex-row gap-6 justify-between items-start md:items-center"
            >
              <div className="space-y-3 max-w-xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      booking.status === 'CONFIRMED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : booking.status === 'PENDING'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-stone-200 text-stone-700'
                    }`}
                  >
                    {booking.status}
                  </span>

                  <span className="text-xs font-mono text-[#8c8273]">
                    Ref: <strong>{booking.reference}</strong>
                  </span>
                </div>

                <h3 className="font-serif text-2xl font-bold text-forest">
                  {booking.event?.title || 'Workshop Session'}
                </h3>

                <div className="flex flex-wrap items-center gap-4 text-xs text-[#5c5446]">
                  {booking.event?.startDate && (
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-terracotta" />
                      {formatDate(booking.event.startDate)}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-terracotta" />
                    {booking.event?.city || 'Virtual Session'}
                  </span>
                  <span>•</span>
                  <span>{booking.seats} Seat(s) Booked</span>
                  <span>•</span>
                  <span className="font-bold text-forest">
                    {booking.totalAmount === 0 ? 'Complimentary' : formatCurrency(booking.totalAmount)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                {booking.status === 'CONFIRMED' && booking.tickets && (
                  <>
                    {booking.tickets.map((t, idx) => (
                      <button
                        key={t.id || idx}
                        onClick={() => openTicketModal(t, booking.event?.title || 'Ticket Pass')}
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-forest hover:bg-forest-light text-white text-xs font-bold shadow-sm transition-all"
                      >
                        <QrCode className="w-4 h-4 text-terracotta" />
                        <span>Seat #{t.seatNumber} QR Pass</span>
                      </button>
                    ))}
                    {booking.event?.id && (
                      <a
                        href={api.calendar.icsUrl(booking.event.id)}
                        className="px-3 py-2.5 rounded-xl border border-[#ded7ca] text-[#5c5446] hover:bg-[#faf8f5] text-xs font-semibold transition-colors"
                      >
                        Add to calendar
                      </a>
                    )}
                  </>
                )}
                {(booking.status === 'CONFIRMED' || booking.status === 'PENDING') && (
                  <button
                    onClick={() => setCancellingId(booking.id)}
                    className="px-3 py-2.5 rounded-xl border border-red-200 text-red-700 hover:bg-red-50 text-xs font-semibold transition-colors"
                  >
                    Cancel Booking
                  </button>
                )}
              </div>
            </div>
          ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-[#ded7ca] p-16 text-center space-y-4 max-w-lg mx-auto shadow-sm">
          <Ticket className="w-12 h-12 text-[#8c8273] mx-auto" />
          <h3 className="font-serif text-2xl font-bold text-forest">No tickets registered yet</h3>
          <p className="text-xs text-[#71695d]">
            Browse our upcoming workshops and reserve your seat to receive digital QR entrance passes.
          </p>
          <Link
            href="/events"
            className="inline-block px-6 py-2.5 bg-forest text-white rounded-xl text-xs font-bold"
          >
            Explore Masterclasses
          </Link>
        </div>
      )}

      {/* Ticket QR Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="ticket-dialog-title" className="bg-[#faf8f5] rounded-3xl border border-[#ded7ca] p-8 max-w-sm w-full space-y-6 text-center shadow-warm-lg animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-terracotta bg-terracotta/10 px-2.5 py-1 rounded-full">
                Digital Entrance Pass
              </span>
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                aria-label="Close ticket"
                className="text-[#8c8273] hover:text-forest"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h4 id="ticket-dialog-title" className="font-serif text-xl font-bold text-forest leading-snug">
                {selectedTicket.eventTitle}
              </h4>
              <p className="text-xs text-[#71695d] mt-1 font-mono">
                Seat #{selectedTicket.seatNumber} • Pass Code: {selectedTicket.code}
              </p>
            </div>

            {/* QR Code Container */}
            <div className="bg-white p-5 rounded-2xl border border-[#ded7ca] shadow-inner inline-block mx-auto">
              {selectedTicket.qrUrl ? (
                <img
                  src={selectedTicket.qrUrl}
                  alt="QR Pass"
                  className="w-48 h-48 mx-auto"
                />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center font-mono text-xs">
                  {selectedTicket.code}
                </div>
              )}
            </div>

            <p className="text-[11px] text-[#71695d]">
              Present this QR pass to the venue organizer for instant verification and entry.
            </p>

            <button
              onClick={() => window.print()}
              className="w-full py-2.5 rounded-xl border border-forest text-forest hover:bg-forest/5 text-xs font-bold flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>Print Ticket Pass</span>
            </button>
          </div>
        </div>
      )}

      {/* Cancellation Confirmation Modal */}
      {cancellingId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="cancel-dialog-title" className="bg-white rounded-3xl border border-[#ded7ca] p-6 max-w-md w-full space-y-4 shadow-warm-lg animate-in zoom-in-95">
            <h3 id="cancel-dialog-title" className="font-serif text-xl font-bold text-forest">Cancel Booking?</h3>
            <p className="text-xs text-[#5c5446]">
              Cancelling your registration will immediately release your seats to the earliest waiting attendee on the FIFO waitlist.
            </p>

            <div>
              <label className="block text-xs font-bold text-forest mb-1">Reason (Optional)</label>
              <input
                type="text"
                placeholder="Schedule conflict, etc."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full p-2.5 border rounded-xl text-xs bg-[#faf8f5]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setCancellingId(null)}
                className="px-4 py-2 border rounded-xl text-xs font-semibold text-[#5c5446]"
              >
                Keep Booking
              </button>
              <button
                onClick={() => handleCancelBooking(cancellingId)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
