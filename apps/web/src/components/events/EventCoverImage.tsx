'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Image as ImageIcon } from 'lucide-react';
import { getCategoryEventImageUrl, resolveEventImageUrl } from '@/lib/eventImage';

interface EventCoverImageProps {
  src?: string | null;
  alt: string;
  label?: string;
  fallbackSrc?: string | null;
  categorySlug?: string | null;
  className?: string;
  imageClassName?: string;
  sizes?: string;
  loading?: 'eager' | 'lazy';
}

export function EventCoverImage({
  src,
  alt,
  label = 'Eventora experience',
  fallbackSrc,
  categorySlug,
  className = 'absolute inset-0 h-full w-full',
  imageClassName = '',
  sizes = '100vw',
  loading = 'lazy',
}: EventCoverImageProps) {
  const primaryImageUrl = resolveEventImageUrl(src);
  const categoryImageUrl = getCategoryEventImageUrl(categorySlug);
  const secondaryImageUrl = resolveEventImageUrl(fallbackSrc) || categoryImageUrl;
  const [failedImageUrls, setFailedImageUrls] = useState<string[]>([]);
  const imageUrl = primaryImageUrl && !failedImageUrls.includes(primaryImageUrl)
    ? primaryImageUrl
    : secondaryImageUrl && !failedImageUrls.includes(secondaryImageUrl)
      ? secondaryImageUrl
      : null;

  if (!imageUrl) {
    return (
      <div
        role="img"
        aria-label={`${alt} image unavailable`}
        className={`flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[#e7e1d5] via-[#f2ede4] to-[#dce6dc] text-forest ${className}`}
      >
        <div className="absolute -left-10 -top-14 h-44 w-44 rounded-full border border-white/60" />
        <div className="absolute -bottom-20 -right-8 h-56 w-56 rounded-full border border-white/60" />
        <ImageIcon className="relative h-9 w-9 text-forest/55" aria-hidden="true" />
        <span className="relative mt-2 text-xs font-semibold tracking-wide text-forest/70">{label}</span>
      </div>
    );
  }

  return (
    <Image
      src={imageUrl}
      alt={alt}
      fill
      sizes={sizes}
      unoptimized={!/^https:\/\/(images|plus)\.unsplash\.com\//i.test(imageUrl)}
      loading={loading}
      decoding="async"
      onError={() => setFailedImageUrls((failed) => failed.includes(imageUrl) ? failed : [...failed, imageUrl])}
      className={`absolute inset-0 h-full w-full object-cover ${imageClassName}`}
    />
  );
}
