'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

type Notification = {
  id: string;
  title: string;
  message: string;
  link?: string | null;
  readAt?: string | null;
  createdAt: string;
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.notifications.list().then((response) => {
      if (!active) return;
      if (!response.success || !response.data) {
        setError(response.message || 'Could not load notifications.');
        return;
      }
      setNotifications(response.data.notifications);
      setUnreadCount(response.data.unreadCount);
    }).catch(() => {
      if (active) setError('Could not load notifications.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const markRead = async (id: string) => {
    const response = await api.notifications.markRead(id);
    if (!response.success) {
      setError(response.message || 'Could not update this notification.');
      return;
    }
    setNotifications((items) => items.map((item) => item.id === id ? { ...item, readAt: new Date().toISOString() } : item));
    setUnreadCount((count) => Math.max(0, count - 1));
  };

  const markAllRead = async () => {
    const response = await api.notifications.markAllRead();
    if (!response.success) {
      setError(response.message || 'Could not update notifications.');
      return;
    }
    const readAt = new Date().toISOString();
    setNotifications((items) => items.map((item) => ({ ...item, readAt: item.readAt || readAt })));
    setUnreadCount(0);
  };

  return (
    <main className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-terracotta">Updates</p>
          <h1 className="font-serif text-3xl font-bold text-forest">Notifications</h1>
          <p className="mt-2 text-sm text-[#71695d]">{unreadCount} unread notification{unreadCount === 1 ? '' : 's'}</p>
        </div>
        <button type="button" onClick={markAllRead} disabled={!unreadCount} className="rounded-xl border border-[#ded7ca] px-4 py-2 text-sm font-semibold text-forest disabled:opacity-50">
          Mark all as read
        </button>
      </header>

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
      {loading ? (
        <div role="status" className="py-16 text-center text-sm text-[#71695d]">Loading notifications…</div>
      ) : notifications.length ? (
        <ul className="space-y-3">
          {notifications.map((notification) => (
            <li key={notification.id} className={`rounded-2xl border p-5 ${notification.readAt ? 'border-[#ded7ca] bg-white' : 'border-forest/20 bg-emerald-50/60'}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-forest">{notification.title}</h2>
                  <p className="mt-1 text-sm text-[#5c5446]">{notification.message}</p>
                  <time className="mt-2 block text-xs text-[#8c8273]" dateTime={notification.createdAt}>{new Date(notification.createdAt).toLocaleString()}</time>
                  {notification.link && <Link className="mt-3 inline-block text-sm font-semibold text-forest underline" href={notification.link}>View details</Link>}
                </div>
                {!notification.readAt && (
                  <button type="button" onClick={() => markRead(notification.id)} className="shrink-0 rounded-lg border border-[#ded7ca] bg-white px-3 py-1.5 text-xs font-semibold text-forest">
                    Mark read
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-3xl border border-[#ded7ca] bg-white p-12 text-center text-sm text-[#71695d]">You are all caught up. New registration and event updates will appear here.</div>
      )}
    </main>
  );
}
