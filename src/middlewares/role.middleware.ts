import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { ApiError } from '../utils/ApiError';

/**
 * استخدام: router.delete('/:id', authenticate, authorize("ADMIN"), handler)
 */
export function authorize(...allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(ApiError.unauthorized());
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(ApiError.forbidden('لا تملك الصلاحية الكافية لتنفيذ هذا الإجراء'));
    }
    next();
  };
}
