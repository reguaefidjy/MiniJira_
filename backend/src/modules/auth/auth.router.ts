import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import * as c from './auth.controller';

const router = Router();

router.post('/auth/callback',   c.callback);
router.post('/auth/refresh',    c.refresh);
router.post('/auth/logout',     authenticate, c.logout);
router.post('/auth/dev-login',  c.devLogin);
router.get('/me',               authenticate, c.me);

export default router;
