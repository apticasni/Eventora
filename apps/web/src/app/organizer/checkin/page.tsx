'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Avatar } from '@/components/ui/Avatar';
import {
  QrCode,
  Search,
  CheckCircle2,
  XCircle,
  Camera,
  AlertCircle,
  Clock,
  UserCheck
} from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function CheckInScannerPage() {
  const { user } = useAuth();
  const [manualCode, setManualCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    status: 'success' | 'already' | 'error';
    message: string;
    ticket?: any;
  } | null>(null);

  const [recentCheckIns, setRecentCheckIns] = useState<Array<{
    code: string;
    attendee: string;
    avatar?: string | null;
    time: string;
    method: string;
  }>>([
    { code: 'TKT-RN-8841', attendee: 'Aisha Khan', time: 'Just now', method: 'QR Camera' },
    { code: 'TKT-JS-001', attendee: 'Vikram Singh', time: '10 mins ago', method: 'Manual' },
  ]);

  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  const handleVerifyCode = useCallback(async (code: string, method: string = 'Manual') => {
    if (!code) return;
    setLoading(true);
    setResult(null);

    let cleanedCode = code.trim();
    try {
      const parsed = JSON.parse(code);
      if (parsed.ticketCode) cleanedCode = parsed.ticketCode;
    } catch {
      // plain text code
    }

    try {
      const res = await api.tickets.checkin(cleanedCode, method);
      if (res.success && res.data) {
        const ticket = res.data.ticket;
        setResult({
          status: 'success',
          message: 'Entry Verified! Attendee is cleared for admission.',
          ticket,
        });
        setRecentCheckIns((recent) => [
          {
            code: cleanedCode,
            attendee: (ticket as any)?.booking?.user?.name || 'Verified Attendee',
            avatar: (ticket as any)?.booking?.user?.avatar,
            time: 'Just now',
            method,
          },
          ...recent,
        ]);
      } else {
        const already = (res.message || '').toLowerCase().includes('already');
        setResult({
          status: already ? 'already' : 'error',
          message: res.message || 'Check-in failed for this ticket.',
        });
      }
    } catch {
      setResult({
        status: 'error',
        message: 'Invalid ticket code. No confirmed reservation matches this code.',
      });
    } finally {
      setLoading(false);
      setManualCode('');
    }
  }, []);

  useEffect(() => {
    // Initialize html5-qrcode camera scanner
    try {
      const scanner = new Html5QrcodeScanner(
        'qr-reader-container',
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );

      scanner.render(
        (decodedText) => {
          handleVerifyCode(decodedText, 'QR');
        },
        (error) => {
          // scanning frame errors can be ignored
        }
      );

      scannerRef.current = scanner;
    } catch (e) {
      console.warn('QR camera not available in current environment:', e);
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
      }
    };
  }, [handleVerifyCode]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="border-b border-[#e5dfd3] pb-6">
        <span className="text-xs font-bold uppercase tracking-widest text-terracotta">
          Venue Staff Terminal
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-forest">
          QR Check-in & Admission Control
        </h1>
        <p className="text-xs sm:text-sm text-[#71695d]">
          Scan attendee ticket QR codes via device camera or look up alphanumeric pass codes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Camera Scanner & Manual Input */}
        <div className="lg:col-span-7 space-y-6">
          {/* Camera Scanner View */}
          <div className="bg-white rounded-3xl border border-[#ded7ca] p-6 shadow-warm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold text-forest flex items-center gap-2">
                <Camera className="w-5 h-5 text-terracotta" />
                <span>Live Camera Scanner</span>
              </h3>
              <span className="text-[11px] text-[#8c8273]">Autodetects QR Codes</span>
            </div>

            <div
              id="qr-reader-container"
              className="overflow-hidden rounded-2xl border border-[#ded7ca] bg-[#faf8f5] min-h-[260px] flex items-center justify-center"
            />
          </div>

          {/* Manual Code Entry */}
          <div className="bg-white rounded-3xl border border-[#ded7ca] p-6 shadow-warm space-y-4">
            <h3 className="font-serif text-lg font-bold text-forest flex items-center gap-2">
              <Search className="w-5 h-5 text-forest" />
              <span>Manual Ticket Code Lookup</span>
            </h3>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleVerifyCode(manualCode, 'Manual');
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                placeholder="Enter ticket code (e.g. TKT-RN-8841)..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-[#ded7ca] bg-[#faf8f5] focus:bg-white text-xs font-mono font-bold uppercase"
              />
              <button
                type="submit"
                disabled={loading || !manualCode.trim()}
                className="px-6 py-2.5 rounded-xl bg-forest hover:bg-forest-light text-white text-xs font-bold transition-all shadow-sm"
              >
                {loading ? 'Checking...' : 'Verify Entry'}
              </button>
            </form>
          </div>

          {/* Verification Result Banner */}
          {result && (
            <div
              className={`p-6 rounded-3xl border animate-in zoom-in-95 duration-150 flex items-start gap-4 ${
                result.status === 'success'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                  : result.status === 'already'
                  ? 'bg-amber-50 border-amber-300 text-amber-950'
                  : 'bg-red-50 border-red-300 text-red-950'
              }`}
            >
              {result.status === 'success' && (
                <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
              )}
              {result.status === 'already' && (
                <AlertCircle className="w-8 h-8 text-amber-600 shrink-0" />
              )}
              {result.status === 'error' && (
                <XCircle className="w-8 h-8 text-red-600 shrink-0" />
              )}

              <div className="space-y-1">
                <h4 className="font-serif text-lg font-bold">
                  {result.status === 'success'
                    ? 'ADMISSION APPROVED'
                    : result.status === 'already'
                    ? 'DUPLICATE TICKET WARNING'
                    : 'INVALID TICKET'}
                </h4>
                <p className="text-xs leading-relaxed">{result.message}</p>
                <p className="text-[10px] text-[#71695d] pt-1">
                  Verified by staff: {user?.name || 'Staff Member'} at {new Date().toLocaleTimeString()}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Live Check-in Audit Feed */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-[#ded7ca] p-6 shadow-warm space-y-6">
          <div className="flex items-center justify-between border-b border-[#f0ede6] pb-4">
            <h3 className="font-serif text-lg font-bold text-forest flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-forest" />
              <span>Recent Check-ins</span>
            </h3>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
              Live Feed
            </span>
          </div>

          <div className="space-y-3">
            {recentCheckIns.map((ci, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-[#faf8f5] border border-[#ebe4d8] flex items-center justify-between text-xs"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <Avatar
                    src={ci.avatar}
                    name={ci.attendee}
                    className="h-8 w-8 rounded-full border border-[#ded7ca]"
                  />
                  <div className="min-w-0">
                    <p className="truncate font-bold text-forest">{ci.attendee}</p>
                    <p className="truncate font-mono text-[11px] text-[#8c8273]">{ci.code}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 rounded bg-[#f0ede6] text-[10px] font-semibold text-[#5c5446]">
                    {ci.method}
                  </span>
                  <p className="text-[10px] text-[#8c8273] mt-1">{ci.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
