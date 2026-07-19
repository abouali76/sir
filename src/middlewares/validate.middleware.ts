import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { ApiError } from '../utils/ApiError';

/**
 * استخدام:
 * router.post('/', validate(createUserSchema), handler)
 * حيث createUserSchema = z.object({ body: z.object({...}), query: z.object({...}), params: z.object({...}) })
 */
export function validate(schema: AnyZodObject) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        return next(ApiError.badRequest('بيانات مدخلة غير صحيحة', details));
      }
      next(error);
    }
  };
}
