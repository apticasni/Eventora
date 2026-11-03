import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { authRouter } from './routes/auth';
import { eventsRouter } from './routes/events';
import { bookingsRouter } from './routes/bookings';
import { paymentsRouter } from './routes/payments';
import { waitlistRouter } from './routes/waitlist';
import { ticketsRouter } from './routes/tickets';
import { reviewsRouter } from './routes/reviews';
import { certificatesRouter } from './routes/certificates';
import { proposalsRouter } from './routes/proposals';
import { adminRouter } from './routes/admin';
import { organizerRouter } from './routes/organizer';
import { recommendationsRouter } from './routes/recommendations';
import { calendarRouter } from './routes/calendar';
import { errorHandler } from './middleware/errorHandler';
import { prisma } from './lib/prisma';

export const app = express();

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: (process.env.FRONTEND_URL || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Razorpay-Signature'],
}));

app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
});
app.use(globalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many authentication attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
});

app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      success: true,
      message: 'Eventora API is running',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch {
    res.status(503).json({
      success: false,
      message: 'Eventora API is running but the database is unavailable',
      database: 'disconnected',
      timestamp: new Date().toISOString(),
    });
  }
});

app.use('/api/auth', authLimiter, authRouter);
app.use('/api/events', eventsRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/waitlist', waitlistRouter);
app.use('/api/tickets', ticketsRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/certificates', certificatesRouter);
app.use('/api/proposals', proposalsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/organizer', organizerRouter);
app.use('/api/recommendations', recommendationsRouter);
app.use('/api/calendar', calendarRouter);

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use(errorHandler);

export default app;
