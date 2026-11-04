import React from 'react';
import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/hooks/useAuth';
import { SiteChrome } from '@/components/layout/SiteChrome';

export const metadata: Metadata = {
  title: 'Eventora — Discover. Connect. Experience.',
  description: 'A sophisticated, editorial event discovery and registration platform for workshops, masterclasses, and gatherings.',
  keywords: ['workshops', 'masterclasses', 'events', 'design', 'technology', 'conferences', 'tickets'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script src="https://checkout.razorpay.com/v1/checkout.js" async />
      </head>
      <body className="flex flex-col min-h-screen text-[#1A3A2A]">
        <AuthProvider>
          <SiteChrome>{children}</SiteChrome>
        </AuthProvider>
      </body>
    </html>
  );
}
