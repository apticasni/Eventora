'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
import {
  Sparkles,
  Calendar,
  Users,
  DollarSign,
  PlusCircle,
  QrCode,
  ArrowRight,
  TrendingUp,
  Award
} from 'lucide-react';

export default function OrganizerDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalEvents: 4,
    totalBookings: 182,
    totalRevenue: 489000,
    totalAttendance: 145,
  });
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [dashRes, evRes] = await Promise.all([
          api.organizer.dashboard(),
          api.organizer.events(),
        ]);
        if (dashRes.success && dashRes.data) {
          setStats(dashRes.data);
        }
        if (evRes.success && evRes.data) {
          setEvents(evRes.data);
        }
      } catch {
        // Fallback
      }
    }
    loadData();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e5dfd3] pb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-terracotta">
            Instructor & Facilitator Portal
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-forest">
            Organizer Studio
          </h1>
          <p className="text-xs sm:text-sm text-[#71695d]">
            Manage workshop cohorts, review registrations, track attendance analytics, and run QR check-ins.
          </p>
          {user && (
            <div className="mt-4 flex items-center gap-2.5">
              <Avatar
                src={user.avatar}
                name={user.name}
                className="h-9 w-9 rounded-full border border-[#ded7ca]"
              />
              <span className="text-xs font-semibold text-forest">{user.name}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/organizer/checkin"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-forest text-forest hover:bg-forest/5 text-xs font-bold transition-colors"
          >
            <QrCode className="w-4 h-4 text-terracotta" />
            <span>Open QR Scanner</span>
          </Link>

          <Link
            href="/organizer/events/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-forest hover:bg-forest-light text-white text-xs font-bold shadow-sm transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create New Workshop</span>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-[#ded7ca] shadow-warm space-y-2">
          <div className="flex items-center justify-between text-xs text-[#8c8273] font-semibold">
            <span>Hosted Workshops</span>
            <Calendar className="w-4 h-4 text-forest" />
          </div>
          <div className="font-serif text-3xl font-bold text-forest">{stats.totalEvents}</div>
          <span className="text-[11px] text-emerald-700 font-medium">Active & scheduled</span>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-[#ded7ca] shadow-warm space-y-2">
          <div className="flex items-center justify-between text-xs text-[#8c8273] font-semibold">
            <span>Total Attendees</span>
            <Users className="w-4 h-4 text-forest" />
          </div>
          <div className="font-serif text-3xl font-bold text-forest">{stats.totalBookings}</div>
          <span className="text-[11px] text-emerald-700 font-medium">+24 registered this week</span>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-[#ded7ca] shadow-warm space-y-2">
          <div className="flex items-center justify-between text-xs text-[#8c8273] font-semibold">
            <span>Gross Revenue</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="font-serif text-3xl font-bold text-forest">
            {formatCurrency(stats.totalRevenue)}
          </div>
          <span className="text-[11px] text-emerald-700 font-medium">Processed via Razorpay</span>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-[#ded7ca] shadow-warm space-y-2">
          <div className="flex items-center justify-between text-xs text-[#8c8273] font-semibold">
            <span>Verified Check-ins</span>
            <QrCode className="w-4 h-4 text-terracotta" />
          </div>
          <div className="font-serif text-3xl font-bold text-forest">{stats.totalAttendance}</div>
          <span className="text-[11px] text-[#71695d]">Scanned at venue doors</span>
        </div>
      </div>

      {/* Workshop Roster & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 bg-white rounded-3xl border border-[#ded7ca] p-6 sm:p-8 shadow-warm space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-2xl font-bold text-forest">Managed Experiences</h3>
            <Link href="/organizer/events" className="text-xs font-semibold text-terracotta hover:underline">
              View All
            </Link>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-[#faf8f5] border border-[#ebe4d8] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                  Published
                </span>
                <h4 className="font-serif text-lg font-bold text-forest mt-1">
                  React & Next.js 14 Masterclass 2024
                </h4>
                <p className="text-xs text-[#71695d]">45 / 60 Seats Booked (75% Occupancy)</p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/organizer/checkin"
                  className="px-3 py-1.5 rounded-lg border border-[#ded7ca] bg-white text-xs font-semibold text-forest hover:bg-[#f0ede6]"
                >
                  Scan QR Pass
                </Link>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#faf8f5] border border-[#ebe4d8] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800">
                  Sold Out
                </span>
                <h4 className="font-serif text-lg font-bold text-forest mt-1">
                  Morning Yoga & Breathwork Retreat
                </h4>
                <p className="text-xs text-[#71695d]">25 / 25 Seats Booked • 6 on Waitlist</p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/organizer/checkin"
                  className="px-3 py-1.5 rounded-lg border border-[#ded7ca] bg-white text-xs font-semibold text-forest hover:bg-[#f0ede6]"
                >
                  Scan QR Pass
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Proposals & Workshop Submissions */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-[#ded7ca] p-6 sm:p-8 shadow-warm space-y-5">
          <h3 className="font-serif text-xl font-bold text-forest">Proposals & Approvals</h3>
          <p className="text-xs text-[#5c5446] leading-relaxed">
            Have a new masterclass concept? Submit an editorial proposal for platform review and cohort scheduling.
          </p>

          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
            <p className="font-bold">Fast Review SLA</p>
            <p>Our editorial team reviews and approves workshop proposals within 24 business hours.</p>
          </div>

          <Link
            href="/organizer/proposals/new"
            className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-xl bg-terracotta hover:bg-terracotta-dark text-white font-bold text-xs shadow-sm transition-all"
          >
            <span>Submit New Proposal</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
