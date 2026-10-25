import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/index.js';
import { wrap } from './errorHandler.js';

export const signToken = (user) =>
  jwt.sign({ sub: user.id }, env.jwtSecret, { algorithm: 'HS256', expiresIn: env.jwtExpires });

export const requireAuth = wrap(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    const payload = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] });
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' });
    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
});
