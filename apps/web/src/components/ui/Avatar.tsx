'use client';

import { useState } from 'react';

interface AvatarProps {
  src?: string | null;
  name: string;
  className: string;
}

export function Avatar({ src, name, className }: AvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const imageSrc = src?.trim() || null;
  const initials = (name || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || '?';

  return (
    <span
      role="img"
      aria-label={`${name || 'User'} avatar`}
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden bg-[#f2ede4] text-forest ${className}`}
    >
      {imageSrc && failedSrc !== imageSrc ? (
        <img
          src={imageSrc}
          alt=""
          aria-hidden="true"
          onError={() => setFailedSrc(imageSrc)}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <span aria-hidden="true" className="text-[0.7em] font-semibold tracking-wide">
          {initials}
        </span>
      )}
    </span>
  );
}
