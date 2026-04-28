import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import * as c from './tickets.controller';

const router = Router();

router.get('/',              authenticate, c.list);
router.post('/',             authenticate, c.create);
router.get('/:id',           authenticate, c.getOne);
router.patch('/:id',         authenticate, c.update);
router.patch('/:id/archive', authenticate, c.archive);

export default router;
