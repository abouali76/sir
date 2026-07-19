import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { sendSuccess } from '../../utils/ApiResponse';
import * as reportService from './report.service';

export const getProfitReport = catchAsync(async (req: Request, res: Response) => {
  const period = (req.query.period as any) || 'today';
  const report = await reportService.getProfitReport(period);
  sendSuccess(res, report);
});

export const exportExcel = catchAsync(async (req: Request, res: Response) => {
  const { from, to } = req.query as { from?: string; to?: string };
  const buffer = await reportService.exportToExcel(from, to);

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=transactions-report.xlsx');
  res.send(buffer);
});

export const exportPDF = catchAsync(async (req: Request, res: Response) => {
  const { from, to } = req.query as { from?: string; to?: string };
  const buffer = await reportService.exportToPDF(from, to);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=transactions-report.pdf');
  res.send(buffer);
});
