import { Router } from 'express';
import * as treasuryController from './treasury.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/role.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { fundsSchema } from './treasury.validation';

const router = Router();

router.use(authenticate);

router.get('/balance', treasuryController.getBalance);
router.get('/dashboard', treasuryController.getDashboard);
router.post('/add-funds', authorize("ADMIN"), validate(fundsSchema), treasuryController.addFunds);
router.post('/remove-funds', authorize("ADMIN"), validate(fundsSchema), treasuryController.removeFunds);
router.post('/vault/add-funds', authorize("ADMIN"), validate(fundsSchema), treasuryController.addVaultFunds);
router.post('/vault/remove-funds', authorize("ADMIN"), validate(fundsSchema), treasuryController.removeVaultFunds);

export default router;
