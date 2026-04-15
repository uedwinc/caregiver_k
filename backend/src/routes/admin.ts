import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate, requireAdmin);

// Dashboard stats
router.get('/stats', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [users, circles, recipients, activeShares] = await Promise.all([
      prisma.user.count(),
      prisma.careCircle.count(),
      prisma.careRecipient.count(),
      prisma.emergencyShareLink.count({ where: { disabled: false, expiresAt: { gt: new Date() } } }),
    ]);

    res.json({ users, circles, recipients, activeShares });
  } catch {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// List users
router.get('/users', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '20', search } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const users = await prisma.user.findMany({
      where: search ? {
        OR: [
          { email: { contains: search as string, mode: 'insensitive' } },
          { displayName: { contains: search as string, mode: 'insensitive' } },
        ],
      } : {},
      select: {
        id: true, email: true, displayName: true, isAdmin: true, createdAt: true,
        _count: { select: { careCircleMembers: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit as string),
    });

    res.json(users);
  } catch {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Disable share link
router.put('/share-links/:id/disable', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.emergencyShareLink.update({
      where: { id: req.params.id },
      data: { disabled: true },
    });
    res.json({ message: 'Share link disabled' });
  } catch {
    res.status(500).json({ error: 'Failed to disable share link' });
  }
});

// List all active share links
router.get('/share-links', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const links = await prisma.emergencyShareLink.findMany({
      where: { disabled: false },
      include: {
        emergencyCard: {
          include: { careRecipient: { select: { fullName: true, careCircleId: true } } },
        },
        accessLogs: { orderBy: { accessedAt: 'desc' }, take: 5 },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(links);
  } catch {
    res.status(500).json({ error: 'Failed to fetch share links' });
  }
});

// Global audit log
router.get('/audit', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '50' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const events = await prisma.auditEvent.findMany({
      include: { actor: { select: { displayName: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit as string),
    });

    res.json(events);
  } catch {
    res.status(500).json({ error: 'Failed to fetch audit events' });
  }
});

export default router;
