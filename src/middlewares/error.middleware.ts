import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ApiError } from '../utils/ApiError';
import { logger } from '../config/logger';
import { env } from '../config/env';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(ApiError.notFound(`المسار غير موجود: ${req.originalUrl}`));
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  let statusCode = 500;
  let message = 'حدث خطأ داخلي في الخادم';
  let details: unknown;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // معالجة أخطاء قاعدة البيانات الشائعة
    if (err.code === 'P2002') {
      statusCode = 409;
      message = 'القيمة المدخلة مستخدمة مسبقًا (تعارض في البيانات الفريدة)';
    } else if (err.code === 'P2025') {
      statusCode = 404;
      message = 'السجل المطلوب غير موجود';
    } else if (err.code === 'P2003') {
      statusCode = 400;
      message = 'مرجع غير صالح (Foreign Key)';
    } else {
      statusCode = 400;
      message = `خطأ في العملية على قاعدة البيانات (${err.code})`;
    }
  } else if (err instanceof Error) {
    message = env.isProduction ? message : err.message;
  }

  // تسجيل الخطأ الفعلي دائمًا (حتى لو أُخفيت التفاصيل عن المستخدم)
  if (statusCode >= 500) {
    logger.error(`${req.method} ${req.originalUrl} -> ${message}`, err);
  } else {
    logger.warn(`${req.method} ${req.originalUrl} -> ${message}`);
  }

  let finalMessage = message;
  if (err instanceof Error && err.message !== message) {
    finalMessage = `${message} - ${err.message}`;
  }

  // If we have validation details, append them to the message so they appear in UI alerts
  if (details && Array.isArray(details)) {
    const detailStrings = details.map((d: any) => {
      let fieldName = d.field.replace('body.', '').replace('query.', '').replace('params.', '');
      if (fieldName === 'password') fieldName = 'كلمة المرور';
      if (fieldName === 'username') fieldName = 'اسم المستخدم';
      if (fieldName === 'fullName') fieldName = 'الاسم الكامل';
      if (fieldName === 'role') fieldName = 'الصلاحية';
      
      let msg = d.message;
      if (msg.includes('String must contain at least 8 character')) msg = 'يجب أن لا تقل عن 8 أحرف';
      if (msg.includes('String must contain at least 3 character')) msg = 'يجب أن لا تقل عن 3 أحرف';
      return `${fieldName}: ${msg}`;
    });
    finalMessage = `${message}\n${detailStrings.join('\n')}`;
  }

  res.status(statusCode).json({
    success: false,
    message: finalMessage,
    ...(details ? { details } : {}),
    ...(env.isProduction ? {} : { stack: err instanceof Error ? err.stack : undefined }),
  });
}
