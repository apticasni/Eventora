import { notFound, redirect } from 'next/navigation';

const sectionHashes: Record<string, string> = {
  overview: 'overview',
  dashboard: 'overview',
  events: 'events',
  users: 'users',
  organizers: 'organizers',
  attendees: 'attendees',
  bookings: 'bookings',
  waitlists: 'waitlists',
  reviews: 'reviews',
  support: 'support',
  announcements: 'announcements',
  reports: 'reports',
  audit: 'audit',
  settings: 'settings',
  categories: 'settings',
  proposals: 'proposals',
  system: 'system',
};

export default async function AdminSectionRedirect({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const hash = sectionHashes[section];
  if (!hash) notFound();

  redirect(`/admin#${hash}`);
}
