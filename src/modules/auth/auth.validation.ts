import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    username: z.string().min(1, 'اسم المستخدم مطلوب').max(50),
    password: z.string().min(1, 'كلمة المرور مطلوبة'),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const changePasswordSchema = z.object({
  body: z.object({
    oldPassword: z.string().min(1, 'كلمة المرور القديمة مطلوبة'),
    newPassword: z.string().min(1, 'كلمة المرور الجديدة مطلوبة'),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});
