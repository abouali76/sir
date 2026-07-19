import { z } from 'zod';

export const setExchangeRateSchema = z.object({
  body: z
    .object({
      buyPrice: z.number().positive('سعر الشراء يجب أن يكون رقمًا موجبًا'),
      sellPrice: z.number().positive('سعر البيع يجب أن يكون رقمًا موجبًا'),
    })
    .refine((data) => data.sellPrice >= data.buyPrice, {
      message: 'سعر البيع يجب أن يكون أكبر من أو يساوي سعر الشراء',
      path: ['sellPrice'],
    }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});
