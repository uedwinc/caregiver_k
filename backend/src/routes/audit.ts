import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { requireCareCircleMember, requireOwner, CareCircleRequest } from '../middleware/careCircle';

const router = Router();
router.use(authenticate);

router.get('/:careCircleId', requireCareCircleMember, requireOwner, async (req: CareCircleRequest, res: Response): Promise<void> => {
  try {
    const { careRecipientId, entityType, from, to, page = '1', limit = '50' } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [events, total] = await Promise.all([
      prisma.auditEvent.findMany({
        where: {
          careCircleId: req.careCircleId,
          ...(careRecipientId ? { careRecipientId: careRecipientId as string } : {}),
          ...(entityType ? { entityType: entityType as string } : {}),
          ...(from || to ? {
            createdAt: {
              ...(from ? { gte: new Date(from as string) } : {}),
              ...(to ? { lte: new Date(to as string) } : {}),
            },
          } : {}),
        },
        include: {
          actor: { select: { displayName: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit as string),
      }),
      prisma.auditEvent.count({
        where: {
          careCircleId: req.careCircleId,
          ...(careRecipientId ? { careRecipientId: careRecipientId as string } : {}),
          ...(entityType ? { entityType: entityType as string } : {}),
        },
      }),
    ]);

    res.json({ events, total, page: parseInt(page as string), limit: parseInt(limit as string) });
  } catch {
    res.status(500).json({ error: 'Failed to fetch audit events' });
  }
});

export default router;
