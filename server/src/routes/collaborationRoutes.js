import express from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../middleware/auth.js';
import { collaborationService as service } from '../services/collaborationService.js';
const router = express.Router();
router.use(requireAuth);
router.use(rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  keyGenerator: req => `${req.user.company_id}:${req.user.id}`,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { message: 'Please pause briefly before sending more project requests.' } }
}));
const handle = (action) => async (req, res, next) => {
  try {
    res.json({ data: await action(req) });
  } catch (error) {
    next(error);
  }
};
router.get(
  '/people',
  handle((req) => service.people(req.user)),
);
router.get(
  '/overview',
  handle((req) => service.overview(req.user)),
);
router.post(
  '/projects',
  handle((req) => service.create(req.user, req.body)),
);
router.get(
  '/projects/:id',
  handle((req) => service.detail(req.user, req.params.id)),
);
router.get(
  '/projects/:id/channels/:channel/messages',
  handle((req) =>
    service.messages(req.user, req.params.id, req.params.channel, req.query),
  ),
);
for (const action of ['members', 'channel', 'message', 'task', 'status'])
  router.post(
    `/projects/:id/${action}`,
    handle((req) => service.write(req.user, req.params.id, action, req.body)),
  );
router.post(
  '/notices/:id/read',
  handle((req) => service.markRead(req.user, req.params.id)),
);
export default router;
