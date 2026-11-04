'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Activity, ArrowDownToLine, Bell, CalendarDays, ClipboardList, FileText, HeartHandshake,
  LayoutDashboard, LogOut, Menu, Settings2, Shield, TicketCheck, Users, WalletCards, X,
  Clock3, Eye,
} from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/hooks/useAuth';

const navigation = [
  { label: 'Dashboard', href: '/admin#overview', icon: LayoutDashboard },
  { label: 'Events', href: '/admin#events', icon: CalendarDays },
  { label: 'Users', href: '/admin#users', icon: Users },
  { label: 'Organizers', href: '/admin#organizers', icon: Shield },
  { label: 'Attendees', href: '/admin#attendees', icon: Users },
  { label: 'Bookings & Payments', href: '/admin#bookings', icon: WalletCards },
  { label: 'Waitlists', href: '/admin#waitlists', icon: Clock3 },
  { label: 'Reviews & Moderation', href: '/admin#reviews', icon: Eye },
  { label: 'Support Tickets', href: '/admin#support', icon: HeartHandshake },
  { label: 'Announcements', href: '/admin#announcements', icon: Bell },
  { label: 'QR Check-in Scanner', href: '/admin/scanner', icon: TicketCheck },
  { label: 'Reports & Exports', href: '/admin#reports', icon: ArrowDownToLine },
  { label: 'Audit Logs', href: '/admin#audit', icon: ClipboardList },
  { label: 'Platform Settings', href: '/admin#settings', icon: Settings2 },
  { label: 'Event Proposals', href: '/admin#proposals', icon: FileText },
  { label: 'System Status', href: '/admin#system', icon: Activity },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [hash, setHash] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    const updateHash = () => setHash(window.location.hash || '#overview');
    const timer = window.setTimeout(updateHash, 0);
    window.addEventListener('hashchange', updateHash);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('hashchange', updateHash);
    };
  }, [pathname]);

  const handleLogout = async () => {
    setLoggingOut(true);
    setLogoutError('');
    try {
      await logout();
      router.replace('/login');
    } catch {
      setLogoutError('Could not sign out. Please try again.');
      setLoggingOut(false);
    }
  };

  if (!isAdmin) return <>{children}</>;

  const activeHref = pathname === '/admin/scanner'
    ? '/admin/scanner'
    : `/admin${hash}`;

  return (
    <div className="min-h-screen md:pl-72">
      <div className="sticky top-0 z-30 flex justify-end border-b border-[#e5dfd3] bg-[#faf8f5]/95 p-3 backdrop-blur md:hidden">
        <button
          type="button"
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#ded7ca] bg-white px-3 text-sm font-semibold text-forest"
          aria-expanded={mobileOpen}
          aria-controls="admin-sidebar"
          onClick={() => setMobileOpen((open) => !open)}
        >
          {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          {mobileOpen ? 'Close menu' : 'Admin menu'}
        </button>
      </div>

      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-x-0 bottom-0 top-16 z-30 bg-black/35 md:hidden"
          aria-label="Close admin navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        id="admin-sidebar"
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-[#ded7ca] bg-[#faf8f5] shadow-warm transition-transform duration-200 md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Admin sidebar"
      >
        <div className="flex shrink-0 items-center gap-3 border-b border-[#e5dfd3] px-5 py-5">
          <Link
            href="/admin#overview"
            className="flex min-w-0 items-center gap-3"
            onClick={() => {
              setHash('#overview');
              window.dispatchEvent(new CustomEvent('eventora-admin-section-change', { detail: '#overview' }));
            }}
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-forest font-serif text-xl font-bold text-[#faf8f5]">E</span>
            <span className="min-w-0">
              <span className="block font-serif text-xl font-bold leading-tight text-forest">Eventora</span>
              <span className="mt-1 inline-flex rounded-full bg-[#e9e3d8] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#71695d]">Admin</span>
            </span>
          </Link>
        </div>

        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-3 py-4" aria-label="Admin navigation">
          {navigation.map(({ label, href, icon: Icon }) => {
            const active = activeHref === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => {
                  setMobileOpen(false);
                  if (href.includes('#')) {
                    const sectionHash = href.slice(href.indexOf('#'));
                    setHash(sectionHash);
                    window.dispatchEvent(new CustomEvent('eventora-admin-section-change', { detail: sectionHash }));
                  }
                }}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest ${
                  active ? 'bg-forest text-white shadow-sm' : 'text-[#5c5446] hover:bg-[#eee9df] hover:text-forest'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-[#e5dfd3] bg-[#f5f1e8] p-4">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar src={user.avatar} name={user.name} className="h-10 w-10 rounded-full border border-[#ded7ca]" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-forest">{user.name}</p>
              <p className="truncate text-xs text-[#71695d]">{user.email}</p>
            </div>
          </div>
          {logoutError && <p role="alert" className="mt-2 text-xs text-red-700">{logoutError}</p>}
          <button
            type="button"
            className="mt-3 inline-flex min-h-10 w-full items-center gap-2 rounded-xl px-3 text-sm font-semibold text-[#5c5446] hover:bg-white hover:text-forest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest disabled:opacity-60"
            onClick={() => void handleLogout()}
            disabled={loggingOut}
          >
            <LogOut className="h-4 w-4" />
            {loggingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </aside>

      {children}
    </div>
  );
}
