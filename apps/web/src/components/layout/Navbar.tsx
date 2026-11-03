'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Avatar } from '@/components/ui/Avatar';
import {
  Compass,
  Calendar,
  Sparkles,
  User as UserIcon,
  LogOut,
  PlusCircle,
  Shield,
  Menu,
  X,
  Ticket,
  ChevronDown
} from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-[#faf8f5]/90 backdrop-blur-md border-b border-[#e5dfd3] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand Logo & Editorial Wordmark */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-forest flex items-center justify-center text-[#faf8f5] shadow-sm group-hover:scale-105 transition-transform">
              <span className="font-serif font-bold text-xl tracking-tighter">E</span>
            </div>
            <div>
              <span className="font-serif text-2xl font-bold tracking-tight text-forest group-hover:text-forest-light transition-colors">
                Eventora
              </span>
              <span className="block text-[10px] tracking-widest text-[#71695d] uppercase font-sans -mt-1 font-medium">
                Discover • Connect • Experience
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              href="/events"
              className={`text-sm font-medium tracking-wide transition-colors hover:text-forest ${
                pathname.startsWith('/events') ? 'text-forest font-semibold' : 'text-[#5c5446]'
              }`}
            >
              Explore Events
            </Link>
            <Link
              href="/events?category=technology"
              className="text-sm font-medium tracking-wide text-[#5c5446] hover:text-forest transition-colors"
            >
              Masterclasses
            </Link>
            <Link
              href="/events?category=design"
              className="text-sm font-medium tracking-wide text-[#5c5446] hover:text-forest transition-colors"
            >
              Workshops
            </Link>
            <Link
              href="/organizer/proposals/new"
              className="text-sm font-medium tracking-wide text-[#5c5446] hover:text-forest transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-terracotta" />
              Propose Workshop
            </Link>
          </nav>

          {/* User Auth / Profile Actions */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center gap-3 p-1.5 pr-3 rounded-full border border-[#ded7ca] hover:border-[#c5bcae] bg-[#fbfaf8] hover:bg-white shadow-sm transition-all focus:outline-none"
                >
                  <Avatar
                    src={user.avatar}
                    name={user.name}
                    className="w-8 h-8 rounded-full border border-[#ded7ca]"
                  />
                  <div className="text-left hidden lg:block">
                    <p className="text-xs font-semibold text-forest leading-none">{user.name}</p>
                    <span className="text-[10px] text-terracotta font-medium uppercase tracking-wider">
                      {user.role}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-[#8c8273]" />
                </button>

                {profileDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setProfileDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-[#fdfcfb] rounded-xl shadow-warm-lg border border-[#e5dfd3] py-2 z-20 animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-4 py-2 border-b border-[#f0ede6]">
                        <p className="text-xs text-[#8c8273]">Signed in as</p>
                        <p className="text-sm font-semibold text-forest truncate">{user.email}</p>
                      </div>

                      <Link
                        href="/dashboard/bookings"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-sm text-[#40382b] hover:bg-[#f5f1e8] hover:text-forest transition-colors"
                      >
                        <Ticket className="w-4 h-4 text-forest" />
                        My Tickets & Bookings
                      </Link>

                      <Link
                        href="/dashboard/waitlist"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-sm text-[#40382b] hover:bg-[#f5f1e8] hover:text-forest transition-colors"
                      >
                        <Calendar className="w-4 h-4 text-forest" />
                        Waitlist Claims
                      </Link>

                      {user.role === 'ORGANIZER' && (
                        <Link
                          href="/organizer"
                          onClick={() => setProfileDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-sm text-terracotta hover:bg-[#f5f1e8] font-medium transition-colors"
                        >
                          <PlusCircle className="w-4 h-4" />
                          Organizer Studio
                        </Link>
                      )}

                      {user.role === 'ADMIN' && (
                        <Link
                          href="/admin"
                          onClick={() => setProfileDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-sm text-forest hover:bg-[#f5f1e8] font-semibold transition-colors"
                        >
                          <Shield className="w-4 h-4 text-forest" />
                          Admin Command Center
                        </Link>
                      )}

                      <div className="border-t border-[#f0ede6] my-1" />

                      <button
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          logout();
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-700 hover:bg-red-50 transition-colors text-left"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  href="/login"
                  className="text-sm font-semibold text-forest hover:text-forest-light px-4 py-2 rounded-lg hover:bg-[#f2ede4] transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="text-sm font-medium bg-forest hover:bg-forest-light text-[#faf8f5] px-5 py-2.5 rounded-lg shadow-sm hover:shadow transition-all"
                >
                  Join Eventora
                </Link>
              </div>
            )}
          </div>

          {/* Mobile hamburger menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-forest hover:bg-[#f2ede4] transition-colors"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[#e5dfd3] bg-[#faf8f5] px-4 pt-2 pb-6 space-y-3">
          <Link
            href="/events"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 text-base font-medium text-forest rounded-lg hover:bg-[#f2ede4]"
          >
            Explore Events
          </Link>
          <Link
            href="/events?category=technology"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 text-base font-medium text-[#5c5446] rounded-lg hover:bg-[#f2ede4]"
          >
            Masterclasses
          </Link>
          <Link
            href="/events?category=design"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 text-base font-medium text-[#5c5446] rounded-lg hover:bg-[#f2ede4]"
          >
            Workshops
          </Link>
          <Link
            href="/organizer/proposals/new"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 text-base font-medium text-terracotta rounded-lg hover:bg-[#f2ede4]"
          >
            Propose Workshop
          </Link>

          <div className="border-t border-[#ded7ca] pt-4 mt-2">
            {user ? (
              <div className="space-y-2">
                <div className="px-3 py-1">
                  <p className="text-sm font-semibold text-forest">{user.name}</p>
                  <p className="text-xs text-[#71695d]">{user.email}</p>
                </div>
                <Link
                  href="/dashboard/bookings"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 text-sm text-[#40382b] rounded-lg hover:bg-[#f2ede4]"
                >
                  My Tickets & Bookings
                </Link>
                {user.role === 'ADMIN' && (
                  <Link
                    href="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 text-sm font-medium text-forest rounded-lg hover:bg-[#f2ede4]"
                  >
                    Admin Dashboard
                  </Link>
                )}
                {user.role === 'ORGANIZER' && (
                  <Link
                    href="/organizer"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 text-sm font-medium text-terracotta rounded-lg hover:bg-[#f2ede4]"
                  >
                    Organizer Studio
                  </Link>
                )}
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="w-full text-left px-3 py-2 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 pt-2">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center w-full py-2.5 text-sm font-semibold text-forest border border-forest/30 rounded-lg"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center w-full py-2.5 text-sm font-semibold bg-forest text-[#faf8f5] rounded-lg shadow-sm"
                >
                  Join Eventora
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
