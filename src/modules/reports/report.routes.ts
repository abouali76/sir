import { Router } from 'express';
import * as reportController from './report.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/role.middleware';
import { PrismaClient } from '@prisma/client';

const router = Router();

// التقارير التفصيلية ومعاينة الأرباح: للمدير فقط (كما ورد في المتطلبات)
router.use(authenticate, authorize("ADMIN"));

router.get('/profit', reportController.getProfitReport);
router.get('/export/excel', reportController.exportExcel);
router.get('/export/pdf', reportController.exportPDF);

export default router;
