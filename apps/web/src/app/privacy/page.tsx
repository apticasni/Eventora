import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8">
      <header className="space-y-3 border-b border-[#e5dfd3] pb-6">
        <span className="text-xs font-bold uppercase tracking-widest text-terracotta">Eventora</span>
        <h1 className="font-serif text-4xl font-bold text-forest">Privacy</h1>
        <p className="text-sm text-[#71695d]">How information is used when you use Eventora.</p>
      </header>
      <section className="space-y-3">
        <h2 className="font-serif text-2xl font-bold text-forest">Information in your account</h2>
        <p className="text-sm leading-7 text-[#5c5446]">
          Eventora stores account details such as your name and email address, plus profile information you choose to provide.
          Passwords are stored as hashes. Your account information is used to provide sign-in and event features.
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="font-serif text-2xl font-bold text-forest">Events and payments</h2>
        <p className="text-sm leading-7 text-[#5c5446]">
          When you register for an event, Eventora stores the booking and related event records needed to manage your registration.
          Payments are processed through Razorpay; Eventora stores payment and booking status, not your full payment credentials.
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="font-serif text-2xl font-bold text-forest">Your choices</h2>
        <p className="text-sm leading-7 text-[#5c5446]">
          You can update profile information from your account profile and review your registrations in your bookings dashboard.
        </p>
      </section>
      <Link href="/events" className="inline-block text-sm font-semibold text-terracotta hover:underline">
        Return to Explore Events
      </Link>
    </article>
  );
}
