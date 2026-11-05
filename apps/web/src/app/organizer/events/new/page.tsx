'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Category } from '@eventora/shared';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Plus, CheckCircle2 } from 'lucide-react';

export default function NewEventPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [format, setFormat] = useState<'IN_PERSON' | 'ONLINE'>('IN_PERSON');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [venueName, setVenueName] = useState('');
  const [city, setCity] = useState('');
  const [price, setPrice] = useState(2499);
  const [totalCapacity, setTotalCapacity] = useState(30);
  const [coverImage, setCoverImage] = useState(
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop'
  );

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadCategories() {
      try {
        const response = await api.events.categories();
        if (!active) return;
        if (!response.success || !response.data) {
          setCategoryError(response.message || 'Unable to load event categories.');
          return;
        }
        setCategories(response.data);
        setCategory(response.data[0]?.id || '');
      } catch {
        if (active) setCategoryError('Unable to load event categories. Please try again.');
      } finally {
        if (active) setCategoriesLoading(false);
      }
    }

    void loadCategories();
    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!category) {
      setError('An event category is required before publishing.');
      return;
    }
    setLoading(true);

    try {
      const response = await api.events.create({
        title,
        description,
        shortDescription,
        categoryId: category,
        format,
        startDate: startDate ? new Date(startDate).toISOString() : new Date(Date.now() + 864000000).toISOString(),
        endDate: endDate ? new Date(endDate).toISOString() : new Date(Date.now() + 864000000).toISOString(),
        venueName: format === 'IN_PERSON' ? venueName : undefined,
        city: format === 'IN_PERSON' ? city : undefined,
        price: Number(price),
        totalCapacity: Number(totalCapacity),
        coverImage,
        instructorName: user?.name,
        instructorAvatar: user?.avatar,
      });
      if (!response.success || !response.data) {
        setError(response.message || 'Unable to create the workshop. Please try again.');
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push('/organizer'), 1500);
    } catch {
      setError('Unable to create the workshop. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <Link
        href="/organizer"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-forest hover:text-terracotta"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Organizer Studio</span>
      </Link>

      <div className="bg-white rounded-3xl border border-[#ded7ca] p-8 sm:p-12 shadow-warm space-y-8">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-terracotta">
            Cohort Creation
          </span>
          <h1 className="font-serif text-3xl font-bold text-forest mt-1">
            Create Masterclass or Workshop
          </h1>
          <p className="text-xs sm:text-sm text-[#71695d]">
            Publish your session to the Eventora discovery catalog with live ticket capacity.
          </p>
        </div>

        {success ? (
          <div className="p-8 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <h3 className="font-serif text-2xl font-bold text-emerald-950">Workshop Created!</h3>
            <p className="text-xs text-emerald-800">Redirecting to Organizer Studio...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                {error}
              </p>
            )}
            {categoryError ? (
              <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                {categoryError}
              </p>
            ) : !categoriesLoading && categories.length === 0 ? (
              <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
                No event categories are configured yet, so a workshop cannot be published. You can{' '}
                <Link href="/organizer/proposals/new" className="font-bold underline">
                  submit a workshop proposal
                </Link>{' '}
                for administrator review.
              </div>
            ) : null}
            <div>
              <label className="block text-xs font-bold text-forest mb-1.5">Workshop Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Architectural Design Thinking with Figma"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-[#ded7ca] bg-[#faf8f5] focus:bg-white text-sm font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-forest mb-1.5">Short Editorial Summary</label>
              <input
                type="text"
                placeholder="Brief one-sentence pitch appearing on cards..."
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-[#ded7ca] bg-[#faf8f5] focus:bg-white text-xs font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-forest mb-1.5">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={categoriesLoading || categories.length === 0}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#ded7ca] bg-[#faf8f5] text-xs font-semibold"
                >
                  <option value="">
                    {categoriesLoading ? 'Loading categories…' : 'Select a category'}
                  </option>
                  {categories.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-forest mb-1.5">Delivery Format</label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value as any)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#ded7ca] bg-[#faf8f5] text-xs font-semibold"
                >
                  <option value="IN_PERSON">In-Person Studio</option>
                  <option value="ONLINE">Virtual Live Stream</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-forest mb-1.5">Seat Capacity</label>
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={totalCapacity}
                  onChange={(e) => setTotalCapacity(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#ded7ca] bg-[#faf8f5] text-xs font-semibold"
                />
              </div>
            </div>

            {format === 'IN_PERSON' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-forest mb-1.5">Venue Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Bengaluru Design Hub"
                    value={venueName}
                    onChange={(e) => setVenueName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#ded7ca] bg-[#faf8f5] text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-forest mb-1.5">City</label>
                  <input
                    type="text"
                    placeholder="e.g. Bengaluru"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#ded7ca] bg-[#faf8f5] text-xs font-medium"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-forest mb-1.5">Registration Fee (INR)</label>
                <input
                  type="number"
                  min={0}
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#ded7ca] bg-[#faf8f5] text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-forest mb-1.5">Cover Image URL</label>
                <input
                  type="url"
                  value={coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#ded7ca] bg-[#faf8f5] text-xs font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-forest mb-1.5">Detailed Description</label>
              <textarea
                required
                rows={6}
                placeholder="Comprehensive workshop description, prerequisites, and learning objectives..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-4 rounded-xl border border-[#ded7ca] bg-[#faf8f5] focus:bg-white text-xs leading-relaxed"
              />
            </div>

            <button
              type="submit"
              disabled={loading || categoriesLoading || categories.length === 0 || !category}
              className="w-full py-4 rounded-xl bg-forest hover:bg-forest-light text-white font-bold text-sm shadow-warm transition-all"
            >
              {loading ? 'Publishing Event...' : 'Publish Experience to Platform'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
