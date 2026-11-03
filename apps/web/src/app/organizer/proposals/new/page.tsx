'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Sparkles, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function NewProposalPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Technology');
  const [format, setFormat] = useState('IN_PERSON');
  const [estimatedCapacity, setEstimatedCapacity] = useState(30);
  const [price, setPrice] = useState(2999);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      router.push('/login?redirect=/organizer/proposals/new');
      return;
    }
    setLoading(true);
    try {
      await api.proposals.create({
        title,
        description,
        category,
        format,
        estimatedCapacity: Number(estimatedCapacity),
        price: Number(price),
      });
      setSubmitted(true);
    } catch {
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <Link
        href="/organizer"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-forest hover:text-terracotta"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Return to Organizer Studio</span>
      </Link>

      <div className="bg-white rounded-3xl border border-[#ded7ca] p-8 sm:p-12 shadow-warm space-y-8">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-terracotta">
            Editorial Submission
          </span>
          <h1 className="font-serif text-3xl font-bold text-forest mt-1">
            Propose a Masterclass
          </h1>
          <p className="text-xs sm:text-sm text-[#71695d]">
            Submit your syllabus and session outline. Approved proposals are converted directly into draft events with automatic ticketing setup.
          </p>
        </div>

        {submitted ? (
          <div className="p-8 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <h3 className="font-serif text-2xl font-bold text-emerald-950">Proposal Received!</h3>
            <p className="text-xs text-emerald-800 max-w-md mx-auto">
              Our curation team is reviewing your curriculum. You will be notified by email once approved or if any questions arise.
            </p>
            <Link
              href="/organizer"
              className="inline-block px-6 py-2.5 bg-forest text-white text-xs font-bold rounded-xl"
            >
              Back to Studio
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-forest mb-1.5">Workshop Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Advanced System Design & Distributed Systems"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[#ded7ca] bg-[#faf8f5] focus:bg-white text-sm font-semibold"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-forest mb-1.5">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#ded7ca] bg-[#faf8f5] text-xs font-semibold"
                >
                  <option value="Technology">Technology</option>
                  <option value="Design">Design</option>
                  <option value="Business">Business</option>
                  <option value="Health & Wellness">Health & Wellness</option>
                  <option value="Photography">Photography</option>
                  <option value="Cooking">Cooking</option>
                  <option value="Music">Music</option>
                  <option value="Leadership">Leadership</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-forest mb-1.5">Format</label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#ded7ca] bg-[#faf8f5] text-xs font-semibold"
                >
                  <option value="IN_PERSON">In-Person Studio</option>
                  <option value="ONLINE">Virtual Masterclass</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-forest mb-1.5">Target Capacity (Seats)</label>
                <input
                  type="number"
                  min={5}
                  max={500}
                  value={estimatedCapacity}
                  onChange={(e) => setEstimatedCapacity(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#ded7ca] bg-[#faf8f5] text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-forest mb-1.5">Proposed Price (INR)</label>
                <input
                  type="number"
                  min={0}
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#ded7ca] bg-[#faf8f5] text-xs font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-forest mb-1.5">Syllabus & Course Outline</label>
              <textarea
                required
                rows={5}
                placeholder="Outline the core topics, hands-on exercises, key takeaways, and requirements for prospective attendees..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-4 rounded-xl border border-[#ded7ca] bg-[#faf8f5] focus:bg-white text-xs leading-relaxed"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl bg-forest hover:bg-forest-light text-white font-bold text-sm shadow-warm transition-all"
            >
              {loading ? 'Submitting Proposal...' : 'Submit Proposal for Editorial Review'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
