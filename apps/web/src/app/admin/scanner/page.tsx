'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { CheckInScanner } from '@/components/checkin/CheckInScanner';

export default function AdminScannerPage() {
  return (
    <>
      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 lg:px-8">
        <Link href="/admin" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#ded7ca] bg-white px-3 text-sm font-semibold text-forest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest">
          <ArrowLeft className="h-4 w-4" />Admin dashboard
        </Link>
      </div>
      <CheckInScanner mode="admin" />
    </>
  );
}
