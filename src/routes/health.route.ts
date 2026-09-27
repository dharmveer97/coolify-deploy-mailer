import { Router } from 'express';
import { HEALTH_PATH } from '@/constants/routes';

export function createHealthRouter(): Router {
  const router = Router();
  router.get(HEALTH_PATH, (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });
  return router;
}
