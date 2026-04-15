import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { unreadOnly } = req.query;

    const notifications = await prisma.notification.findMany({
      where: {
        userId: req.userId!,
        ...(unreadOnly === 'true' ? { readAt: null } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json(notifications);
  } catch {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

router.put('/:id/read', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.userId! },
      data: { readAt: new Date() },
    });
    res.json({ message: 'Marked as read' });
  } catch {
    res.status(500).json({ error: 'Failed to mark notification' });
  }
});

router.put('/read-all', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.userId!, readAt: null },
      data: { readAt: new Date() },
    });
    res.json({ message: 'All marked as read' });
  } catch {
    res.status(500).json({ error: 'Failed to mark notifications' });
  }
});

router.get('/unread-count', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const count = await prisma.notification.count({
      where: { userId: req.userId!, readAt: null },
    });
    res.json({ count });
  } catch {
    res.status(500).json({ error: 'Failed to get count' });
  }
});

export default router;
