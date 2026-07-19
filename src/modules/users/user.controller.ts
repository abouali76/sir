import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { sendSuccess } from '../../utils/ApiResponse';
import * as userService from './user.service';

export const getAllUsers = catchAsync(async (_req: Request, res: Response) => {
  const users = await userService.getAllUsers();
  sendSuccess(res, users);
});

export const createUser = catchAsync(async (req: Request, res: Response) => {
  const user = await userService.createUser(req.body, req.user!.id);
  sendSuccess(res, user, 'تم إنشاء المستخدم بنجاح', 201);
});

export const updateUser = catchAsync(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const user = await userService.updateUser(id, req.body, req.user!.id);
  sendSuccess(res, user, 'تم تحديث المستخدم بنجاح');
});

export const deleteUser = catchAsync(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  await userService.deleteUser(id, req.user!.id);
  sendSuccess(res, null, 'تم تعطيل المستخدم بنجاح');
});
