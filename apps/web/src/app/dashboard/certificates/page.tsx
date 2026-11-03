'use client';

import React, { useEffect, useState } from 'react';
import { Award, Printer } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';

export default function CertificatesPage() {
  const { user } = useAuth();
  const [selectedCert, setSelectedCert] = useState<any | null>(null);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await api.certificates.list();
      if (res.success && res.data) {
        setCertificates(res.data.map((cert: any) => ({
          id: cert.id,
          code: cert.code,
          eventTitle: cert.event?.title || 'Workshop',
          instructorName: cert.event?.instructorName || 'Eventora Faculty',
          issuedAt: cert.issuedAt ? new Date(cert.issuedAt).toLocaleDateString() : '',
        })));
      }
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <span className="text-xs font-bold uppercase tracking-widest text-terracotta">
          Credentials
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-forest">
          Verified Certificates of Attendance
        </h1>
        <p className="text-xs sm:text-sm text-[#71695d]">
          Proof of participation and practical mastery issued following verified attendance.
        </p>
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-[#71695d]">Loading certificates...</div>
      ) : certificates.length === 0 ? (
        <div className="bg-white rounded-3xl border border-[#ded7ca] p-12 text-center space-y-2">
          <Award className="w-10 h-10 text-[#8c8273] mx-auto" />
          <h3 className="font-serif text-2xl font-bold text-forest">No certificates yet</h3>
          <p className="text-xs text-[#71695d]">Certificates become available after a completed event you attended.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {certificates.map((cert) => (
            <div
              key={cert.id}
              className="bg-white p-6 sm:p-8 rounded-3xl border border-[#ded7ca] shadow-warm flex flex-col justify-between space-y-6"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                    Verified Credential
                  </span>
                  <span className="text-xs font-mono text-[#8c8273]">{cert.code}</span>
                </div>

                <h3 className="font-serif text-2xl font-bold text-forest">
                  {cert.eventTitle}
                </h3>

                <p className="text-xs text-[#5c5446]">
                  Conducted by <strong>{cert.instructorName}</strong> • Completed on {cert.issuedAt}
                </p>
              </div>

              <button
                onClick={() => setSelectedCert(cert)}
                className="w-full py-2.5 rounded-xl border border-forest text-forest hover:bg-forest/5 text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                <Award className="w-4 h-4 text-terracotta" />
                <span>View & Print Certificate</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {selectedCert && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#faf8f5] rounded-3xl border border-[#ded7ca] p-8 sm:p-12 max-w-2xl w-full shadow-warm-lg space-y-6 text-center animate-in zoom-in-95">
            <div className="border-4 border-double border-[#d4cbba] p-8 sm:p-10 bg-white rounded-2xl space-y-6 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-forest text-white flex items-center justify-center mx-auto font-serif text-xl font-bold">
                E
              </div>

              <div className="space-y-1">
                <h4 className="font-serif text-3xl font-bold text-forest">
                  Certificate of Completion
                </h4>
                <p className="text-xs text-[#71695d] tracking-widest uppercase">Eventora Masterclass Series</p>
              </div>

              <p className="text-xs text-[#5c5446]">This document certifies that</p>
              <h2 className="font-serif text-3xl font-bold text-terracotta underline decoration-terracotta/30">
                {user?.name || 'Attendee'}
              </h2>
              <p className="text-xs text-[#5c5446] max-w-md mx-auto leading-relaxed">
                has successfully participated in and satisfied all completion requirements for the masterclass:
              </p>

              <h3 className="font-serif text-xl font-bold text-forest">
                {selectedCert.eventTitle}
              </h3>

              <div className="pt-6 border-t border-[#ded7ca] flex justify-between items-end text-xs text-[#71695d]">
                <div>
                  <p className="font-bold text-forest">{selectedCert.instructorName}</p>
                  <p className="text-[10px]">Lead Facilitator</p>
                </div>
                <div>
                  <p className="font-mono text-[10px]">{selectedCert.code}</p>
                  <p className="text-[10px]">Verified on {selectedCert.issuedAt}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-center gap-3">
              <button
                onClick={() => setSelectedCert(null)}
                className="px-5 py-2.5 rounded-xl border text-xs font-semibold"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-6 py-2.5 rounded-xl bg-forest text-white text-xs font-bold flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>Print Certificate</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
