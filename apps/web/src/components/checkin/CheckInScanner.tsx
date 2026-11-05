'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Camera, CheckCircle2, Clock3, QrCode, Search, ShieldAlert, UserCheck, XCircle } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { Avatar } from '@/components/ui/Avatar';
import { formatDate } from '@/lib/utils';

type ScannerMode = 'admin' | 'organizer';
type ResultStatus = 'checked_in' | 'already_checked_in' | 'booking_cancelled' | 'booking_refunded' | 'booking_not_confirmed' | 'event_cancelled' | 'event_expired' | 'invalid' | 'request_error';
type TicketDetails = {
  id: string;
  code: string;
  seatNumber: number;
  isCheckedIn: boolean;
  booking: {
    id: string;
    reference: string;
    status: string;
    seats: number;
    totalAmount: number;
    currency: string;
    user: { id: string; name: string; email: string; avatar?: string | null; phone?: string | null };
    event: { id: string; title: string; status: string; startDate: string; endDate: string; venueName?: string | null; city?: string | null };
    payment?: { status: string; amount: number; currency: string; razorpayPaymentId?: string | null; webhookVerified: boolean } | null;
  };
  checkIn?: { checkedInAt: string; method: string; staff: { id: string; name: string } } | null;
};
type RecentCheckIn = { code: string; attendee: string; email?: string; event: string; time: string; method: string };
type ScanResult = { status: ResultStatus; message: string; ticket?: TicketDetails };

const statusCopy: Record<ResultStatus, { heading: string; message: string; className: string }> = {
  checked_in: { heading: 'ADMISSION APPROVED', message: 'Ticket verified and attendee checked in.', className: 'border-emerald-300 bg-emerald-50 text-emerald-950' },
  already_checked_in: { heading: 'ALREADY CHECKED IN', message: 'This ticket was checked in previously.', className: 'border-amber-300 bg-amber-50 text-amber-950' },
  booking_cancelled: { heading: 'CANCELLED REGISTRATION', message: 'This booking has been cancelled and cannot be used for entry.', className: 'border-red-300 bg-red-50 text-red-950' },
  booking_refunded: { heading: 'REFUNDED REGISTRATION', message: 'This booking has been refunded and cannot be used for entry.', className: 'border-red-300 bg-red-50 text-red-950' },
  booking_not_confirmed: { heading: 'UNCONFIRMED REGISTRATION', message: 'This booking is not confirmed and cannot be used for entry.', className: 'border-red-300 bg-red-50 text-red-950' },
  event_cancelled: { heading: 'CANCELLED EVENT', message: 'This event was cancelled; the ticket is not valid for admission.', className: 'border-red-300 bg-red-50 text-red-950' },
  event_expired: { heading: 'EXPIRED TICKET', message: 'This event has ended; the ticket is no longer valid for admission.', className: 'border-red-300 bg-red-50 text-red-950' },
  invalid: { heading: 'INVALID TICKET', message: 'No ticket was found for that code.', className: 'border-red-300 bg-red-50 text-red-950' },
  request_error: { heading: 'CHECK-IN FAILED', message: 'The ticket could not be verified. Try again or contact an administrator.', className: 'border-red-300 bg-red-50 text-red-950' },
};

function readCode(value: string) {
  const raw = value.trim();
  if (!raw) return '';
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && 'ticketCode' in parsed && typeof parsed.ticketCode === 'string') {
      return parsed.ticketCode.trim();
    }
  } catch {
    return raw;
  }
  return raw;
}

