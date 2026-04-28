import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import * as c from './users.controller';

const router = Router();

router.get('/', authenticate, c.list);

export default router;
