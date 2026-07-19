import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

// حد عام على كل الـ API
export const generalLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: 100000, // Disabled for local testing
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'عدد كبير من الطلبات، حاول مرة أخرى لاحقًا',
  },
});

// حد أكثر صرامة على تسجيل الدخول لمنع هجمات Brute Force
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'محاولات تسجيل دخول كثيرة جدًا، حاول بعد 15 دقيقة',
  },
  skipSuccessfulRequests: true,
});
