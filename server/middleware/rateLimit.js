import rateLimit from 'express-rate-limit';

const make = (windowMs, limit, error) =>
  rateLimit({ windowMs, limit, standardHeaders: true, legacyHeaders: false, message: { error } });

export const apiLimiter = make(15 * 60 * 1000, 600, 'Too many requests, please try again later.');
export const loginLimiter = make(15 * 60 * 1000, 10, 'Too many login attempts. Please try again later.');
export const registerLimiter = make(60 * 60 * 1000, 10, 'Too many sign-ups from this address. Please try again later.');
export const resendLimiter = make(60 * 60 * 1000, 5, 'Too many confirmation emails requested. Please try again later.');
export const checkNowLimiter = make(10 * 60 * 1000, 30, 'Too many manual checks. Please wait a few minutes.');
export const statusLimiter = make(15 * 60 * 1000, 200, 'Too many requests, please try again later.');
