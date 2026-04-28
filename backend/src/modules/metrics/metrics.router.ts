import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import * as c from './metrics.controller';

const router = Router();

router.get('/',       authenticate, c.snapshot);
router.get('/export', authenticate, c.exportCsv);

export default router;
