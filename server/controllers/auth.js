import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { User } from '../models/index.js';
import { signToken } from '../middleware/auth.js';
import { wrap } from '../middleware/errorHandler.js';
import { emailEnabled, sendVerificationEmail, sendWelcomeEmail } from '../utils/email.js';
import { checkEmailDomain } from '../utils/emailCheck.js';

const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);
const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, demo: Boolean(u.demo) });
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

async function issueVerification(user) {
  const token = crypto.randomBytes(32).toString('hex');
  user.verifyTokenHash = sha256(token);
  user.verifyTokenExpires = new Date(Date.now() + 24 * 3600 * 1000);
  await user.save();
  return sendVerificationEmail(user, token);
}

export const register = wrap(async (req, res) => {
  const { name, email, password } = req.body;
  const check = await checkEmailDomain(email);
  if (!check.ok) return res.status(400).json({ error: check.reason });

  const passwordHash = await bcrypt.hash(password, 12);
  const needsVerification = emailEnabled();
  let user = await User.findOne({ email });
  if (user && user.emailVerified !== false) return res.status(409).json({ error: 'That email is already registered' });

  if (user) { user.name = name; user.passwordHash = passwordHash; } // replaces an unconfirmed earlier sign-up
  else user = new User({ name, email, passwordHash, emailVerified: !needsVerification });

  if (!needsVerification) {
    await user.save();
    return res.status(201).json({ token: signToken(user), user: publicUser(user) });
  }
  const emailSent = await issueVerification(user);
  return res.status(201).json({ verificationRequired: true, email, emailSent });
});

export const login = wrap(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+passwordHash');
  const ok = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
  if (!user || !ok) return res.status(401).json({ error: 'Invalid email or password' });
  if (user.emailVerified === false) {
    return res.status(403).json({ error: 'Please verify your email address first. Check your inbox for the confirmation link.', code: 'EMAIL_NOT_VERIFIED' });
  }
  return res.json({ token: signToken(user), user: publicUser(user) });
});

export const verifyEmail = wrap(async (req, res) => {
  const user = await User.findOne({ verifyTokenHash: sha256(req.body.token), verifyTokenExpires: { $gt: new Date() } });
  if (!user) return res.status(400).json({ error: 'This confirmation link is invalid or has expired. Request a new one from the sign-in page.' });
  user.emailVerified = true;
  user.verifyTokenHash = undefined;
  user.verifyTokenExpires = undefined;
  await user.save();
  sendWelcomeEmail(user);
  return res.json({ token: signToken(user), user: publicUser(user) });
});

export const resendVerification = wrap(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (user && user.emailVerified === false && emailEnabled()) await issueVerification(user);
  res.json({ ok: true });
});

export const changePassword = wrap(async (req, res) => {
  if (req.user.demo) return res.status(403).json({ error: 'Demo accounts cannot change their password' });
  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!(await bcrypt.compare(req.body.currentPassword, user.passwordHash))) {
    return res.status(400).json({ error: 'Current password is incorrect' });
  }
  user.passwordHash = await bcrypt.hash(req.body.newPassword, 12);
  await user.save();
  return res.json({ ok: true });
});

export const me = (req, res) => res.json(publicUser(req.user));
