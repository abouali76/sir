import { Router } from 'express';
import * as transactionController from './transaction.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/role.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  createTransactionSchema,
  updateTransactionSchema,
  transactionListQuerySchema,
} from './transaction.validation';
import { PrismaClient } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/', validate(transactionListQuerySchema), transactionController.listTransactions);
router.get('/:id', transactionController.getTransactionById);
router.post('/', validate(createTransactionSchema), transactionController.createTransaction);
router.patch('/:id', validate(updateTransactionSchema), transactionController.updateTransaction);

// تصفير شامل للمدير فقط
router.post('/wipe', authorize("ADMIN"), transactionController.wipeAllTransactions);

// الحذف للمدير فقط
router.delete('/:id', authorize("ADMIN"), transactionController.deleteTransaction);

export default router;
