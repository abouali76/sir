import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { sendSuccess } from '../../utils/ApiResponse';
import * as treasuryService from './treasury.service';

export const getBalance = catchAsync(async (_req: Request, res: Response) => {
  const balance = await treasuryService.getTreasuryBalance();
  sendSuccess(res, balance);
});

export const getDashboard = catchAsync(async (_req: Request, res: Response) => {
  const summary = await treasuryService.getDashboardSummary();
  sendSuccess(res, summary);
});

export const addFunds = catchAsync(async (req: Request, res: Response) => {
  const { usdAmount, iqdAmount } = req.body;
  const balance = await treasuryService.addFunds(Number(usdAmount || 0), Number(iqdAmount || 0), req.user!.id, req.ip);
  sendSuccess(res, balance, 'تمت إضافة الأموال للخزينة بنجاح');
});

export const removeFunds = catchAsync(async (req: Request, res: Response) => {
  const { usdAmount, iqdAmount } = req.body;
  const balance = await treasuryService.removeFunds(Number(usdAmount || 0), Number(iqdAmount || 0), req.user!.id, req.ip);
  sendSuccess(res, balance, 'تم سحب الأموال من الخزينة بنجاح');
});
