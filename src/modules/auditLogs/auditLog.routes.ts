import { Router, Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { sendPaginated } from '../../utils/ApiResponse';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/role.middleware';
import { PrismaClient } from '@prisma/client';
import * as auditLogService from './auditLog.service';

const router = Router();

router.use(authenticate, authorize("ADMIN"));

router.get(
  '/',
  catchAsync(async (req: Request, res: Response) => {
    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '30', 10);
    const action = req.query.action as string | undefined;
    const userId = req.query.userId ? parseInt(req.query.userId as string, 10) : undefined;

    const { items, total } = await auditLogService.getAuditLogs({ page, limit, action, userId });
    sendPaginated(res, items, page, limit, total);
  })
);

router.delete(
  '/',
  catchAsync(async (req: Request, res: Response) => {
    await auditLogService.clearAuditLogs();
    res.json({ success: true, message: 'تم مسح سجل العمليات بنجاح' });
  })
);

export default router;
