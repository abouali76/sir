import { Router } from 'express';
import * as rateController from './exchangeRate.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/role.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { setExchangeRateSchema } from './exchangeRate.validation';

const router = Router();

router.use(authenticate);

router.get('/current', rateController.getCurrentRate);
router.get('/history', rateController.getRateHistory);
router.post('/', authorize("ADMIN"), validate(setExchangeRateSchema), rateController.setNewRate);
router.patch('/:id/toggle-active', authorize("ADMIN"), rateController.toggleActiveRate);
router.delete('/:id', authorize("ADMIN"), rateController.deleteRate);

export default router;
