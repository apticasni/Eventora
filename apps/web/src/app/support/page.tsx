import Link from 'next/link';

export default function SupportPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8">
      <header className="space-y-3 border-b border-[#e5dfd3] pb-6">
        <span className="text-xs font-bold uppercase tracking-widest text-terracotta">Eventora Community</span>
        <h1 className="font-serif text-4xl font-bold text-forest">Organizer Code of Conduct</h1>
        <p className="text-sm text-[#71695d]">Expectations for organizers hosting experiences on Eventora.</p>
      </header>
      <section className="space-y-3">
        <h2 className="font-serif text-2xl font-bold text-forest">Create a welcoming experience</h2>
        <p className="text-sm leading-7 text-[#5c5446]">
          Treat attendees fairly and respectfully. Do not tolerate harassment, discrimination, or intimidation at your events.
          Make reasonable efforts to ensure participants understand how to take part safely.
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="font-serif text-2xl font-bold text-forest">Be clear and reliable</h2>
        <p className="text-sm leading-7 text-[#5c5446]">
          Keep event descriptions, schedules, capacity, venue details, and prices accurate. Communicate material changes to
          registered attendees and honor the event information provided at booking.
        </p>
      </section>
      <Link href="/organizer/proposals/new" className="inline-block text-sm font-semibold text-terracotta hover:underline">
        Host a Workshop
      </Link>
    </article>
  );
}
