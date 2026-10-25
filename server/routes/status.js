import { Router } from 'express';
import { getSettings, publicStatus, updateSettings } from '../controllers/status.js';
import { requireAuth } from '../middleware/auth.js';
import { statusLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { statusPageSchema } from '../validators/schemas.js';

const router = Router();
router.get('/status-page', requireAuth, getSettings);
router.patch('/status-page', requireAuth, validate(statusPageSchema), updateSettings);
router.get('/status/:slug', statusLimiter, publicStatus); // public
export default router;
