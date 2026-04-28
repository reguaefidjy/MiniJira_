import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import * as c from './admin.controller';

const router = Router();

router.post('/users',                authenticate, authorize('admin'), c.createUser);
router.patch('/users/:id',           authenticate, authorize('admin'), c.updateUser);
router.patch('/users/:id/deactivate',authenticate, authorize('admin'), c.deactivateUser);

export default router;
