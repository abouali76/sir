import { Router } from 'express';
import * as treasuryController from './treasury.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/role.middleware';

const router = Router();

router.use(authenticate);

router.get('/balance', treasuryController.getBalance);
router.get('/dashboard', treasuryController.getDashboard);
router.post('/add-funds', authorize("ADMIN"), treasuryController.addFunds);
router.post('/remove-funds', authorize("ADMIN"), treasuryController.removeFunds);
router.post('/vault/add-funds', authorize("ADMIN"), treasuryController.addVaultFunds);
router.post('/vault/remove-funds', authorize("ADMIN"), treasuryController.removeVaultFunds);

export default router;
