import { z } from 'zod';

export const createTransactionSchema = z.object({
  body: z.object({
    type: z.enum(['BUY', 'SELL']),
    customerName: z.string().max(100).optional(),
    customerPhone: z.string().max(20).optional(),
    usdAmount: z.number().refine(val => val !== 0, { message: 'المبلغ لا يمكن أن يكون صفرًا' }),
    customRate: z.number().positive().optional(),
    notes: z.string().max(500).optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const updateTransactionSchema = z.object({
  body: z.object({
    customerName: z.string().max(100).optional(),
    notes: z.string().max(500).optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().regex(/^\d+$/) }),
});

export const transactionListQuerySchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
    type: z.enum(['BUY', 'SELL']).optional(),
    search: z.string().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    sortBy: z.enum(['transactionDate', 'usdAmount', 'profit']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
  params: z.object({}).optional(),
});
