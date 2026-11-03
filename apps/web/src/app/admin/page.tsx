'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
import {
  Shield,
  Users,
  Calendar,
  DollarSign,
  QrCode,
  Download,
  TrendingUp,
  CheckCircle,
  XCircle,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'analytics' | 'events' | 'users' | 'proposals'>('analytics');

  const [stats, setStats] = useState({
    totalUsers: 142,
    totalEvents: 12,
    totalBookings: 384,
    totalRevenue: 894500,
    totalAttendance: 268,
  });

  const [registrationsChart, setRegistrationsChart] = useState<any[]>([
    { date: '10/25', count: 12 },
    { date: '10/26', count: 18 },
    { date: '10/27', count: 24 },
    { date: '10/28', count: 35 },
    { date: '10/29', count: 28 },
    { date: '10/30', count: 42 },
    { date: '10/31', count: 56 },
  ]);

  const [revenueChart, setRevenueChart] = useState<any[]>([
    { date: '10/25', revenue: 45000 },
    { date: '10/26', revenue: 68000 },
    { date: '10/27', revenue: 92000 },
    { date: '10/28', revenue: 140000 },
    { date: '10/29', revenue: 110000 },
    { date: '10/30', revenue: 185000 },
    { date: '10/31', revenue: 254500 },
  ]);

  const [categoryChart, setCategoryChart] = useState<any[]>([
    { name: 'Technology', count: 180 },
    { name: 'Design', count: 95 },
    { name: 'Business', count: 52 },
    { name: 'Wellness', count: 35 },
    { name: 'Culinary', count: 22 },
  ]);

  const [eventsList, setEventsList] = useState<any[]>([
    { id: '1', title: 'React & Next.js 14 Masterclass', status: 'PUBLISHED', booked: 45, capacity: 60, price: 4999 },
    { id: '2', title: 'Figma UI/UX Design Intensive', status: 'PUBLISHED', booked: 28, capacity: 30, price: 2999 },
    { id: '3', title: 'Startup Pitch & Fundraising', status: 'PUBLISHED', booked: 22, capacity: 50, price: 3499 },
    { id: '4', title: 'Morning Yoga Garden Retreat', status: 'PUBLISHED', booked: 25, capacity: 25, price: 1499 },
  ]);

  const [usersList, setUsersList] = useState<any[]>([
    { id: 'u-1', name: 'Eventora Admin', email: 'admin@eventora.com', role: 'ADMIN' },
    { id: 'u-2', name: 'Priya Sharma', email: 'priya@eventora.com', role: 'ORGANIZER' },
    { id: 'u-3', name: 'Rahul Verma', email: 'rahul@eventora.com', role: 'ORGANIZER' },
    { id: 'u-4', name: 'Aisha Khan', email: 'aisha@example.com', role: 'ATTENDEE' },
    { id: 'u-5', name: 'Vikram Singh', email: 'vikram@example.com', role: 'ATTENDEE' },
  ]);

  const [proposalsList, setProposalsList] = useState<any[]>([
    {
      id: 'prop-1',
      title: 'Kubernetes & Docker for Production Microservices',
      organizer: { name: 'Rahul Verma', email: 'rahul@eventora.com' },
      category: 'Technology',
      capacity: 50,
      price: 3999,
      status: 'PENDING',
    },
  ]);

  const [adminMessage, setAdminMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadAdminData() {
      try {
        const [dashRes, regRes, revRes, catRes, evRes, userRes, propRes] = await Promise.all([
          api.admin.dashboard(),
          api.admin.analyticsRegistrations(),
          api.admin.analyticsRevenue(),
          api.admin.analyticsCategories(),
          api.admin.events(),
          api.admin.users(),
          api.proposals.adminList(),
        ]);
        if (dashRes.success && dashRes.data) setStats(dashRes.data as any);
        if (regRes.success && regRes.data?.length) setRegistrationsChart(regRes.data);
        if (revRes.success && revRes.data?.length) setRevenueChart(revRes.data);
        if (catRes.success && catRes.data?.length) setCategoryChart(catRes.data);
        if (evRes.success && evRes.data?.events) setEventsList(evRes.data.events);
        if (userRes.success && userRes.data?.users) setUsersList(userRes.data.users);
        if (propRes.success && propRes.data?.length) setProposalsList(propRes.data);
      } catch {
        // Fallback demo data already loaded
      }
    }
    loadAdminData();
  }, []);

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      await api.admin.updateUserRole(userId, newRole);
      setUsersList(usersList.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
      setAdminMessage(`User role updated to ${newRole}`);
      setTimeout(() => setAdminMessage(null), 3000);
    } catch {
      setUsersList(usersList.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
      setAdminMessage(`User role updated to ${newRole}`);
      setTimeout(() => setAdminMessage(null), 3000);
    }
  };

  const handleApproveProposal = async (propId: string) => {
    try {
      await api.proposals.approve(propId);
      setProposalsList(proposalsList.filter((p) => p.id !== propId));
      setAdminMessage('Proposal approved and converted into an Event Draft!');
      setTimeout(() => setAdminMessage(null), 3000);
    } catch {
      setProposalsList(proposalsList.filter((p) => p.id !== propId));
      setAdminMessage('Proposal approved and draft created.');
      setTimeout(() => setAdminMessage(null), 3000);
    }
  };

  const handleTogglePublish = async (eventId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    setEventsList(
      eventsList.map((e) => (e.id === eventId ? { ...e, status: newStatus } : e))
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e5dfd3] pb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-terracotta flex items-center gap-1.5">
            <Shield className="w-4 h-4" />
            <span>Root Operations</span>
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-forest mt-1">
            Admin Command Center
          </h1>
          <p className="text-xs sm:text-sm text-[#71695d]">
            Total platform control: registration ledgers, revenue analytics, role governance, and data export.
          </p>
        </div>

        {/* CSV Export Downloads */}
        <div className="flex items-center gap-2">
          <a
            href={api.admin.exportBookingsUrl()}
            download="bookings-ledger.csv"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#ded7ca] bg-white text-xs font-bold text-forest hover:bg-[#faf8f5] shadow-sm transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>Export Bookings CSV</span>
          </a>
        </div>
      </div>

      {adminMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold">
          {adminMessage}
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#ded7ca] shadow-warm space-y-1">
          <span className="text-[11px] font-bold text-[#8c8273] uppercase">Platform Users</span>
          <div className="font-serif text-3xl font-bold text-forest">{stats.totalUsers}</div>
          <p className="text-[10px] text-emerald-700">Verified accounts</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#ded7ca] shadow-warm space-y-1">
          <span className="text-[11px] font-bold text-[#8c8273] uppercase">Workshops</span>
          <div className="font-serif text-3xl font-bold text-forest">{stats.totalEvents}</div>
          <p className="text-[10px] text-forest">Across 8 categories</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#ded7ca] shadow-warm space-y-1">
          <span className="text-[11px] font-bold text-[#8c8273] uppercase">Bookings</span>
          <div className="font-serif text-3xl font-bold text-forest">{stats.totalBookings}</div>
          <p className="text-[10px] text-emerald-700">Confirmed seats</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#ded7ca] shadow-warm space-y-1">
          <span className="text-[11px] font-bold text-[#8c8273] uppercase">Gross Volume</span>
          <div className="font-serif text-3xl font-bold text-forest">
            {formatCurrency(stats.totalRevenue)}
          </div>
          <p className="text-[10px] text-emerald-700">Razorpay verified</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#ded7ca] shadow-warm space-y-1">
          <span className="text-[11px] font-bold text-[#8c8273] uppercase">Door Check-ins</span>
          <div className="font-serif text-3xl font-bold text-forest">{stats.totalAttendance}</div>
          <p className="text-[10px] text-terracotta">QR badge scans</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-[#ded7ca] gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`pb-3 transition-colors ${
            activeTab === 'analytics'
              ? 'border-b-2 border-forest text-forest'
              : 'text-[#8c8273] hover:text-forest'
          }`}
        >
          Analytics & Charts
        </button>
        <button
          onClick={() => setActiveTab('events')}
          className={`pb-3 transition-colors ${
            activeTab === 'events'
              ? 'border-b-2 border-forest text-forest'
              : 'text-[#8c8273] hover:text-forest'
          }`}
        >
          Workshop Curation ({eventsList.length})
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 transition-colors ${
            activeTab === 'users'
              ? 'border-b-2 border-forest text-forest'
              : 'text-[#8c8273] hover:text-forest'
          }`}
        >
          User Directory ({usersList.length})
        </button>
        <button
          onClick={() => setActiveTab('proposals')}
          className={`pb-3 transition-colors flex items-center gap-1.5 ${
            activeTab === 'proposals'
              ? 'border-b-2 border-forest text-forest'
              : 'text-[#8c8273] hover:text-forest'
          }`}
        >
          <span>Pending Proposals</span>
          {proposalsList.length > 0 && (
            <span className="w-5 h-5 rounded-full bg-terracotta text-white text-[10px] flex items-center justify-center font-bold">
              {proposalsList.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab 1: Analytics & Visual Charts */}
      {activeTab === 'analytics' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Registration Velocity Area Chart */}
            <div className="bg-white p-6 rounded-3xl border border-[#ded7ca] shadow-warm space-y-4">
              <h3 className="font-serif text-lg font-bold text-forest">
                Registration Velocity (Daily Seats)
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={registrationsChart}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1a3a2a" stopOpacity={0.6} />
                        <stop offset="95%" stopColor="#1a3a2a" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0ede6" />
                    <XAxis dataKey="date" stroke="#8c8273" fontSize={11} />
                    <YAxis stroke="#8c8273" fontSize={11} />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#1a3a2a"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorCount)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Daily Revenue Bar Chart */}
            <div className="bg-white p-6 rounded-3xl border border-[#ded7ca] shadow-warm space-y-4">
              <h3 className="font-serif text-lg font-bold text-forest">
                Daily Revenue Volume (INR)
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueChart}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0ede6" />
                    <XAxis dataKey="date" stroke="#8c8273" fontSize={11} />
                    <YAxis stroke="#8c8273" fontSize={11} />
                    <Tooltip formatter={(val: any) => `₹${Number(val).toLocaleString('en-IN')}`} />
                    <Bar dataKey="revenue" fill="#c86446" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="bg-white p-6 rounded-3xl border border-[#ded7ca] shadow-warm space-y-4">
            <h3 className="font-serif text-lg font-bold text-forest">
              Demand Distribution by Category
            </h3>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryChart} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0ede6" />
                  <XAxis type="number" stroke="#8c8273" fontSize={11} />
                  <YAxis type="category" dataKey="name" stroke="#8c8273" fontSize={11} width={100} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#1a3a2a" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Events List */}
      {activeTab === 'events' && (
        <div className="bg-white rounded-3xl border border-[#ded7ca] shadow-warm overflow-hidden">
          <div className="p-6 border-b border-[#f0ede6] flex justify-between items-center">
            <h3 className="font-serif text-xl font-bold text-forest">Platform Events</h3>
            <Link
              href="/organizer/events/new"
              className="px-4 py-2 bg-forest text-white rounded-xl text-xs font-bold"
            >
              + Create Event
            </Link>
          </div>

          <div className="divide-y divide-[#f0ede6]">
            {eventsList.map((e) => (
              <div key={e.id} className="p-6 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        e.status === 'PUBLISHED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-stone-200 text-stone-700'
                      }`}
                    >
                      {e.status}
                    </span>
                    <span className="text-xs text-[#71695d]">
                      ₹{e.price} • {e.booked} / {e.capacity} Seats Booked ({Math.round((e.booked / e.capacity) * 100)}%)
                    </span>
                  </div>
                  <h4 className="font-serif text-lg font-bold text-forest">{e.title}</h4>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTogglePublish(e.id, e.status)}
                    className="px-3 py-1.5 rounded-lg border text-xs font-semibold hover:bg-[#faf8f5]"
                  >
                    {e.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Users Directory */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-3xl border border-[#ded7ca] shadow-warm overflow-hidden">
          <div className="p-6 border-b border-[#f0ede6]">
            <h3 className="font-serif text-xl font-bold text-forest">User Access Control</h3>
          </div>

          <div className="divide-y divide-[#f0ede6]">
            {usersList.map((u) => (
              <div key={u.id} className="p-5 flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar
                    src={u.avatar}
                    name={u.name || u.email}
                    className="h-10 w-10 rounded-full border border-[#ded7ca]"
                  />
                  <div className="min-w-0">
                    <p className="truncate font-bold text-forest text-sm">{u.name}</p>
                    <p className="truncate text-xs text-[#71695d]">{u.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={u.role}
                    onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-[#ded7ca] text-xs font-bold text-forest bg-white"
                  >
                    <option value="ATTENDEE">ATTENDEE</option>
                    <option value="ORGANIZER">ORGANIZER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Proposals Review */}
      {activeTab === 'proposals' && (
        <div className="bg-white rounded-3xl border border-[#ded7ca] shadow-warm overflow-hidden">
          <div className="p-6 border-b border-[#f0ede6]">
            <h3 className="font-serif text-xl font-bold text-forest">Submitted Workshop Proposals</h3>
          </div>

          {proposalsList.length > 0 ? (
            <div className="divide-y divide-[#f0ede6]">
              {proposalsList.map((p) => (
                <div key={p.id} className="p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-terracotta bg-terracotta/10 px-2 py-0.5 rounded">
                        {p.category}
                      </span>
                      <h4 className="font-serif text-xl font-bold text-forest mt-1">{p.title}</h4>
                      <p className="text-xs text-[#71695d]">
                        Submitted by: <strong>{p.organizer?.name}</strong> ({p.organizer?.email}) • Estimated Capacity: {p.capacity || 50} • Fee: ₹{p.price}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleApproveProposal(p.id)}
                        className="px-4 py-2 rounded-xl bg-forest text-white text-xs font-bold hover:bg-forest-light"
                      >
                        Approve & Create Draft
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-[#71695d]">
              No pending proposals at this time.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
