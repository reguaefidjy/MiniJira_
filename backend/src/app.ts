import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { errorHandler } from './middlewares/errorHandler';
import authRouter from './modules/auth/auth.router';
import ticketsRouter from './modules/tickets/tickets.router';
import commentsRouter from './modules/comments/comments.router';
import usersRouter from './modules/users/users.router';
import labelsRouter from './modules/labels/labels.router';
import metricsRouter from './modules/metrics/metrics.router';
import adminRouter from './modules/admin/admin.router';

const allowedOrigin = process.env.CORS_ORIGIN;
if (!allowedOrigin) throw new Error('CORS_ORIGIN env var must be defined');

const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'"],
      imgSrc:     ["'self'", 'data:'],
      connectSrc: ["'self'"],
      frameSrc:   ["'none'"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

app.use(cors({ origin: allowedOrigin, credentials: true }));
app.use(express.json());
app.use(cookieParser());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'too_many_requests', message: 'Too many attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth', authLimiter);

// Routes
// authRouter handles: /api/auth/callback, /api/auth/logout, /api/auth/refresh, /api/me
app.use('/api', authRouter);
app.use('/api/tickets', ticketsRouter);
// commentsRouter handles: /api/tickets/:id/comments and /api/comments/:id/archive
app.use('/api', commentsRouter);
app.use('/api/users', usersRouter);
app.use('/api/labels', labelsRouter);
app.use('/api/metrics', metricsRouter);
app.use('/api/admin', adminRouter);

app.use(errorHandler);

export default app;
