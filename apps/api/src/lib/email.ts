import nodemailer, { type Transporter } from 'nodemailer';
import { escapeHtml } from './html';
import { getSmtpConfig } from './emailConfig';

let transporter: Transporter | null = null;
let smtpFrom: string | null = null;

function getTransporter(): Transporter | null {
  if (transporter) return transporter;

  const config = getSmtpConfig();
  if (!config) return null;

  smtpFrom = config.from;
  transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
  });
  return transporter;
}

const FROM = process.env.EMAIL_FROM || 'Eventora <noreply@eventora.com>';
const APP_URL = escapeHtml(process.env.FRONTEND_URL || 'http://localhost:3000');

async function sendEmail(to: string, subject: string, html: string) {
  const safeSubject = subject.replace(/[\r\n]+/g, ' ');
  const mailer = getTransporter();
  if (!mailer) {
    console.log(`\n📧 [DEV EMAIL] To: ${to}\nSubject: ${safeSubject}\n${html.replace(/<[^>]+>/g, '')}\n`);
    return;
  }
  await mailer.sendMail({ from: smtpFrom || FROM, to, subject: safeSubject, html });
}

const baseStyle = `
  font-family: 'Georgia', serif;
  max-width: 600px;
  margin: 0 auto;
  background: #faf9f6;
  color: #2d2d2d;
`;

const headerStyle = `
  background: #1a3a2a;
  color: #fff;
  padding: 28px 32px;
  border-radius: 8px 8px 0 0;
`;

const bodyStyle = `
  padding: 32px;
  background: #ffffff;
`;

const footerStyle = `
  padding: 20px 32px;
  font-size: 12px;
  color: #888;
  text-align: center;
  background: #f5f3ee;
  border-radius: 0 0 8px 8px;
`;

const btnStyle = `
  display: inline-block;
  background: #1a3a2a;
  color: #fff !important;
  padding: 12px 28px;
  border-radius: 6px;
  text-decoration: none;
  font-weight: 600;
  margin-top: 16px;
`;

function layout(content: string) {
  return `
<div style="${baseStyle}">
  <div style="${headerStyle}">
    <h1 style="margin:0;font-size:24px;letter-spacing:1px;">Eventora</h1>
    <p style="margin:4px 0 0;font-size:13px;opacity:0.8;">Discover. Connect. Experience.</p>
  </div>
  <div style="${bodyStyle}">${content}</div>
  <div style="${footerStyle}">
    &copy; ${new Date().getFullYear()} Eventora. All rights reserved.<br/>
    You received this email because you have an account on Eventora.
  </div>
</div>`;
}

export async function sendWelcomeEmail(to: string, name: string) {
  await sendEmail(to, 'Welcome to Eventora! 🎉', layout(`
    <h2 style="color:#1a3a2a;">Welcome, ${escapeHtml(name)}!</h2>
    <p>We're thrilled to have you join Eventora — your go-to destination for discovering workshops, masterclasses, conferences, and professional events.</p>
    <p>Start exploring hundreds of curated events designed to inspire, connect, and help you grow.</p>
    <a href="${APP_URL}/events" style="${btnStyle}">Explore Events</a>
    <p style="margin-top:24px;color:#666;font-size:14px;">Happy learning! 🌱</p>
  `));
}

export async function sendBookingConfirmation(to: string, name: string, event: {
  title: string; startDate: Date; venueName?: string | null; city?: string | null; seats: number; reference: string;
}) {
  await sendEmail(to, `Booking Confirmed: ${event.title}`, layout(`
    <h2 style="color:#1a3a2a;">Your booking is confirmed! 🎟</h2>
    <p>Hi ${escapeHtml(name)}, you're all set for <strong>${escapeHtml(event.title)}</strong>.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr><td style="padding:8px 0;color:#666;width:40%;">📅 Date</td><td>${new Date(event.startDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td></tr>
      <tr><td style="padding:8px 0;color:#666;">📍 Venue</td><td>${escapeHtml(event.venueName || 'Online')} ${event.city ? `· ${escapeHtml(event.city)}` : ''}</td></tr>
      <tr><td style="padding:8px 0;color:#666;">💺 Seats</td><td>${event.seats}</td></tr>
      <tr><td style="padding:8px 0;color:#666;">🔖 Reference</td><td><strong>${escapeHtml(event.reference)}</strong></td></tr>
    </table>
    <a href="${APP_URL}/dashboard/bookings" style="${btnStyle}">View Booking</a>
  `));
}

