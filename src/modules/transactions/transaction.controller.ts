import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { sendSuccess, sendPaginated } from '../../utils/ApiResponse';
import * as transactionService from './transaction.service';
import { PrismaClient } from '@prisma/client';

export const createTransaction = catchAsync(async (req: Request, res: Response) => {
  const transaction = await transactionService.createTransaction(req.body, req.user!.id);
  sendSuccess(res, transaction, 'تم تسجيل العملية بنجاح', 201);
});

export const listTransactions = catchAsync(async (req: Request, res: Response) => {
  const page = parseInt((req.query.page as string) || '1', 10);
  const limit = parseInt((req.query.limit as string) || '20', 10);

  const { items, total } = await transactionService.listTransactions({
    page,
    limit,
    type: req.query.type as string | undefined,
    search: req.query.search as string | undefined,
    from: req.query.from as string | undefined,
    to: req.query.to as string | undefined,
    sortBy: (req.query.sortBy as string) || 'transactionDate',
    sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
  });

  sendPaginated(res, items, page, limit, total);
});

export const getTransactionById = catchAsync(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const transaction = await transactionService.getTransactionById(id);
  sendSuccess(res, transaction);
});

export const updateTransaction = catchAsync(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const transaction = await transactionService.updateTransaction(id, req.body);
  sendSuccess(res, transaction, 'تم تحديث العملية بنجاح');
});

export const deleteTransaction = catchAsync(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  await transactionService.deleteTransaction(id, req.user!.id, req.ip);
  sendSuccess(res, null, 'تم حذف العملية وعكس تأثيرها على الخزينة بنجاح');
});
