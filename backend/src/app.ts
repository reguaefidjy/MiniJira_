import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';

import { errorHandler } from './middlewares/errorHandler';
import authRouter from './modules/auth/auth.router';
import ticketsRouter from './modules/tickets/tickets.router';
import commentsRouter from './modules/comments/comments.router';
import usersRouter from './modules/users/users.router';
import labelsRouter from './modules/labels/labels.router';
import metricsRouter from './modules/metrics/metrics.router';
import adminRouter from './modules/admin/admin.router';

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());

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
