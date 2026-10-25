import { Router } from 'express';
import * as c from '../controllers/monitors.js';
import { requireAuth } from '../middleware/auth.js';
import { checkNowLimiter } from '../middleware/rateLimit.js';
import { validate, validId } from '../middleware/validate.js';
import { monitorSchema, monitorPatchSchema } from '../validators/schemas.js';

const router = Router();
router.use(requireAuth);
router.param('id', validId);

router.get('/incidents', c.allIncidents); // must stay above '/:id'
router.get('/', c.listMonitors);
router.post('/', validate(monitorSchema), c.createMonitor);
router.get('/:id', c.getMonitor);
router.patch('/:id', validate(monitorPatchSchema), c.updateMonitor);
router.delete('/:id', c.deleteMonitor);
router.post('/:id/check', checkNowLimiter, c.checkNow);
router.get('/:id/series', c.monitorSeries);
router.get('/:id/checks', c.recentChecks);
router.get('/:id/incidents', c.monitorIncidents);
export default router;
