import { z } from 'zod';

export const fundsSchema = z.object({
  body: z.object({
    usdAmount: z.coerce.number().nonnegative('المبلغ (دولار) يجب أن يكون رقمًا غير سالب').optional().default(0),
    iqdAmount: z.coerce.number().nonnegative('المبلغ (دينار) يجب أن يكون رقمًا غير سالب').optional().default(0),
  }).refine(data => data.usdAmount > 0 || data.iqdAmount > 0, {
    message: 'يجب إدخال مبلغ (دولار أو دينار) أكبر من الصفر',
    path: ['usdAmount']
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});
