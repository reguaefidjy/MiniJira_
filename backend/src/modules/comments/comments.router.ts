import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import * as c from './comments.controller';

const router = Router();

router.get('/tickets/:id/comments',     authenticate, c.list);
router.post('/tickets/:id/comments',    authenticate, c.create);
router.patch('/comments/:id/archive',   authenticate, c.archive);

export default router;