export async function sendPaymentReceipt(to: string, name: string, data: {
  eventTitle: string; amount: number; currency: string; paymentId: string; reference: string;
}) {
  await sendEmail(to, `Payment Receipt — ${data.eventTitle}`, layout(`
    <h2 style="color:#1a3a2a;">Payment Received ✅</h2>
    <p>Hi ${escapeHtml(name)}, your payment for <strong>${escapeHtml(data.eventTitle)}</strong> has been processed successfully.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr><td style="padding:8px 0;color:#666;width:40%;">💳 Amount</td><td><strong>${escapeHtml(data.currency)} ${data.amount.toFixed(2)}</strong></td></tr>
      <tr><td style="padding:8px 0;color:#666;">🔖 Booking Ref</td><td>${escapeHtml(data.reference)}</td></tr>
      <tr><td style="padding:8px 0;color:#666;">🧾 Payment ID</td><td>${escapeHtml(data.paymentId)}</td></tr>
    </table>
    <p style="color:#666;font-size:14px;">Keep this email as your payment receipt.</p>
  `));
}

export async function sendTicketDetails(to: string, name: string, tickets: Array<{
  code: string; seatNumber: number; qrCode?: string | null;
}>, event: { title: string; startDate: Date; venueName?: string | null; city?: string | null }) {
  const ticketHtml = tickets.map(t => `
    <div style="border:1px solid #e5e0d8;border-radius:8px;padding:16px;margin:12px 0;background:#faf9f6;">
      <strong>Seat #${t.seatNumber}</strong> &mdash; <code style="background:#f0ede8;padding:2px 6px;border-radius:4px;">${escapeHtml(t.code)}</code>
      ${t.qrCode ? `<br/><img src="${escapeHtml(t.qrCode)}" alt="QR Code" style="margin-top:8px;width:120px;height:120px;"/>` : ''}
    </div>
  `).join('');

  await sendEmail(to, `Your Tickets — ${event.title}`, layout(`
    <h2 style="color:#1a3a2a;">Here are your tickets! 🎟</h2>
    <p>Hi ${escapeHtml(name)}, here are your tickets for <strong>${escapeHtml(event.title)}</strong> on ${new Date(event.startDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.</p>
    ${ticketHtml}
    <p style="color:#666;font-size:14px;margin-top:16px;">Please present the QR code at the venue for entry.</p>
    <a href="${APP_URL}/dashboard/bookings" style="${btnStyle}">View in Dashboard</a>
  `));
}

export async function sendCancellationConfirmation(to: string, name: string, event: { title: string }, reference: string) {
  await sendEmail(to, `Booking Cancelled — ${event.title}`, layout(`
    <h2 style="color:#1a3a2a;">Booking Cancelled</h2>
    <p>Hi ${escapeHtml(name)}, your booking for <strong>${escapeHtml(event.title)}</strong> (Ref: <strong>${escapeHtml(reference)}</strong>) has been cancelled.</p>
    <p>If you paid for this booking, a refund will be initiated within 5–7 business days.</p>
    <a href="${APP_URL}/events" style="${btnStyle}">Browse More Events</a>
  `));
}

export async function sendWaitlistOffer(to: string, name: string, event: { title: string; id: string }, offerExpiresAt: Date) {
  await sendEmail(to, `A seat is available — ${event.title}`, layout(`
    <h2 style="color:#1a3a2a;">Good news! A seat opened up 🎉</h2>
    <p>Hi ${escapeHtml(name)}, a seat has become available for <strong>${escapeHtml(event.title)}</strong>.</p>
    <p><strong>⏰ You have until ${offerExpiresAt.toLocaleString('en-IN')} to claim your seat.</strong></p>
    <p>After this window, your offer will expire and the next person on the waitlist will be notified.</p>
    <a href="${APP_URL}/events/${encodeURIComponent(event.id)}" style="${btnStyle}">Claim Your Seat</a>
  `));
}

export async function sendEventReminder(to: string, name: string, event: {
  title: string; startDate: Date; venueName?: string | null; city?: string | null; onlineLink?: string | null;
}) {
  await sendEmail(to, `Reminder: ${event.title} is tomorrow!`, layout(`
    <h2 style="color:#1a3a2a;">See you tomorrow! 👋</h2>
    <p>Hi ${escapeHtml(name)}, this is a reminder that <strong>${escapeHtml(event.title)}</strong> is happening tomorrow.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr><td style="padding:8px 0;color:#666;width:40%;">📅 Date</td><td>${new Date(event.startDate).toLocaleString('en-IN')}</td></tr>
      ${event.venueName ? `<tr><td style="padding:8px 0;color:#666;">📍 Venue</td><td>${escapeHtml(event.venueName)}${event.city ? `, ${escapeHtml(event.city)}` : ''}</td></tr>` : ''}
      ${event.onlineLink && /^https?:\/\//i.test(event.onlineLink)
        ? `<tr><td style="padding:8px 0;color:#666;">🔗 Link</td><td><a href="${escapeHtml(event.onlineLink)}">${escapeHtml(event.onlineLink)}</a></td></tr>`
        : ''}
    </table>
    <a href="${APP_URL}/dashboard/bookings" style="${btnStyle}">View Ticket</a>
  `));
}
