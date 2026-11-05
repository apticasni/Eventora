import React from 'react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-[#142e21] text-[#e8e4db] pt-16 pb-12 border-t border-[#234d38]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10 pb-12 border-b border-[#244b36]">
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-terracotta flex items-center justify-center text-white font-serif font-bold text-lg">
                E
              </div>
              <span className="font-serif text-2xl font-bold tracking-tight text-[#faf8f5]">
                Eventora
              </span>
            </div>
            <p className="text-sm text-[#b8b0a1] max-w-sm leading-relaxed">
              A curated destination for transformative workshops, masterclasses, and gatherings. Hand-crafted experiences taught by master practitioners, designed to inspire lifelong curiosity.
            </p>
            <div className="pt-2 text-xs text-[#9c9484]">
              <span>Bengaluru • Mumbai • New Delhi • Virtual</span>
            </div>
          </div>

          {/* Categories */}
          <div>
            <h4 className="font-serif text-base font-semibold text-[#faf8f5] mb-4">Discover</h4>
            <ul className="space-y-2.5 text-sm text-[#b8b0a1]">
              <li>
                <Link href="/events?category=technology" className="hover:text-white transition-colors">
                  Technology & Coding
                </Link>
              </li>
              <li>
                <Link href="/events?category=design" className="hover:text-white transition-colors">
                  Design Systems & UX
                </Link>
              </li>
              <li>
                <Link href="/events?category=business" className="hover:text-white transition-colors">
                  Startup & Leadership
                </Link>
              </li>
              <li>
                <Link href="/events?type=masterclass" className="hover:text-white transition-colors">
                  Masterclasses
                </Link>
              </li>
              <li>
                <Link href="/events?type=workshop" className="hover:text-white transition-colors">
                  Workshops
                </Link>
              </li>
            </ul>
          </div>

          {/* Platform */}
          <div>
            <h4 className="font-serif text-base font-semibold text-[#faf8f5] mb-4">Platform</h4>
            <ul className="space-y-2.5 text-sm text-[#b8b0a1]">
              <li>
                <Link href="/events" className="hover:text-white transition-colors">
                  Explore Calendar
                </Link>
              </li>
              <li>
                <Link href="/organizer/proposals/new" className="hover:text-white transition-colors">
                  Host a Workshop
                </Link>
              </li>
              <li>
                <Link href="/dashboard/bookings" className="hover:text-white transition-colors">
                  Attendee Ticket Wallet
                </Link>
              </li>
              <li>
                <Link href="/dashboard/waitlist" className="hover:text-white transition-colors">
                  Waitlist Priority Access
                </Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-white transition-colors">
                  Admin Command Center
                </Link>
              </li>
            </ul>
          </div>

          {/* Trust & Guarantee */}
          <div>
            <h4 className="font-serif text-base font-semibold text-[#faf8f5] mb-4">Guarantee</h4>
            <ul className="space-y-2.5 text-sm text-[#b8b0a1]">
              <li className="flex items-center gap-2">
                <span className="text-terracotta">✓</span> Verified Instructors
              </li>
              <li className="flex items-center gap-2">
                <span className="text-terracotta">✓</span> Instant QR Check-in
              </li>
              <li className="flex items-center gap-2">
                <span className="text-terracotta">✓</span> 100% Refund Protection
              </li>
              <li className="flex items-center gap-2">
                <span className="text-terracotta">✓</span> Verified Certificates
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-[#8c8273] gap-4">
          <p>© {new Date().getFullYear()} Eventora Inc. All rights reserved. Crafted with care.</p>
          <div className="flex space-x-6">
            <Link href="/privacy" className="hover:text-[#b8b0a1] transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-[#b8b0a1] transition-colors">Terms of Service</Link>
            <Link href="/support" className="hover:text-[#b8b0a1] transition-colors">Organizer Code of Conduct</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
