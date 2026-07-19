import { Request, Response, NextFunction, RequestHandler } from 'express';

// يلتقط الأخطاء غير المتزامنة (async) تلقائيًا ويمررها إلى errorHandler
export function catchAsync(fn: RequestHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
