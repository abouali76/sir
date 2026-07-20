import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import path from 'path';

import { env } from './config/env';
import { logger } from './config/logger';
import { generalLimiter } from './middlewares/rateLimiter.middleware';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';

import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/users/user.routes';
import exchangeRateRoutes from './modules/exchangeRates/exchangeRate.routes';
import transactionRoutes from './modules/transactions/transaction.routes';
import treasuryRoutes from './modules/treasury/treasury.routes';
import reportRoutes from './modules/reports/report.routes';
import auditLogRoutes from './modules/auditLogs/auditLog.routes';

export function createApp(): Application {
  const app = express();

  // ===== الأمان =====
  app.use(
    helmet({
      contentSecurityPolicy: false, // تعطيل سياسة الأمان للسماح بالنصوص البرمجية المدمجة (inline scripts)
    })
  );
  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );
  app.use(generalLimiter);

  // ===== أدوات عامة =====
  app.use(express.json({ limit: '10mb' })); // زيادة الحد لرفع الصور الشخصية
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(compression());

  // ===== تسجيل الطلبات (HTTP logs) =====
  app.use(
    morgan('combined', {
      stream: { write: (message: string) => logger.info(message.trim()) },
    })
  );

  // ===== الملفات الثابتة (الواجهة الأمامية) =====
  const publicDir = path.join(process.cwd(), 'public');
  app.use(express.static(publicDir));

  app.get('/', (_req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });

  // ===== فحص الصحة =====
  app.get('/api/health', (_req, res) => {
    res.json({ success: true, message: 'الخادم يعمل بنجاح', timestamp: new Date().toISOString() });
  });

  // ===== المسارات (Routes) =====
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/exchange-rates', exchangeRateRoutes);
  app.use('/api/transactions', transactionRoutes);
  app.use('/api/treasury', treasuryRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/audit-logs', auditLogRoutes);

  // ===== معالجة الأخطاء =====
  app.use('/api', notFoundHandler);
  app.use(errorHandler);

  return app;
}
