import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import * as c from './labels.controller';

const router = Router();

router.get('/',     authenticate, c.list);
router.post('/',    authenticate, authorize('admin'), c.create);
router.patch('/:id',authenticate, authorize('admin'), c.update);
router.delete('/:id',authenticate, authorize('admin'), c.remove);

export default router;
