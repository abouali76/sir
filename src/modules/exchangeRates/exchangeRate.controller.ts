import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { sendSuccess } from '../../utils/ApiResponse';
import * as rateService from './exchangeRate.service';

export const getCurrentRate = catchAsync(async (_req: Request, res: Response) => {
  const rate = await rateService.getCurrentRate();
  sendSuccess(res, rate);
});

export const setNewRate = catchAsync(async (req: Request, res: Response) => {
  const { buyPrice, sellPrice } = req.body;
  const rate = await rateService.setNewRate(buyPrice, sellPrice, req.user!.id, req.ip);
  sendSuccess(res, rate, 'تم تحديث سعر الصرف بنجاح', 201);
});

export const getRateHistory = catchAsync(async (_req: Request, res: Response) => {
  const history = await rateService.getRateHistory();
  sendSuccess(res, history);
});

export const deleteRate = catchAsync(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  await rateService.deleteRate(id, req.user!.id, req.ip);
  sendSuccess(res, null, 'تم حذف السعر بنجاح');
});

export const toggleActiveRate = catchAsync(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const updated = await rateService.toggleActive(id, req.user!.id, req.ip);
  sendSuccess(res, updated, 'تم تغيير حالة السعر بنجاح');
});
