import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { env } from './config/env.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import monitorRoutes from './routes/monitors.js';
import statusRoutes from './routes/status.js';

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({
  origin(origin, cb) {
    if (!origin || env.clientUrls.includes(origin)) return cb(null, true);
    const err = new Error('Origin not allowed by CORS');
    err.status = 403;
    return cb(err);
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '20kb' }));

app.get('/api/health', (_req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({ status: 'ok', database: connected ? 'connected' : 'disconnected' });
});

app.use('/api', apiLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/monitors', monitorRoutes);
app.use('/api', statusRoutes);

app.use(notFound);
app.use(errorHandler);
export default app;
