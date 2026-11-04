'use client';

import { FormEvent, useDeferredValue, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity, AlertTriangle, ArrowDownToLine, BadgeCheck, CalendarDays, Check, ChevronLeft,
  ChevronRight, CircleDollarSign,
  LoaderCircle, Search, Shield, ShieldAlert, TicketCheck, Users, X,
} from 'lucide-react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Avatar } from '@/components/ui/Avatar';
import { EventCoverImage } from '@/components/events/EventCoverImage';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getAdminStatusPresentation } from '@/lib/adminDisplay';

type AdminTab = 'overview' | 'users' | 'events' | 'proposals' | 'bookings' | 'waitlists' | 'reviews' | 'support' | 'categories' | 'audit' | 'system';
type AdminSpecialSection = 'announcements' | 'reports' | null;
type ApiResult<T = any> = { success: boolean; data?: T; message?: string };
type PageData = { items: any[]; total: number; page: number; totalPages: number };

function getAdminSection(hash: string): { tab: AdminTab; role?: string; section?: AdminSpecialSection } {
  const section = hash.replace(/^#/, '');
  if (section === 'organizers') return { tab: 'users', role: 'ORGANIZER' };
  if (section === 'attendees') return { tab: 'users', role: 'ATTENDEE' };
  if (section === 'announcements' || section === 'reports') return { tab: 'overview', section };
  if (section === 'settings') return { tab: 'categories' };
  const tabs: AdminTab[] = ['overview', 'users', 'events', 'proposals', 'bookings', 'waitlists', 'reviews', 'support', 'categories', 'audit', 'system'];
  return { tab: tabs.find((tab) => tab === section) || 'overview' };
}

const cardClass = 'rounded-2xl border border-[#ded7ca] bg-white shadow-warm';
const inputClass = 'min-h-11 w-full rounded-xl border border-[#ded7ca] bg-white px-3 text-sm text-forest outline-none focus-visible:ring-2 focus-visible:ring-forest';
const buttonClass = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-forest px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#244b37] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta disabled:cursor-not-allowed disabled:opacity-50';
const secondaryButtonClass = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#ded7ca] bg-white px-3 py-2 text-sm font-semibold text-forest hover:bg-[#faf8f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta disabled:opacity-50';

function assertSuccess<T>(result: ApiResult<T>): T {
  if (!result.success || result.data === undefined) throw new Error(result.message || 'The request could not be completed.');
  return result.data;
}

function StatusBadge({ children }: { children: unknown }) {
  const { label, tone } = getAdminStatusPresentation(children);
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${tone === 'positive' ? 'bg-emerald-50 text-emerald-800' : tone === 'caution' ? 'bg-amber-50 text-amber-800' : 'bg-stone-100 text-stone-700'}`}>
      {label}
    </span>
  );
}

function EmptyState({ label }: { label: string }) {
  return <div className="px-6 py-12 text-center text-sm text-[#71695d]">{label}</div>;
}

function PageControls({ data, onPage }: { data: PageData | null; onPage: (page: number) => void }) {
  if (!data || data.totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-[#eee9df] px-4 py-3 text-xs text-[#71695d]">
      <span>{data.total} records · page {data.page} of {data.totalPages}</span>
      <div className="flex gap-2">
        <button type="button" className={secondaryButtonClass} disabled={data.page <= 1} onClick={() => onPage(data.page - 1)} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></button>
        <button type="button" className={secondaryButtonClass} disabled={data.page >= data.totalPages} onClick={() => onPage(data.page + 1)} aria-label="Next page"><ChevronRight className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [specialSection, setSpecialSection] = useState<AdminSpecialSection>(null);
  const [dashboard, setDashboard] = useState<any>(null);
  const [pageData, setPageData] = useState<PageData | null>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [organizers, setOrganizers] = useState<any[]>([]);
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [eventCity, setEventCity] = useState('');
  const [eventFormat, setEventFormat] = useState('');
  const [eventCategoryId, setEventCategoryId] = useState('');
  const [eventOrganizerId, setEventOrganizerId] = useState('');
  const [eventFrom, setEventFrom] = useState('');
  const [eventTo, setEventTo] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [reason, setReason] = useState('');
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [dateRange, setDateRange] = useState('30');
  const [categoryForm, setCategoryForm] = useState({ name: '', slug: '', description: '' });
  const [categoryReason, setCategoryReason] = useState('');
  const [supportStatus, setSupportStatus] = useState('IN_PROGRESS');
  const [supportNote, setSupportNote] = useState('');
  const [selectedSupport, setSelectedSupport] = useState<any>(null);

  const range = useMemo(() => {
    const to = new Date();
    const from = new Date(to.getTime() - (Number(dateRange) - 1) * 24 * 60 * 60 * 1000);
    return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
  }, [dateRange]);

  const beginLoading = () => {
    setLoading(true);
    setError(null);
  };

  useEffect(() => {
    const syncSection = (hash = window.location.hash) => {
      const next = getAdminSection(hash);
      setActiveTab(next.tab);
      setSpecialSection(next.section || null);
      setRoleFilter(next.role || '');
      setPage(1);
      setQuery('');
      setStatusFilter('');
      setEventCity('');
      setEventFormat('');
      setEventCategoryId('');
      setEventOrganizerId('');
      setEventFrom('');
      setEventTo('');
      setSortBy('createdAt');
      setSortOrder('desc');
      setSelectedUser(null);
    };
    const handleSectionChange = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      syncSection(customEvent.detail);
    };
    const handleHashChange = () => syncSection();
    const timer = window.setTimeout(() => syncSection(), 0);
    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('eventora-admin-section-change', handleSectionChange);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('eventora-admin-section-change', handleSectionChange);
    };
  }, []);

  useEffect(() => {
    if (authLoading || user?.role !== 'ADMIN' || specialSection) return;
    let active = true;
    api.admin.dashboard(range)
      .then((response) => {
        const data = assertSuccess(response);
        if (active) setDashboard(data);
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Dashboard data could not be loaded.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [authLoading, refreshKey, user?.role, range, specialSection]);

  useEffect(() => {
    if (authLoading || user?.role !== 'ADMIN' || activeTab === 'overview' || specialSection) return;
    let active = true;
    const params: Record<string, string | number> = { page, limit: 20 };
    if (deferredQuery.trim()) params.q = deferredQuery.trim();
    if (statusFilter) params.status = statusFilter;
    if (activeTab === 'users' && roleFilter) params.role = roleFilter;
    if (activeTab === 'users' || activeTab === 'events') {
      params.sortBy = sortBy;
      params.sortOrder = sortOrder;
    }
    if (activeTab === 'events') {
      if (eventCity.trim()) params.city = eventCity.trim();
      if (eventFormat) params.format = eventFormat;
      if (eventCategoryId) params.categoryId = eventCategoryId;
      if (eventOrganizerId) params.organizerId = eventOrganizerId;
      if (eventFrom) params.from = eventFrom;
      if (eventTo) params.to = eventTo;
    }

    const load = async () => {
      try {
        if (activeTab === 'categories') {
          const result = assertSuccess(await api.admin.categories());
          if (active) setCategories(result);
        } else if (activeTab === 'system') {
          const result = assertSuccess(await api.admin.systemStatus());
          if (active) setSystemStatus(result);
        } else if (activeTab === 'support') {
          const result = assertSuccess(await api.support.adminList(params));
          if (active) {
            setPageData(result);
            setRecords(result.items || []);
          }
        } else if (activeTab === 'audit') {
          const result = assertSuccess(await api.admin.audit(params));
          if (active) {
            setPageData(result);
            setRecords(result.items || []);
          }
        } else if (activeTab === 'proposals') {
          const result = assertSuccess(await api.proposals.adminList());
          if (active) {
            setRecords(result.filter((proposal: any) => proposal.status === 'PENDING'));
            setPageData(null);
          }
        } else if (activeTab === 'events') {
          const [eventResponse, categoryResponse, organizerResponse] = await Promise.all([
            api.admin.events(params),
            api.admin.categories(),
            api.admin.users({ role: 'ORGANIZER', limit: 100 }),
          ]);
          const result = assertSuccess(eventResponse);
          const organizerResult = assertSuccess(organizerResponse);
          if (active) {
            setPageData(result);
            setRecords(result.items || []);
            setCategories(assertSuccess(categoryResponse));
            setOrganizers(organizerResult.users || []);
          }
        } else {
          const response = activeTab === 'users'
            ? await api.admin.users({ ...params, ...(statusFilter ? { status: statusFilter === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE' } : {}) })
            : activeTab === 'bookings'
                ? await api.admin.bookings(params)
                : activeTab === 'waitlists'
                  ? await api.admin.waitlists(params)
                  : await api.admin.reviews(params);
          const result = assertSuccess(response);
          if (active) {
            setPageData(result);
            const items = activeTab === 'users' ? result.users : result.items || result.users;
            if (!Array.isArray(items)) throw new Error(`The ${activeTab} response did not include a valid record list.`);
            setRecords(items);
          }
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'This admin view could not be loaded.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [activeTab, authLoading, deferredQuery, eventCategoryId, eventCity, eventFormat, eventFrom, eventOrganizerId, eventTo, page, refreshKey, roleFilter, sortBy, sortOrder, statusFilter, user?.role, specialSection]);

  const perform = async (operation: () => Promise<ApiResult>, successMessage: string): Promise<boolean> => {
    setError(null);
    setNotice(null);
    try {
      const result = await operation();
      if (!result.success) throw new Error(result.message || 'The requested action failed.');
      setNotice(successMessage);
      setReason('');
      setLoading(true);
      setRefreshKey((current) => current + 1);
      if (activeTab === 'overview') {
        const data = assertSuccess(await api.admin.dashboard(range));
        setDashboard(data);
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The requested action failed.');
      return false;
    }
  };

  const exportCsv = async (path: string, filename: string) => {
    setError(null);
    const params = new URLSearchParams();
    const financialExport = path.endsWith('/financials');
    if (!financialExport && deferredQuery.trim()) params.set('q', deferredQuery.trim());
    if (!financialExport && statusFilter) params.set('status', statusFilter);
    if (activeTab === 'users' && roleFilter) params.set('role', roleFilter);
    if (activeTab === 'events') {
      if (eventCity.trim()) params.set('city', eventCity.trim());
      if (eventFormat) params.set('format', eventFormat);
      if (eventCategoryId) params.set('categoryId', eventCategoryId);
      if (eventOrganizerId) params.set('organizerId', eventOrganizerId);
      if (eventFrom) params.set('from', eventFrom);
      if (eventTo) params.set('to', eventTo);
    }
    if (financialExport) {
      params.set('from', range.from);
      params.set('to', range.to);
    }
    const filteredPath = params.size ? `${path}?${params.toString()}` : path;
    const result = await api.admin.downloadCsv(filteredPath, filename);
    if (!result.success) setError(result.message || 'Report export failed.');
    else setNotice(`${filename} downloaded.`);
  };

  const changeUserRole = async (target: any, newRole: string) => {
    if (newRole === target.role || reason.trim().length < 8) return;
    if (!window.confirm(`Change ${target.name}'s role to ${newRole}? This affects their access immediately.`)) return;
    await perform(() => api.admin.updateUserRole(target.id, newRole, reason), 'User role updated and recorded in the audit log.');
  };

  const toggleSuspension = async (target: any) => {
    if (reason.trim().length < 8) return;
    const suspend = !target.suspendedAt;
    if (!window.confirm(`${suspend ? 'Suspend' : 'Reactivate'} ${target.name}'s account?`)) return;
    await perform(() => api.admin.updateUserSuspension(target.id, suspend, reason), suspend ? 'Account suspended.' : 'Account reactivated.');
  };

  const changeEventStatus = async (event: any) => {
    if (reason.trim().length < 8) return;
    const status = event.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    if (!window.confirm(`${status === 'DRAFT' ? 'Unpublish' : 'Publish'} “${event.title}”?`)) return;
    await perform(() => api.admin.updateEventStatus(event.id, status, reason), `Event ${status.toLowerCase()}.`);
  };

  const changeReviewStatus = async (review: any, status: string) => {
    if (reason.trim().length < 8) return;
    if (!window.confirm(`${status === 'HIDDEN' ? 'Hide' : status === 'REMOVED' ? 'Remove' : 'Restore'} this review?`)) return;
    await perform(() => api.admin.moderateReview(review.id, status, reason), `Review marked ${status.toLowerCase()}.`);
  };

  const submitCategory = async (event: FormEvent) => {
    event.preventDefault();
    if (categoryReason.trim().length < 8) {
      setError('Enter a reason of at least 8 characters to create a category.');
      return;
    }
    const succeeded = await perform(() => api.admin.createCategory({
      ...categoryForm,
      slug: categoryForm.slug || categoryForm.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      reason: categoryReason,
    }), 'Category created.');
    if (!succeeded) return;
    setCategoryForm({ name: '', slug: '', description: '' });
    setCategoryReason('');
  };

  const updateSupport = async (request: any) => {
    if (reason.trim().length < 8) return;
    const succeeded = await perform(() => api.support.update(request.id, {
      status: supportStatus,
      assignedAdminId: user!.id,
      reason,
      ...(supportNote.trim() ? { internalNote: supportNote.trim() } : {}),
    }), 'Support request updated. Notes are internal to administrators.');
    if (!succeeded) return;
    setSupportNote('');
    setSelectedSupport(null);
  };

  if (authLoading) {
    return <main className="grid min-h-[50vh] place-items-center text-forest"><LoaderCircle className="h-7 w-7 animate-spin" aria-label="Loading admin access" /></main>;
  }
  if (!user || user.role !== 'ADMIN') {
    return (
      <main className="mx-auto max-w-xl px-5 py-24 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-terracotta" />
        <h1 className="mt-4 font-serif text-3xl font-bold text-forest">Admin access required</h1>
        <p className="mt-2 text-sm text-[#71695d]">Sign in with an authorized Eventora administrator account to continue.</p>
        <Link href="/login" className={`${buttonClass} mt-6`}>Go to sign in</Link>
      </main>
    );
  }

  const totals = dashboard?.totals;
  const pageHeading = specialSection === 'announcements'
    ? 'Announcements'
    : specialSection === 'reports'
      ? 'Reports & exports'
      : ({
        overview: 'Command center',
        users: 'User management',
        events: 'Event management',
        proposals: 'Event proposals',
        bookings: 'Bookings & payments',
        waitlists: 'Waitlist operations',
        reviews: 'Reviews & moderation',
        support: 'Support tickets',
        categories: 'Platform settings · categories',
        audit: 'Audit logs',
        system: 'System status',
      } satisfies Record<AdminTab, string>)[activeTab];

  return (
    <main className="mx-auto max-w-[1440px] space-y-6 px-4 py-7 sm:px-6 lg:px-8">
      <header className="flex flex-col justify-between gap-5 border-b border-[#e5dfd3] pb-6 lg:flex-row lg:items-end">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-terracotta"><Shield className="h-4 w-4" />Eventora administration</div>
          <h1 className="mt-2 font-serif text-3xl font-bold text-forest sm:text-4xl">{pageHeading}</h1>
          <p className="mt-1 max-w-2xl text-sm text-[#71695d]">Review platform activity, manage access and keep event operations accountable.</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <Link href="/admin/scanner" className={secondaryButtonClass}><TicketCheck className="h-4 w-4" />Scan tickets</Link>
          <label className="text-xs font-semibold text-[#71695d]">
            Analytics period
            <select className={`${inputClass} mt-1 min-w-36`} value={dateRange} onChange={(event) => { beginLoading(); setDateRange(event.target.value); }} aria-label="Analytics date range">
              <option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option>
            </select>
          </label>
          <button type="button" className={secondaryButtonClass} onClick={() => { beginLoading(); setRefreshKey((key) => key + 1); setDashboard(null); }}>
            <Activity className="h-4 w-4" />Refresh
          </button>
        </div>
      </header>

      {error && <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
      {notice && <div role="status" className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"><Check className="mt-0.5 h-4 w-4 shrink-0" />{notice}<button className="ml-auto" onClick={() => setNotice(null)} aria-label="Dismiss message"><X className="h-4 w-4" /></button></div>}

      {specialSection === 'announcements' && (
        <section className={`${cardClass} p-6`} aria-labelledby="admin-announcements-heading">
          <h2 id="admin-announcements-heading" className="font-serif text-xl font-bold text-forest">Announcement management is not available yet</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#71695d]">This navigation item is reserved for a future announcement workflow. No messages will be sent from this page.</p>
        </section>
      )}

      {specialSection === 'reports' && (
        <section className={`${cardClass} p-6`} aria-labelledby="admin-reports-heading">
          <h2 id="admin-reports-heading" className="font-serif text-xl font-bold text-forest">Export verified platform reports</h2>
          <p className="mt-2 text-sm leading-6 text-[#71695d]">Exports use the existing server-side admin endpoints. Financial data is limited to verified payment records.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" className={secondaryButtonClass} onClick={() => void exportCsv('/admin/export/users', 'eventora-users.csv')}><ArrowDownToLine className="h-4 w-4" />Users</button>
            <button type="button" className={secondaryButtonClass} onClick={() => void exportCsv('/admin/export/events', 'eventora-events.csv')}><ArrowDownToLine className="h-4 w-4" />Events</button>
            <button type="button" className={secondaryButtonClass} onClick={() => void exportCsv('/admin/export/bookings', 'eventora-bookings.csv')}><ArrowDownToLine className="h-4 w-4" />Bookings</button>
            <button type="button" className={secondaryButtonClass} onClick={() => void exportCsv('/admin/export/waitlists', 'eventora-waitlists.csv')}><ArrowDownToLine className="h-4 w-4" />Waitlists</button>
            <button type="button" className={secondaryButtonClass} onClick={() => void exportCsv('/admin/export/reviews', 'eventora-reviews.csv')}><ArrowDownToLine className="h-4 w-4" />Reviews</button>
            <button type="button" className={secondaryButtonClass} onClick={() => void exportCsv('/admin/export/financials', 'eventora-verified-financials.csv')}><CircleDollarSign className="h-4 w-4" />Verified financials</button>
          </div>
        </section>
      )}

      {!specialSection && activeTab === 'overview' && (
        loading && !dashboard ? <LoadingPanel /> : !dashboard ? <EmptyState label="No dashboard metrics are available." /> : (
          <div id="admin-panel-overview" role="region" aria-label="Dashboard analytics" tabIndex={0} className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Metric icon={Users} label="Total users" value={totals.totalUsers} detail={`${totals.organizers} organizers · ${totals.attendees} attendees`} />
              <Metric icon={CalendarDays} label="Events" value={totals.totalEvents} detail={`${totals.publishedEvents} published`} />
              <Metric icon={TicketCheck} label="Registrations" value={totals.totalBookings} detail={`${totals.confirmedBookings} confirmed · ${totals.pendingBookings} pending`} />
              <Metric icon={BadgeCheck} label="Confirmed seats" value={totals.confirmedSeats} detail={`${totals.totalAttendance} check-ins`} />
              <Metric icon={CircleDollarSign} label="Verified gross" value={formatCurrency(totals.grossRevenue)} detail={`${totals.verifiedCapturedPayments} verified captures`} />
              <Metric icon={CircleDollarSign} label="Verified refunds" value={formatCurrency(totals.refunds)} detail={`${totals.verifiedRefunds} verified refunds`} />
              <Metric icon={CircleDollarSign} label="Net verified" value={formatCurrency(totals.netRevenue)} detail="Gross less verified refunds" />
              <Metric icon={AlertTriangle} label="Needs attention" value={totals.pendingApprovals + totals.activeWaitlists + totals.failedPayments} detail={`${totals.pendingApprovals} approvals · ${totals.activeWaitlists} waitlist · ${totals.failedPayments} failed payments`} />
            </div>
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-950">
              {dashboard.revenueNote} Platform fees are unavailable because Eventora&apos;s current payment schema does not record them.
            </p>
            <div className="grid gap-5 xl:grid-cols-2">
              <section className={`${cardClass} p-5`} aria-label="Confirmed registration trend">
                <h2 className="font-serif text-lg font-bold text-forest">Confirmed registrations</h2><p className="mb-4 text-xs text-[#71695d]">{range.from} – {range.to}</p>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%"><AreaChart data={dashboard.registrations}>
                    <defs><linearGradient id="adminRegistrations" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#1a3a2a" stopOpacity={0.35} /><stop offset="95%" stopColor="#1a3a2a" stopOpacity={0} /></linearGradient></defs>
                    <CartesianGrid stroke="#eee9df" vertical={false} /><XAxis dataKey="date" tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} tick={{ fontSize: 10 }} /><Tooltip />
                    <Area type="monotone" dataKey="count" name="Bookings" stroke="#1a3a2a" fill="url(#adminRegistrations)" />
                  </AreaChart></ResponsiveContainer>
                </div>
              </section>
              <section className={`${cardClass} p-5`} aria-label="Verified revenue trend">
                <h2 className="font-serif text-lg font-bold text-forest">Verified payment activity</h2><p className="mb-4 text-xs text-[#71695d]">Captures and refunds by payment record date</p>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%"><BarChart data={dashboard.revenue}>
                    <CartesianGrid stroke="#eee9df" vertical={false} /><XAxis dataKey="date" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="gross" name="Gross captured" fill="#1a3a2a" radius={[4, 4, 0, 0]} /><Bar dataKey="refunds" name="Refunded" fill="#c86446" radius={[4, 4, 0, 0]} />
                  </BarChart></ResponsiveContainer>
                </div>
              </section>
              <section className={`${cardClass} p-5`}>
                <h2 className="font-serif text-lg font-bold text-forest">Event activity</h2>
                <div className="mt-4 flex flex-wrap gap-3">{dashboard.eventActivity.map((item: any) => <div key={item.status} className="flex min-w-28 flex-1 items-center justify-between rounded-xl bg-[#faf8f5] p-3"><StatusBadge>{item.status}</StatusBadge><strong className="text-lg text-forest">{item.count}</strong></div>)}</div>
                <h3 className="mt-6 font-semibold text-forest">Categories</h3>
                {dashboard.categories.length ? <div className="mt-3 h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={dashboard.categories} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid stroke="#eee9df" horizontal={false} /><XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} /><YAxis type="category" dataKey="name" width={95} tick={{ fontSize: 10 }} /><Tooltip /><Bar dataKey="confirmedBookings" name="Confirmed bookings" fill="#c86446" radius={[0, 4, 4, 0]} />
                </BarChart></ResponsiveContainer></div> : <EmptyState label="No categories yet." />}
              </section>
              <section className={`${cardClass} p-5`}>
                <h2 className="font-serif text-lg font-bold text-forest">Recent activity</h2>
                {dashboard.recentActivity.length ? <ul className="mt-3 divide-y divide-[#eee9df]">{dashboard.recentActivity.map((item: any) => <li key={item.id} className="flex items-start justify-between gap-3 py-3"><div><p className="text-sm font-semibold capitalize text-forest">{item.title}</p><p className="mt-0.5 text-xs text-[#71695d]">{item.detail}</p></div><time className="shrink-0 text-[11px] text-[#8c8273]">{formatDate(item.at)}</time></li>)}</ul> : <EmptyState label="Activity will appear here as the platform is used." />}
                <div className="mt-4 flex flex-wrap gap-2">{dashboard.alerts.map((alert: any) => <span key={alert.type} className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900">{alert.count} {alert.label}</span>)}</div>
              </section>
            </div>
          </div>
        )
      )}

      {!specialSection && activeTab !== 'overview' && activeTab !== 'system' && activeTab !== 'categories' && (
        <section id={`admin-panel-${activeTab}`} aria-label={`${pageHeading} records`} tabIndex={0} className={`${cardClass} overflow-hidden`}>
          <div className="flex flex-col gap-4 border-b border-[#eee9df] p-4 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-1 flex-wrap items-end gap-3">
              {activeTab !== 'waitlists' && <label className="min-w-[220px] flex-1 text-xs font-semibold text-[#71695d]">Search
                <span className="relative mt-1 block"><Search className="absolute left-3 top-3 h-4 w-4 text-[#8c8273]" /><input className={`${inputClass} pl-9`} value={query} onChange={(event) => { beginLoading(); setPage(1); setQuery(event.target.value); }} placeholder={searchPlaceholder(activeTab)} /></span>
              </label>}
              <FilterControl tab={activeTab} value={statusFilter} onChange={(value) => { beginLoading(); setPage(1); setStatusFilter(value); }} />
              {activeTab === 'users' && <label className="text-xs font-semibold text-[#71695d]">Role<select className={`${inputClass} mt-1 min-w-36`} value={roleFilter} onChange={(event) => { beginLoading(); setPage(1); setRoleFilter(event.target.value); }}><option value="">All roles</option><option value="ATTENDEE">Attendee</option><option value="ORGANIZER">Organizer</option><option value="ADMIN">Admin</option></select></label>}
              {['users', 'events'].includes(activeTab) && <label className="text-xs font-semibold text-[#71695d]">Sort by<select className={`${inputClass} mt-1 min-w-36`} value={sortBy} onChange={(event) => { beginLoading(); setPage(1); setSortBy(event.target.value); }}><option value="createdAt">Date added</option>{activeTab === 'users' ? <option value="name">Name</option> : <><option value="startDate">Event date</option><option value="title">Title</option><option value="bookedSeats">Booked seats</option></>}</select></label>}
              {['users', 'events'].includes(activeTab) && <label className="text-xs font-semibold text-[#71695d]">Order<select className={`${inputClass} mt-1 min-w-28`} value={sortOrder} onChange={(event) => { beginLoading(); setPage(1); setSortOrder(event.target.value); }}><option value="desc">Descending</option><option value="asc">Ascending</option></select></label>}
              {activeTab === 'events' && <>
                <label className="text-xs font-semibold text-[#71695d]">City<input className={`${inputClass} mt-1 min-w-32`} value={eventCity} onChange={(event) => { beginLoading(); setPage(1); setEventCity(event.target.value); }} /></label>
                <label className="text-xs font-semibold text-[#71695d]">Format<select className={`${inputClass} mt-1 min-w-32`} value={eventFormat} onChange={(event) => { beginLoading(); setPage(1); setEventFormat(event.target.value); }}><option value="">All formats</option><option value="IN_PERSON">In person</option><option value="ONLINE">Online</option><option value="HYBRID">Hybrid</option></select></label>
                <label className="text-xs font-semibold text-[#71695d]">Category<select className={`${inputClass} mt-1 min-w-36`} value={eventCategoryId} onChange={(event) => { beginLoading(); setPage(1); setEventCategoryId(event.target.value); }}><option value="">All categories</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
                <label className="text-xs font-semibold text-[#71695d]">Organizer<select className={`${inputClass} mt-1 min-w-40`} value={eventOrganizerId} onChange={(event) => { beginLoading(); setPage(1); setEventOrganizerId(event.target.value); }}><option value="">All organizers</option>{organizers.map((organizer) => <option key={organizer.id} value={organizer.id}>{organizer.name}</option>)}</select></label>
                <label className="text-xs font-semibold text-[#71695d]">From<input type="date" className={`${inputClass} mt-1 min-w-36`} value={eventFrom} onChange={(event) => { beginLoading(); setPage(1); setEventFrom(event.target.value); }} /></label>
                <label className="text-xs font-semibold text-[#71695d]">To<input type="date" className={`${inputClass} mt-1 min-w-36`} value={eventTo} onChange={(event) => { beginLoading(); setPage(1); setEventTo(event.target.value); }} /></label>
              </>}
            </div>
            <div className="flex gap-2">
              {['users', 'events', 'bookings', 'waitlists', 'reviews'].includes(activeTab) && <button className={secondaryButtonClass} onClick={() => void exportCsv(`/admin/export/${activeTab === 'users' ? 'users' : activeTab === 'events' ? 'events' : activeTab === 'waitlists' ? 'waitlists' : activeTab === 'reviews' ? 'reviews' : 'bookings'}`, `eventora-${activeTab}.csv`)}><ArrowDownToLine className="h-4 w-4" />Export CSV</button>}
              {activeTab === 'bookings' && <button className={secondaryButtonClass} onClick={() => void exportCsv('/admin/export/financials', 'eventora-verified-financials.csv')}><CircleDollarSign className="h-4 w-4" />Financials</button>}
            </div>
          </div>

          {reasonRequiredFor(activeTab) && <div className="border-b border-[#eee9df] bg-[#faf8f5] p-4"><label className="block text-xs font-semibold text-[#71695d]">Reason for sensitive admin action (minimum 8 characters)<input className={`${inputClass} mt-1`} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Explain why this change is needed" /></label></div>}
          {loading && <LoadingPanel />}
          {!loading && activeTab === 'users' && <UsersTable records={records} onView={async (id) => {
            const result = await api.admin.user(id);
            try { setSelectedUser(assertSuccess(result)); } catch (err) { setError(err instanceof Error ? err.message : 'Could not load user details.'); }
          }} onRole={changeUserRole} onSuspend={toggleSuspension} reason={reason} />}
          {!loading && activeTab === 'events' && <EventsTable records={records} onChangeStatus={changeEventStatus} reason={reason} />}
          {!loading && activeTab === 'proposals' && <ProposalsTable records={records} reason={reason} onApprove={(proposal) => {
            if (reason.trim().length < 8 || !window.confirm(`Approve “${proposal.title}” and create its draft event?`)) return;
            void perform(() => api.proposals.approve(proposal.id, reason), 'Proposal approved and a draft event created.');
          }} onReject={(proposal) => {
            if (reason.trim().length < 8 || !window.confirm(`Reject “${proposal.title}”?`)) return;
            void perform(() => api.proposals.reject(proposal.id, reason), 'Proposal rejected and recorded in the audit log.');
          }} />}
          {!loading && activeTab === 'bookings' && <BookingsTable records={records} />}
          {!loading && activeTab === 'waitlists' && <WaitlistsTable records={records} reason={reason} onPromote={(eventId) => {
            if (reason.trim().length < 8 || !window.confirm('Offer the next available seat to the first eligible attendee in FIFO order?')) return;
            void perform(() => api.admin.promoteWaitlist(eventId, reason), 'The next eligible attendee has received an in-app offer.');
          }} onRemove={(id) => {
            if (reason.trim().length < 8 || !window.confirm('Withdraw this waitlist entry?')) return;
            void perform(() => api.admin.removeWaitlist(id, reason), 'Waitlist entry withdrawn.');
          }} />}
          {!loading && activeTab === 'reviews' && <ReviewsTable records={records} onModerate={changeReviewStatus} reason={reason} />}
          {!loading && activeTab === 'support' && <SupportTable records={records} onSelect={(request) => { setSelectedSupport(request); setSupportStatus(request.status); setSupportNote(''); }} />}
          {!loading && activeTab === 'audit' && <AuditTable records={records} />}
          {!loading && !records.length && ['users', 'events', 'proposals', 'bookings', 'waitlists', 'reviews', 'support', 'audit'].includes(activeTab) && <EmptyState label="No records match these filters." />}
          <PageControls data={pageData} onPage={(nextPage) => { beginLoading(); setPage(nextPage); }} />
        </section>
      )}

      {activeTab === 'categories' && (
        <div id="admin-panel-categories" role="region" aria-label="Event categories" tabIndex={0} className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.7fr)]">
          <section className={`${cardClass} overflow-hidden`}>
            <h2 className="border-b border-[#eee9df] p-5 font-serif text-xl font-bold text-forest">Event categories</h2>
            {loading ? <LoadingPanel /> : categories.length ? <ul className="divide-y divide-[#eee9df]">{categories.map((category) => <li key={category.id} className="flex items-center justify-between gap-4 p-4"><div><p className="font-semibold text-forest">{category.name}</p><p className="text-xs text-[#71695d]">{category.slug} · {category._count?.events ?? 0} events</p></div><StatusBadge>{category._count?.events ? 'IN USE' : 'AVAILABLE'}</StatusBadge></li>)}</ul> : <EmptyState label="No categories are configured." />}
          </section>
          <form onSubmit={submitCategory} className={`${cardClass} space-y-4 p-5`}>
            <h2 className="font-serif text-xl font-bold text-forest">Add a category</h2>
            <label className="block text-xs font-semibold text-[#71695d]">Name<input required minLength={2} maxLength={80} className={`${inputClass} mt-1`} value={categoryForm.name} onChange={(event) => setCategoryForm((form) => ({ ...form, name: event.target.value }))} /></label>
            <label className="block text-xs font-semibold text-[#71695d]">Slug<input className={`${inputClass} mt-1`} value={categoryForm.slug} onChange={(event) => setCategoryForm((form) => ({ ...form, slug: event.target.value }))} placeholder="Generated from name if empty" /></label>
            <label className="block text-xs font-semibold text-[#71695d]">Description<textarea maxLength={500} className={`${inputClass} mt-1 min-h-24 py-3`} value={categoryForm.description} onChange={(event) => setCategoryForm((form) => ({ ...form, description: event.target.value }))} /></label>
            <label className="block text-xs font-semibold text-[#71695d]">Reason<input required minLength={8} className={`${inputClass} mt-1`} value={categoryReason} onChange={(event) => setCategoryReason(event.target.value)} /></label>
            <button type="submit" className={buttonClass} disabled={categoryReason.trim().length < 8}><Check className="h-4 w-4" />Create category</button>
          </form>
        </div>
      )}

      {activeTab === 'system' && (
        <section id="admin-panel-system" aria-label="System status" tabIndex={0} className={`${cardClass} p-5`}>
          <h2 className="font-serif text-xl font-bold text-forest">System status</h2>
          <p className="mt-1 text-sm text-[#71695d]">Configuration state only; no secrets or infrastructure details are exposed.</p>
          {loading ? <LoadingPanel /> : systemStatus && <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <SystemStatusCard label="API" value={systemStatus.api} />
            <SystemStatusCard label="Database connectivity" value={systemStatus.database} />
            <SystemStatusCard label="Payment provider configuration" value={systemStatus.payments} />
            <SystemStatusCard label="Email" value={systemStatus.email} />
            <SystemStatusCard label="Operational error history" value={systemStatus.recentOperationalErrors} />
            <div className="rounded-xl bg-[#faf8f5] p-4 text-sm"><span className="text-xs font-semibold uppercase tracking-wide text-[#71695d]">Last checked</span><p className="mt-2 font-semibold text-forest">{formatDate(systemStatus.checkedAt)}</p></div>
          </div>}
        </section>
      )}

      {selectedUser && <UserDetailDialog user={selectedUser} onClose={() => setSelectedUser(null)} />}
      {selectedSupport && <SupportDialog
        request={selectedSupport}
        status={supportStatus}
        note={supportNote}
        reason={reason}
        onStatus={setSupportStatus}
        onNote={setSupportNote}
        onClose={() => setSelectedSupport(null)}
        onSave={() => void updateSupport(selectedSupport)}
      />}
    </main>
  );
}

function Metric({ icon: Icon, label, value, detail }: { icon: typeof Users; label: string; value: string | number; detail: string }) {
  return <article className={`${cardClass} p-4`}><div className="flex items-center justify-between gap-3"><span className="text-[11px] font-bold uppercase tracking-wider text-[#8c8273]">{label}</span><Icon className="h-4 w-4 text-terracotta" /></div><p className="mt-3 font-serif text-2xl font-bold text-forest">{value}</p><p className="mt-1 text-xs text-[#71695d]">{detail}</p></article>;
}

function LoadingPanel() {
  return <div className="grid min-h-36 place-items-center text-sm text-[#71695d]" role="status"><span className="flex items-center gap-2"><LoaderCircle className="h-5 w-5 animate-spin" />Loading verified data…</span></div>;
}

function FilterControl({ tab, value, onChange }: { tab: AdminTab; value: string; onChange: (value: string) => void }) {
  const options: Record<string, Array<[string, string]>> = {
    users: [['ACTIVE', 'Active'], ['SUSPENDED', 'Suspended']],
    events: [['DRAFT', 'Draft'], ['PUBLISHED', 'Published'], ['CANCELLED', 'Cancelled'], ['COMPLETED', 'Completed']],
    bookings: [['PENDING', 'Pending'], ['CONFIRMED', 'Confirmed'], ['CANCELLED', 'Cancelled'], ['REFUNDED', 'Refunded']],
    waitlists: [['WAITING', 'Waiting'], ['OFFERED', 'Offered'], ['CONFIRMED', 'Confirmed'], ['EXPIRED', 'Expired'], ['WITHDRAWN', 'Withdrawn']],
    reviews: [['PUBLISHED', 'Published'], ['HIDDEN', 'Hidden'], ['REMOVED', 'Removed']],
    support: [['NEW', 'New'], ['IN_PROGRESS', 'In progress'], ['WAITING_ON_USER', 'Waiting on user'], ['RESOLVED', 'Resolved'], ['CLOSED', 'Closed']],
  };
  if (!options[tab]) return null;
  return <label className="text-xs font-semibold text-[#71695d]">Status<select className={`${inputClass} mt-1 min-w-36`} value={value} onChange={(event) => onChange(event.target.value)}><option value="">All statuses</option>{options[tab].map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>;
}

function searchPlaceholder(tab: AdminTab) {
  return tab === 'users' ? 'Name or email' : tab === 'events' ? 'Event title or slug' : tab === 'bookings' ? 'Reference, attendee, email, event' : tab === 'reviews' ? 'Review, event, attendee' : tab === 'support' ? 'Case reference, subject, requester' : 'Search audit entries';
}

function reasonRequiredFor(tab: AdminTab) {
  return ['users', 'events', 'proposals', 'waitlists', 'reviews', 'support'].includes(tab);
}

function UsersTable({ records, onView, onRole, onSuspend, reason }: { records: any[]; onView: (id: string) => void; onRole: (user: any, role: string) => void; onSuspend: (user: any) => void; reason: string }) {
  const [roles, setRoles] = useState<Record<string, string>>({});
  return <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-[#faf8f5] text-[10px] uppercase tracking-wider text-[#71695d]"><tr><th className="p-3">Person</th><th className="p-3">Role</th><th className="p-3">Activity</th><th className="p-3">Status</th><th className="p-3">Admin actions</th></tr></thead><tbody className="divide-y divide-[#eee9df]">{records.map((person) => <tr key={person.id}>
    <td className="p-3"><div className="flex items-center gap-3"><Avatar src={person.avatar} name={person.name} className="h-10 w-10 rounded-full border border-[#ded7ca]" /><div><p className="font-semibold text-forest">{person.name}</p><p className="text-xs text-[#71695d]">{person.email}</p></div></div></td>
    <td className="p-3"><StatusBadge>{person.role}</StatusBadge></td>
    <td className="p-3 text-xs text-[#71695d]">{person._count?.bookings || 0} bookings · {person._count?.organizedEvents || 0} events</td>
    <td className="p-3"><StatusBadge>{person.suspendedAt ? 'SUSPENDED' : 'ACTIVE'}</StatusBadge></td>
    <td className="p-3"><div className="flex flex-wrap items-center gap-2"><button className={secondaryButtonClass} disabled={!person.id} onClick={() => onView(person.id)}>Profile</button><select className="min-h-10 rounded-lg border border-[#ded7ca] bg-white px-2 text-xs" aria-label={`Change role for ${person.name}`} value={roles[person.id] ?? (typeof person.role === 'string' ? person.role : '')} onChange={(event) => setRoles((current) => ({ ...current, [person.id]: event.target.value }))}><option value="" disabled>Unavailable</option><option value="ATTENDEE">Attendee</option><option value="ORGANIZER">Organizer</option><option value="ADMIN">Admin</option></select><button className={secondaryButtonClass} disabled={!person.id || !['ATTENDEE', 'ORGANIZER', 'ADMIN'].includes(person.role) || reason.trim().length < 8 || (roles[person.id] || person.role) === person.role} onClick={() => onRole(person, roles[person.id] || person.role)}>Apply role</button><button className={secondaryButtonClass} disabled={!person.id || reason.trim().length < 8} onClick={() => onSuspend(person)}>{person.suspendedAt ? 'Reactivate' : 'Suspend'}</button></div></td>
  </tr>)}</tbody></table></div>;
}

function EventsTable({ records, onChangeStatus, reason }: { records: any[]; onChangeStatus: (event: any) => void; reason: string }) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-[#faf8f5] text-[10px] uppercase tracking-wider text-[#71695d]"><tr><th className="p-3">Event</th><th className="p-3">Organizer</th><th className="p-3">Status</th><th className="p-3">Date / Format</th><th className="p-3">Seats</th><th className="p-3">Action</th></tr></thead><tbody className="divide-y divide-[#eee9df]">{records.map((event) => <tr key={event.id}><td className="p-3"><div className="flex items-center gap-3"><div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-[#f0ede6]"><EventCoverImage src={event.coverImage} alt={event.title} label={event.category?.name || 'Event'} fallbackSrc={event.images?.[0]} categorySlug={event.category?.slug || event.category?.name} sizes="64px" /></div><div><p className="font-semibold text-forest">{event.title}</p><p className="text-xs text-[#71695d]">{event.category?.name} · {event.city || 'Online'}</p></div></div></td><td className="p-3 text-xs">{event.organizer?.name}<br /><span className="text-[#71695d]">{event.organizer?.email}</span></td><td className="p-3"><StatusBadge>{event.status}</StatusBadge></td><td className="p-3 text-xs">{formatDate(event.startDate)}<br />{event.format}</td><td className="p-3 text-xs">{event.bookedSeats} / {event.totalCapacity}<br />{event._count?.bookings || 0} registrations</td><td className="p-3">{['DRAFT', 'PUBLISHED'].includes(event.status) ? <button className={secondaryButtonClass} disabled={reason.trim().length < 8} onClick={() => onChangeStatus(event)}>{event.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}</button> : <span className="text-xs text-[#8c8273]">No status change</span>}</td></tr>)}</tbody></table></div>;
}

function ProposalsTable({ records, reason, onApprove, onReject }: { records: any[]; reason: string; onApprove: (proposal: any) => void; onReject: (proposal: any) => void }) {
  return <div className="divide-y divide-[#eee9df]">{records.map((proposal) => <article key={proposal.id} className="flex flex-col justify-between gap-4 p-5 lg:flex-row lg:items-start"><div className="max-w-3xl"><div className="flex flex-wrap items-center gap-2"><StatusBadge>{proposal.status}</StatusBadge><span className="text-xs text-[#71695d]">{proposal.category} · {proposal.format}</span></div><h2 className="mt-2 font-serif text-xl font-bold text-forest">{proposal.title}</h2><p className="mt-2 text-sm leading-6 text-[#514a40]">{proposal.description}</p><p className="mt-2 text-xs text-[#71695d]">By {proposal.organizer?.name} · {proposal.organizer?.email} · {proposal.estimatedCapacity || 50} seats · {proposal.price ? formatCurrency(proposal.price) : 'Free'}</p></div><div className="flex shrink-0 gap-2"><button className={buttonClass} disabled={reason.trim().length < 8} onClick={() => onApprove(proposal)}>Approve as draft</button><button className={secondaryButtonClass} disabled={reason.trim().length < 8} onClick={() => onReject(proposal)}>Reject</button></div></article>)}</div>;
}

function BookingsTable({ records }: { records: any[] }) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-[#faf8f5] text-[10px] uppercase tracking-wider text-[#71695d]"><tr><th className="p-3">Reference / attendee</th><th className="p-3">Event</th><th className="p-3">Booking</th><th className="p-3">Payment</th><th className="p-3">Tickets</th><th className="p-3">Created</th></tr></thead><tbody className="divide-y divide-[#eee9df]">{records.map((booking) => <tr key={booking.id}><td className="p-3"><p className="font-mono text-xs font-semibold text-forest">{booking.reference}</p><p className="mt-1 text-xs">{booking.user?.name} · {booking.user?.email}</p></td><td className="p-3 text-xs">{booking.event?.title}<br />{booking.seats} seat(s)</td><td className="p-3"><StatusBadge>{booking.status}</StatusBadge><p className="mt-1 text-xs">{formatCurrency(booking.totalAmount, booking.currency)}</p></td><td className="p-3 text-xs">{booking.payment ? <><StatusBadge>{booking.payment.status}</StatusBadge><p className="mt-1">{booking.payment.webhookVerified ? 'Verified' : 'Unverified'}</p><p className="max-w-40 truncate" title={booking.payment.razorpayPaymentId || ''}>{booking.payment.razorpayPaymentId || 'No transaction id'}</p></> : 'No payment record'}</td><td className="p-3 text-xs">{booking.tickets?.length ? booking.tickets.map((ticket: any) => <p key={ticket.code} className="font-mono">{ticket.code} {ticket.isCheckedIn ? '✓' : ''}</p>) : 'No tickets'}</td><td className="p-3 text-xs">{formatDate(booking.createdAt)}</td></tr>)}</tbody></table></div>;
}

function WaitlistsTable({ records, reason, onPromote, onRemove }: { records: any[]; reason: string; onPromote: (eventId: string) => void; onRemove: (id: string) => void }) {
  const waitingByEvent = new Map<string, any>();
  records.filter((entry) => entry.status === 'WAITING').forEach((entry) => waitingByEvent.set(entry.eventId, entry));
  return <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-[#faf8f5] text-[10px] uppercase tracking-wider text-[#71695d]"><tr><th className="p-3">Queue</th><th className="p-3">Attendee</th><th className="p-3">Event</th><th className="p-3">Status / offer</th><th className="p-3">Operations</th></tr></thead><tbody className="divide-y divide-[#eee9df]">{records.map((entry) => <tr key={entry.id}><td className="p-3 font-semibold">#{entry.position}</td><td className="p-3">{entry.user?.name}<br /><span className="text-xs text-[#71695d]">{entry.user?.email}</span></td><td className="p-3">{entry.event?.title}<br /><span className="text-xs text-[#71695d]">{entry.event?.bookedSeats} / {entry.event?.totalCapacity} seats</span></td><td className="p-3"><StatusBadge>{entry.status}</StatusBadge>{entry.offerExpiresAt && <p className="mt-1 text-xs">{formatDate(entry.offerExpiresAt)}</p>}</td><td className="p-3"><div className="flex gap-2">{waitingByEvent.get(entry.eventId)?.id === entry.id && <button className={secondaryButtonClass} disabled={reason.trim().length < 8} onClick={() => onPromote(entry.eventId)}>Offer next seat</button>}{['WAITING', 'OFFERED'].includes(entry.status) && <button className={secondaryButtonClass} disabled={reason.trim().length < 8} onClick={() => onRemove(entry.id)}>Withdraw</button>}</div></td></tr>)}</tbody></table></div>;
}

function ReviewsTable({ records, onModerate, reason }: { records: any[]; onModerate: (review: any, status: string) => void; reason: string }) {
  return <div className="divide-y divide-[#eee9df]">{records.map((review) => <article key={review.id} className="flex flex-col justify-between gap-4 p-4 md:flex-row md:items-start"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><StatusBadge>{review.moderationStatus}</StatusBadge><span className="text-xs text-terracotta">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span></div><p className="mt-2 font-semibold text-forest">{review.event.title}</p><p className="text-xs text-[#71695d]">{review.user.name} · {review.user.email} · {formatDate(review.createdAt)}</p><p className="mt-2 max-w-3xl text-sm leading-6 text-[#514a40]">{review.comment || 'No written comment.'}</p>{review.moderationReason && <p className="mt-2 text-xs text-[#71695d]">Last moderation reason: {review.moderationReason}</p>}</div><div className="flex shrink-0 gap-2">{review.moderationStatus !== 'PUBLISHED' && <button className={secondaryButtonClass} disabled={reason.trim().length < 8} onClick={() => onModerate(review, 'PUBLISHED')}>Restore</button>}{review.moderationStatus !== 'HIDDEN' && <button className={secondaryButtonClass} disabled={reason.trim().length < 8} onClick={() => onModerate(review, 'HIDDEN')}>Hide</button>}{review.moderationStatus !== 'REMOVED' && <button className={secondaryButtonClass} disabled={reason.trim().length < 8} onClick={() => onModerate(review, 'REMOVED')}>Remove</button>}</div></article>)}</div>;
}

function SupportTable({ records, onSelect }: { records: any[]; onSelect: (request: any) => void }) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-[#faf8f5] text-[10px] uppercase tracking-wider text-[#71695d]"><tr><th className="p-3">Case</th><th className="p-3">Requester</th><th className="p-3">Related record</th><th className="p-3">Status</th><th className="p-3">Updated</th><th className="p-3">View</th></tr></thead><tbody className="divide-y divide-[#eee9df]">{records.map((request) => <tr key={request.id}><td className="p-3"><p className="font-mono text-xs">{request.reference}</p><p className="font-semibold text-forest">{request.subject}</p><span className="text-xs text-[#71695d]">{request.category}</span></td><td className="p-3 text-xs">{request.requester?.name}<br />{request.requester?.email}</td><td className="p-3 text-xs">{request.booking?.reference || request.event?.title || 'Account / general'}</td><td className="p-3"><StatusBadge>{request.status}</StatusBadge></td><td className="p-3 text-xs">{formatDate(request.updatedAt)}</td><td className="p-3"><button className={secondaryButtonClass} onClick={() => onSelect(request)}>Open case</button></td></tr>)}</tbody></table></div>;
}

function AuditTable({ records }: { records: any[] }) {
  return <div className="divide-y divide-[#eee9df]">{records.map((entry) => <details key={entry.id} className="p-4"><summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3"><span><strong className="text-forest">{entry.action.replace(/_/g, ' ')}</strong><span className="ml-2 text-xs text-[#71695d]">{entry.entityType} · {entry.actor?.name || 'Former administrator'}</span></span><time className="text-xs text-[#71695d]">{formatDate(entry.createdAt)}</time></summary><div className="mt-3 grid gap-3 text-xs md:grid-cols-3"><p><strong>Entity:</strong> {entry.entityId}</p><p><strong>Reason:</strong> {entry.reason}</p><pre className="overflow-x-auto rounded-lg bg-[#faf8f5] p-3">{JSON.stringify({ before: entry.beforeData, after: entry.afterData }, null, 2)}</pre></div></details>)}</div>;
}

function SystemStatusCard({ label, value }: { label: string; value: string }) {
  const okay = ['available', 'configured'].includes(value);
  const neutral = ['preview_mode', 'not_available'].includes(value);
  return <div className="flex items-center justify-between rounded-xl bg-[#faf8f5] p-4"><span className="text-sm font-semibold text-forest">{label}</span><StatusBadge>{okay ? 'AVAILABLE' : neutral ? value.toUpperCase() : value.toUpperCase()}</StatusBadge></div>;
}

function UserDetailDialog({ user, onClose }: { user: any; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section role="dialog" aria-modal="true" aria-labelledby="admin-user-detail-title" onKeyDown={(event) => { if (event.key === 'Escape') onClose(); }} className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-[#faf8f5] p-5 shadow-2xl"><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><Avatar src={user.avatar} name={user.name} className="h-14 w-14 rounded-full" /><div><h2 id="admin-user-detail-title" className="font-serif text-2xl font-bold text-forest">{user.name}</h2><p className="text-sm text-[#71695d]">{user.email} · {user.role}</p></div></div><button onClick={onClose} className={secondaryButtonClass} aria-label="Close user details"><X className="h-4 w-4" /></button></div><div className="mt-5 grid gap-4 md:grid-cols-2"><div className={`${cardClass} p-4`}><h3 className="font-semibold text-forest">Profile</h3><p className="mt-2 text-sm">{user.bio || 'No bio provided.'}</p><p className="mt-2 text-xs text-[#71695d]">Phone: {user.phone || 'Not provided'}</p><p className="text-xs text-[#71695d]">Interests: {user.interests?.join(', ') || 'None listed'}</p><p className="text-xs text-[#71695d]">Email verified: {user.isVerified ? 'Yes' : 'No'}</p></div><div className={`${cardClass} p-4`}><h3 className="font-semibold text-forest">Account</h3><p className="mt-2 text-sm">Created {formatDate(user.createdAt)}</p><p className="text-sm">Status: {user.suspendedAt ? 'Suspended' : 'Active'}</p>{user.suspensionReason && <p className="mt-2 text-xs text-[#71695d]">Reason: {user.suspensionReason}</p>}</div></div>{user.role === 'ORGANIZER' && <section className={`${cardClass} mt-4 p-4`}><h3 className="font-semibold text-forest">Organizer events</h3><ul className="mt-2 space-y-2">{user.organizedEvents.map((event: any) => <li key={event.id} className="flex justify-between gap-3 text-sm"><span>{event.title}</span><span className="text-xs">{event._count.bookings}/{event.totalCapacity} · {event.status}</span></li>)}</ul></section>}<section className={`${cardClass} mt-4 p-4`}><h3 className="font-semibold text-forest">Recent bookings</h3>{user.bookings.length ? <ul className="mt-2 divide-y divide-[#eee9df]">{user.bookings.map((booking: any) => <li key={booking.id} className="flex flex-wrap justify-between gap-2 py-2 text-sm"><div>{booking.event.title}<p className="font-mono text-xs text-[#71695d]">{booking.reference}</p></div><span className="text-xs">{booking.status} · {booking.seats} seat(s) · {booking.payment?.status || 'no payment'}</span></li>)}</ul> : <p className="mt-2 text-sm text-[#71695d]">No bookings found.</p>}</section></section></div>;
}

function SupportDialog({ request, status, note, reason, onStatus, onNote, onClose, onSave }: { request: any; status: string; note: string; reason: string; onStatus: (value: string) => void; onNote: (value: string) => void; onClose: () => void; onSave: () => void }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section role="dialog" aria-modal="true" aria-labelledby="support-case-title" onKeyDown={(event) => { if (event.key === 'Escape') onClose(); }} className="max-h-[90vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-2xl bg-[#faf8f5] p-5 shadow-2xl"><header className="flex justify-between gap-3"><div><p className="font-mono text-xs text-[#71695d]">{request.reference}</p><h2 id="support-case-title" className="font-serif text-2xl font-bold text-forest">{request.subject}</h2><p className="text-xs text-[#71695d]">{request.requester.name} · {request.requester.email}</p></div><button onClick={onClose} className={secondaryButtonClass} aria-label="Close support case"><X className="h-4 w-4" /></button></header><div className={`${cardClass} p-4`}><p className="whitespace-pre-wrap text-sm leading-6">{request.description}</p><p className="mt-3 text-xs text-[#71695d]">Related: {request.booking?.reference || request.event?.title || 'No linked record'}</p></div><label className="block text-xs font-semibold text-[#71695d]">Case status<select className={`${inputClass} mt-1`} value={status} onChange={(event) => onStatus(event.target.value)}><option value="NEW">New</option><option value="IN_PROGRESS">In progress</option><option value="WAITING_ON_USER">Waiting on user</option><option value="RESOLVED">Resolved</option><option value="CLOSED">Closed</option></select></label><label className="block text-xs font-semibold text-[#71695d]">Internal note (visible to admins only)<textarea className={`${inputClass} mt-1 min-h-24 py-3`} value={note} onChange={(event) => onNote(event.target.value)} /></label><p className="text-xs text-[#71695d]">Admin action reason: {reason || 'Enter a reason in the page controls before saving.'}</p><div className="flex justify-end gap-2"><button className={secondaryButtonClass} onClick={onClose}>Cancel</button><button className={buttonClass} disabled={reason.trim().length < 8} onClick={onSave}>Save case</button></div><details className={`${cardClass} p-4`}><summary className="cursor-pointer text-sm font-semibold text-forest">Internal notes ({request.notes?.length || 0})</summary><ul className="mt-3 space-y-2">{request.notes?.map((item: any) => <li key={item.id} className="border-t border-[#eee9df] pt-2 text-xs"><p>{item.body}</p><p className="mt-1 text-[#71695d]">{item.author?.name || 'Former admin'} · {formatDate(item.createdAt)}</p></li>)}</ul></details></section></div>;
}
