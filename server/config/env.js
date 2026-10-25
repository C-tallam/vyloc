import 'dotenv/config';

const missing = ['MONGODB_URI', 'JWT_SECRET'].filter((k) => !process.env[k]);
if (missing.length) throw new Error(`Missing required environment variable(s): ${missing.join(', ')}. See server/.env.example`);
if (process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET must be at least 32 characters long.');

const isProd = process.env.NODE_ENV === 'production';
const clientUrls = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',').map((s) => s.trim().replace(/\/$/, '')).filter(Boolean);

export const env = {
  isProd,
  port: Number(process.env.PORT) || 5002,
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpires: process.env.JWT_EXPIRES_IN || '8h',
  clientUrls,
  scheduler: process.env.ENABLE_SCHEDULER ? process.env.ENABLE_SCHEDULER === 'true' : !isProd,
  appUrl: (process.env.APP_URL || clientUrls.find((u) => !u.includes('localhost')) || clientUrls[0] || '').replace(/\/$/, ''),
  email: {
    apiKey: process.env.BREVO_API_KEY || '',
    from: process.env.EMAIL_FROM || '',
    fromName: process.env.EMAIL_FROM_NAME || 'VYLOC',
  },
};
