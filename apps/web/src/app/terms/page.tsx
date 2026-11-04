import Link from 'next/link';

export default function TermsPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8">
      <header className="space-y-3 border-b border-[#e5dfd3] pb-6">
        <span className="text-xs font-bold uppercase tracking-widest text-terracotta">Eventora</span>
        <h1 className="font-serif text-4xl font-bold text-forest">Terms of Service</h1>
        <p className="text-sm text-[#71695d]">Guidelines for using Eventora and participating in its events.</p>
      </header>
      <section className="space-y-3">
        <h2 className="font-serif text-2xl font-bold text-forest">Using your account</h2>
        <p className="text-sm leading-7 text-[#5c5446]">
          Provide accurate account information and keep your sign-in credentials private. Use Eventora lawfully and do not interfere
          with other people&apos;s access to the service.
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="font-serif text-2xl font-bold text-forest">Events and bookings</h2>
        <p className="text-sm leading-7 text-[#5c5446]">
          Event details, availability, and prices are shown on each listing and may be updated by its organizer. Review the event
          information before booking. A booking is subject to the event&apos;s stated terms and availability.
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="font-serif text-2xl font-bold text-forest">Payments and conduct</h2>
        <p className="text-sm leading-7 text-[#5c5446]">
          Payments are handled by the payment provider shown during checkout. Treat other attendees and organizers respectfully
          and follow the event&apos;s safety and participation instructions.
        </p>
      </section>
      <Link href="/events" className="inline-block text-sm font-semibold text-terracotta hover:underline">
        Return to Explore Events
      </Link>
    </article>
  );
}
