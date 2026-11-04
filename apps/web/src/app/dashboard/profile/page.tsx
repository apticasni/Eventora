'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { Avatar } from '@/components/ui/Avatar';
import type { User } from '@eventora/shared';
import { Check, ImagePlus, Sparkles, X } from 'lucide-react';

const ALL_INTERESTS = [
  'Technology',
  'Design',
  'Business',
  'Health & Wellness',
  'Photography',
  'Music',
  'Cooking',
  'Leadership',
];

export default function ProfilePage() {
  const { user } = useAuth();
  return <ProfileForm key={user?.id || 'profile'} user={user} />;
}

function ProfileForm({ user }: { user: User | null }) {
  const { refreshUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [interests, setInterests] = useState<string[]>(user?.interests || []);
  const [loading, setLoading] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleInterest = (interest: string) => {
    if (interests.includes(interest)) {
      setInterests(interests.filter((i) => i !== interest));
    } else {
      setInterests([...interests, interest]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSaved(false);
    setError(null);
    try {
      const response = await api.auth.updateProfile({ name, bio, phone, interests, avatar });
      if (!response.success) {
        throw new Error(response.message || 'Could not save your profile.');
      }
      await refreshUser();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save your profile.');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Choose a JPG, PNG, or WebP image.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('Choose an image smaller than 8 MB.');
      return;
    }

    setPhotoLoading(true);
    setError(null);
    try {
      const bitmap = await createImageBitmap(file);
      try {
        if (bitmap.width > 12000 || bitmap.height > 12000) {
          throw new Error('Image dimensions must be 12,000 pixels or smaller.');
        }

        const maxDimension = 320;
        const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));

        const context = canvas.getContext('2d');
        if (!context) throw new Error('Your browser could not process this image.');
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

        const compressedPhoto = canvas.toDataURL('image/jpeg', 0.8);
        if (compressedPhoto.length > 300_000) {
          throw new Error('This image could not be compressed enough. Choose another photo.');
        }
        setAvatar(compressedPhoto);
      } finally {
        bitmap.close();
      }
    } catch (photoError) {
      setError(photoError instanceof Error ? photoError.message : 'Could not load this image.');
    } finally {
      setPhotoLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <span className="text-xs font-bold uppercase tracking-widest text-terracotta">
          Account Settings
        </span>
        <h1 className="font-serif text-3xl font-bold text-forest">Profile & Learning Interests</h1>
        <p className="text-xs sm:text-sm text-[#71695d]">
          Customize your public instructor or attendee bio and select interest categories to power personalized workshop recommendations.
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-[#ded7ca] p-8 sm:p-10 shadow-warm space-y-8">
        {saved && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>Profile and learning preferences updated successfully!</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <Avatar
              src={avatar}
              name={name || user?.name || 'User'}
              className="w-20 h-20 rounded-full border-2 border-[#ded7ca]"
            />
            <div className="space-y-2">
              <p className="text-xs font-bold text-forest">Profile photo</p>
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#ded7ca] bg-[#faf8f5] px-3 py-2 text-xs font-semibold text-forest hover:bg-white">
                  <ImagePlus className="h-4 w-4" />
                  {photoLoading ? 'Preparing photo…' : 'Choose photo'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePhotoChange}
                    disabled={photoLoading || loading}
                    className="sr-only"
                  />
                </label>
                {avatar && (
                  <button
                    type="button"
                    onClick={() => setAvatar('')}
                    disabled={photoLoading || loading}
                    className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold text-[#71695d] hover:bg-[#f5f2eb] disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                    Remove
                  </button>
                )}
              </div>
              <p className="text-[11px] text-[#71695d]">JPG, PNG, or WebP; up to 8 MB. Photos are resized before saving.</p>
            </div>
          </div>

          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
              <X className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label htmlFor="profile-name" className="block text-xs font-bold text-forest mb-1.5">Full Name</label>
            <input
              id="profile-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-[#ded7ca] bg-[#faf8f5] focus:bg-white text-xs sm:text-sm font-semibold"
            />
          </div>

          <div>
            <label htmlFor="profile-phone" className="block text-xs font-bold text-forest mb-1.5">Phone number</label>
            <input
              id="profile-phone"
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={30}
              className="w-full px-4 py-2.5 rounded-xl border border-[#ded7ca] bg-[#faf8f5] focus:bg-white text-xs sm:text-sm font-semibold"
            />
          </div>

          <div>
            <label htmlFor="profile-bio" className="block text-xs font-bold text-forest mb-1.5">Bio / Professional Headline</label>
            <textarea
              id="profile-bio"
              rows={3}
              placeholder="Tell other attendees and instructors about yourself and what you are learning..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full p-4 rounded-xl border border-[#ded7ca] bg-[#faf8f5] focus:bg-white text-xs leading-relaxed"
            />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-terracotta" />
              <label className="text-xs font-bold text-forest">
                Personalized Learning Interests (Used for Smart Recommendations)
              </label>
            </div>
            <p className="text-[11px] text-[#71695d] mb-3">
              Select topics you care about. Our recommendation engine matches these against upcoming cohorts and alumni reviews.
            </p>

            <div className="flex flex-wrap gap-2.5">
              {ALL_INTERESTS.map((interest) => {
                const selected = interests.includes(interest);
                return (
                  <button
                    key={interest}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleInterest(interest)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all border ${
                      selected
                        ? 'bg-forest text-white border-forest shadow-sm'
                        : 'bg-[#faf8f5] text-[#5c5446] border-[#ded7ca] hover:border-forest/50'
                    }`}
                  >
                    {selected ? `✓ ${interest}` : `+ ${interest}`}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || photoLoading}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-forest hover:bg-forest-light text-white font-bold text-xs shadow-warm transition-all"
          >
            {loading ? 'Saving Preferences...' : 'Save Profile Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
