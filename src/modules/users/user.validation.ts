import { z } from 'zod';

export const createUserSchema = z.object({
  body: z.object({
    username: z.string().min(1, 'اسم المستخدم مطلوب'),
    fullName: z.string().min(1, 'الاسم الكامل مطلوب'),
    password: z.string().min(1, 'كلمة المرور مطلوبة'),
    role: z.enum(['ADMIN', 'EMPLOYEE']),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const updateUserSchema = z.object({
  body: z.object({
    fullName: z.string().min(1, 'الاسم الكامل مطلوب').optional(),
    role: z.enum(['ADMIN', 'EMPLOYEE']).optional(),
    isActive: z.boolean().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().regex(/^\d+$/) }),
});

export const userIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().regex(/^\d+$/) }),
});