export function CheckInScanner({ mode }: { mode: ScannerMode }) {
  const { user, loading: authLoading } = useAuth();
  const [manualCode, setManualCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [recentCheckIns, setRecentCheckIns] = useState<RecentCheckIn[]>([]);
  const [feedError, setFeedError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const scannerId = mode === 'admin' ? 'admin-qr-reader' : 'organizer-qr-reader';
  const authorized = mode === 'admin' ? user?.role === 'ADMIN' : user?.role === 'ORGANIZER' || user?.role === 'ADMIN';

  const refreshAdminFeed = useCallback(async () => {
    if (mode !== 'admin') return;
    const response = await api.admin.checkins();
    if (!response.success || !response.data) {
      setFeedError(response.message || 'Recent check-ins could not be loaded.');
      return;
    }
    setFeedError(null);
    setRecentCheckIns(response.data.map((entry: any) => ({
      code: entry.ticket.code,
      attendee: entry.ticket.booking.user.name,
      email: entry.ticket.booking.user.email,
      event: entry.event.title,
      time: entry.checkedInAt,
      method: entry.method,
    })));
  }, [mode]);

  const handleVerifyCode = useCallback(async (value: string, method: 'QR' | 'Manual' = 'Manual') => {
    const code = readCode(value);
    if (!code || inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    setResult(null);

    try {
      const response = mode === 'admin'
        ? await api.admin.scannerCheckin(code, method)
        : await api.tickets.checkin(code, method);
      if (!response.success || !response.data) {
        const notFound = (response.message || '').toLowerCase().includes('ticket not found');
        setResult({ status: notFound ? 'invalid' : 'request_error', message: response.message || statusCopy.request_error.message });
        return;
      }

      const outcome = response.data as { status?: ResultStatus; ticket?: TicketDetails };
      const status = outcome.status || (outcome.ticket?.isCheckedIn ? 'checked_in' : 'invalid');
      setResult({
        status,
        message: statusCopy[status]?.message || response.message || statusCopy.invalid.message,
        ticket: outcome.ticket,
      });
      if (mode === 'admin') await refreshAdminFeed();
      else if (status === 'checked_in' && outcome.ticket) {
        setRecentCheckIns((items) => [{
          code: outcome.ticket!.code,
          attendee: outcome.ticket!.booking.user.name,
          email: outcome.ticket!.booking.user.email,
          event: outcome.ticket!.booking.event.title,
          time: outcome.ticket!.checkIn?.checkedInAt || new Date().toISOString(),
          method,
        }, ...items].slice(0, 20));
      }
    } catch {
      setResult({ status: 'request_error', message: statusCopy.request_error.message });
    } finally {
      setLoading(false);
      setManualCode('');
      inFlight.current = false;
    }
  }, [mode, refreshAdminFeed]);

  useEffect(() => {
    if (!authorized || mode !== 'admin') return;
    const timer = window.setTimeout(() => { void refreshAdminFeed(); }, 0);
    return () => window.clearTimeout(timer);
  }, [authorized, mode, refreshAdminFeed]);

  useEffect(() => {
    if (!authorized) return;
    let active = true;
    const scanner = new Html5QrcodeScanner(scannerId, { fps: 10, qrbox: { width: 250, height: 250 } }, false);
    scanner.render(
      (decodedText) => { if (active) void handleVerifyCode(decodedText, 'QR'); },
      () => {},
    );
    scannerRef.current = scanner;
    return () => {
      active = false;
      const current = scannerRef.current;
      scannerRef.current = null;
      if (current) void current.clear().catch(() => undefined);
    };
  }, [authorized, handleVerifyCode, scannerId]);

  if (authLoading) return <main className="mx-auto max-w-6xl px-4 py-16 text-center text-sm text-[#71695d]" role="status">Checking scanner access…</main>;
  if (!authorized) return (
    <main className="mx-auto max-w-xl px-5 py-24 text-center">
      <ShieldAlert className="mx-auto h-10 w-10 text-terracotta" />
      <h1 className="mt-4 font-serif text-3xl font-bold text-forest">Scanner access required</h1>
      <p className="mt-2 text-sm text-[#71695d]">{mode === 'admin' ? 'Sign in with an administrator account to use this scanner.' : 'Sign in as an event organizer to use this scanner.'}</p>
    </main>
  );

  const copy = result ? statusCopy[result.status] : null;
  const Icon = result?.status === 'checked_in' ? CheckCircle2 : result?.status === 'already_checked_in' ? AlertCircle : XCircle;
  const ticket = result?.ticket;

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <header className="border-b border-[#e5dfd3] pb-6">
        <span className="text-xs font-bold uppercase tracking-widest text-terracotta">{mode === 'admin' ? 'Administrator terminal' : 'Organizer terminal'}</span>
        <h1 className="font-serif text-3xl font-bold text-forest sm:text-4xl">QR Check-in & Admission Control</h1>
        <p className="text-sm text-[#71695d]">Scan a ticket or enter its code. Ticket validity and attendee details are verified by Eventora.</p>
      </header>

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <section className="space-y-4 rounded-3xl border border-[#ded7ca] bg-white p-6 shadow-warm">
            <h2 className="flex items-center gap-2 font-serif text-lg font-bold text-forest"><Camera className="h-5 w-5 text-terracotta" />Live camera scanner</h2>
            <div id={scannerId} className="flex min-h-[260px] items-center justify-center overflow-hidden rounded-2xl border border-[#ded7ca] bg-[#faf8f5]" />
          </section>

          <section className="space-y-4 rounded-3xl border border-[#ded7ca] bg-white p-6 shadow-warm">
            <h2 className="flex items-center gap-2 font-serif text-lg font-bold text-forest"><Search className="h-5 w-5" />Manual ticket code lookup</h2>
            <form onSubmit={(event) => { event.preventDefault(); void handleVerifyCode(manualCode, 'Manual'); }} className="flex flex-col gap-2 sm:flex-row">
              <label className="sr-only" htmlFor={`${scannerId}-manual-code`}>Ticket code</label>
              <input id={`${scannerId}-manual-code`} autoComplete="off" value={manualCode} onChange={(event) => setManualCode(event.target.value)} placeholder="Enter a ticket code" className="min-h-11 flex-1 rounded-xl border border-[#ded7ca] bg-[#faf8f5] px-4 font-mono text-sm font-bold uppercase outline-none focus-visible:ring-2 focus-visible:ring-forest" />
              <button type="submit" disabled={loading || !manualCode.trim()} className="min-h-11 rounded-xl bg-forest px-6 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta disabled:opacity-50">{loading ? 'Checking…' : 'Verify ticket'}</button>
            </form>
          </section>

          {result && copy && (
            <section aria-live="polite" className={`space-y-4 rounded-3xl border p-6 ${copy.className}`}>
              <div className="flex items-start gap-3"><Icon className="mt-0.5 h-7 w-7 shrink-0" /><div><h2 className="font-serif text-xl font-bold">{copy.heading}</h2><p className="mt-1 text-sm">{result.message}</p></div></div>
              {ticket && (
                <div className="rounded-2xl border border-current/15 bg-white/70 p-4 text-forest">
                  <div className="flex items-start gap-3">
                    <Avatar src={ticket.booking.user.avatar} name={ticket.booking.user.name} className="h-12 w-12 rounded-full border border-[#ded7ca]" />
                    <div className="min-w-0"><h3 className="font-semibold">{ticket.booking.user.name}</h3><a href={`mailto:${ticket.booking.user.email}`} className="break-all text-sm underline">{ticket.booking.user.email}</a>{ticket.booking.user.phone && <p className="text-sm">{ticket.booking.user.phone}</p>}</div>
                  </div>
                  <dl className="mt-4 grid gap-x-4 gap-y-3 text-sm sm:grid-cols-2">
                    <div><dt className="text-xs font-semibold uppercase text-[#71695d]">Event</dt><dd>{ticket.booking.event.title}</dd></div>
                    <div><dt className="text-xs font-semibold uppercase text-[#71695d]">Ticket code</dt><dd className="break-all font-mono">{ticket.code}</dd></div>
                    <div><dt className="text-xs font-semibold uppercase text-[#71695d]">Booking reference</dt><dd className="break-all font-mono">{ticket.booking.reference}</dd></div>
                    <div><dt className="text-xs font-semibold uppercase text-[#71695d]">Booking ID</dt><dd className="break-all font-mono">{ticket.booking.id}</dd></div>
                    <div><dt className="text-xs font-semibold uppercase text-[#71695d]">Registration</dt><dd>{ticket.booking.status} · {ticket.booking.seats} seat(s)</dd></div>
                    <div><dt className="text-xs font-semibold uppercase text-[#71695d]">Payment</dt><dd>{ticket.booking.payment?.status || 'Not applicable'}{ticket.booking.payment?.webhookVerified ? ' · verified' : ''}</dd></div>
                    <div><dt className="text-xs font-semibold uppercase text-[#71695d]">Event date</dt><dd>{formatDate(ticket.booking.event.startDate)}{ticket.booking.event.venueName ? ` · ${ticket.booking.event.venueName}` : ''}{ticket.booking.event.city ? `, ${ticket.booking.event.city}` : ''}</dd></div>
                    <div><dt className="text-xs font-semibold uppercase text-[#71695d]">Check-in</dt><dd>{ticket.checkIn ? `${formatDate(ticket.checkIn.checkedInAt)} · ${ticket.checkIn.staff.name}` : ticket.isCheckedIn ? 'Checked in' : 'Not checked in'}</dd></div>
                  </dl>
                </div>
              )}
              {result.status === 'checked_in' && ticket?.checkIn && <p className="text-xs">Checked in by {ticket.checkIn.staff.name} at {formatDate(ticket.checkIn.checkedInAt)}.</p>}
            </section>
          )}
        </div>

        <section className="space-y-5 rounded-3xl border border-[#ded7ca] bg-white p-6 shadow-warm lg:col-span-5" aria-labelledby={`${scannerId}-recent`}>
          <div className="flex items-center justify-between border-b border-[#f0ede6] pb-4">
            <h2 id={`${scannerId}-recent`} className="flex items-center gap-2 font-serif text-lg font-bold text-forest"><UserCheck className="h-5 w-5" />Recent check-ins</h2>
            {mode === 'admin' && <button type="button" onClick={() => void refreshAdminFeed()} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#ded7ca] px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest"><Clock3 className="h-4 w-4" />Refresh</button>}
          </div>
          {feedError && <p role="alert" className="text-sm text-red-800">{feedError}</p>}
          {recentCheckIns.length ? <ul className="space-y-3">{recentCheckIns.map((entry, index) => <li key={`${entry.code}-${index}`} className="flex items-center justify-between gap-3 rounded-2xl border border-[#ebe4d8] bg-[#faf8f5] p-3.5 text-xs"><div className="min-w-0"><p className="truncate font-bold text-forest">{entry.attendee}</p><p className="truncate text-[#71695d]">{entry.email}</p><p className="truncate font-mono text-[#8c8273]">{entry.code}</p><p className="truncate text-[#71695d]">{entry.event}</p></div><div className="shrink-0 text-right"><span>{entry.method}</span><p className="mt-1 text-[#8c8273]">{formatDate(entry.time)}</p></div></li>)}</ul> : <p className="py-8 text-center text-sm text-[#71695d]">No check-ins recorded yet.</p>}
        </section>
      </div>
    </main>
  );
}
