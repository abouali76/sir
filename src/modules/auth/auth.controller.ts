import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { sendSuccess } from '../../utils/ApiResponse';
import * as authService from './auth.service';
import { env } from '../../config/env';
import { ApiError } from '../../utils/ApiError';

const cookieOptions = {
  httpOnly: true,
  secure: env.isProduction,
  sameSite: 'strict' as const,
};

export const login = catchAsync(async (req: Request, res: Response) => {
  const { username, password } = req.body;
  const result = await authService.login(username, password, req.ip, req.headers['user-agent']);

  res.cookie('accessToken', result.accessToken, {
    ...cookieOptions,
    maxAge: 8 * 60 * 60 * 1000, // 8 ساعات
  });
  res.cookie('refreshToken', result.refreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 أيام
  });

  sendSuccess(res, result, 'تم تسجيل الدخول بنجاح');
});

export const refresh = catchAsync(async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
  if (!refreshToken) throw ApiError.unauthorized('رمز التحديث مفقود');

  const accessToken = await authService.refreshAccessToken(refreshToken);
  res.cookie('accessToken', accessToken, { ...cookieOptions, maxAge: 8 * 60 * 60 * 1000 });
  sendSuccess(res, { accessToken }, 'تم تحديث الجلسة');
});

export const logout = catchAsync(async (req: Request, res: Response) => {
  if (req.user) {
    await authService.logout(req.user.id, req.ip);
  }
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  sendSuccess(res, null, 'تم تسجيل الخروج بنجاح');
});

export const changePassword = catchAsync(async (req: Request, res: Response) => {
  const { oldPassword, newPassword } = req.body;
  await authService.changePassword(req.user!.id, oldPassword, newPassword);
  sendSuccess(res, null, 'تم تغيير كلمة المرور بنجاح');
});

export const me = catchAsync(async (req: Request, res: Response) => {
  sendSuccess(res, req.user, 'بيانات المستخدم الحالي');
});
