import { Router } from 'express';
import * as userController from './user.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/role.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { createUserSchema, updateUserSchema, userIdParamSchema } from './user.validation';
import { PrismaClient, User } from '@prisma/client';

const router = Router();

// كل مسارات هذه الوحدة تخص المدير فقط
router.use(authenticate, authorize("ADMIN"));

router.get('/', userController.getAllUsers);
router.post('/', validate(createUserSchema), userController.createUser);
router.patch('/:id', validate(updateUserSchema), userController.updateUser);
router.delete('/:id', validate(userIdParamSchema), userController.deleteUser);

export default router;
