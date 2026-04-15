import { Router, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireCareCircleMember, requireOwner, CareCircleRequest } from '../middleware/careCircle';

const router = Router();
router.use(authenticate);

// Create care circle
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name } = z.object({ name: z.string().min(1) }).parse(req.body);

    const circle = await prisma.$transaction(async (tx) => {
      const cc = await tx.careCircle.create({
        data: { name, ownerUserId: req.userId! },
      });

      await tx.careCircleMember.create({
        data: {
          careCircleId: cc.id,
          userId: req.userId!,
          role: 'owner',
          status: 'active',
          displayName: req.user!.displayName,
        },
      });

      await tx.subscription.create({
        data: { careCircleId: cc.id, plan: 'free', status: 'active' },
      });

      return cc;
    });

    res.status(201).json(circle);
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors }); return; }
    res.status(500).json({ error: 'Failed to create care circle' });
  }
});

// List my care circles
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const memberships = await prisma.careCircleMember.findMany({
      where: { userId: req.userId!, status: 'active' },
      include: {
        careCircle: {
          include: {
            careRecipients: { select: { id: true, fullName: true, nickname: true } },
            subscription: true,
            _count: { select: { members: true } },
          },
        },
      },
    });

    res.json(memberships);
  } catch {
    res.status(500).json({ error: 'Failed to fetch care circles' });
  }
});

// Get single care circle
router.get('/:careCircleId', requireCareCircleMember, async (req: CareCircleRequest, res: Response): Promise<void> => {
  try {
    const circle = await prisma.careCircle.findUnique({
      where: { id: req.careCircleId },
      include: {
        members: {
          where: { status: 'active' },
          include: { user: { select: { id: true, email: true, avatarUrl: true } } },
        },
        careRecipients: true,
        subscription: true,
      },
    });

    res.json(circle);
  } catch {
    res.status(500).json({ error: 'Failed to fetch care circle' });
  }
});

// Update care circle
router.put('/:careCircleId', requireCareCircleMember, requireOwner, async (req: CareCircleRequest, res: Response): Promise<void> => {
  try {
    const { name } = req.body;
    const circle = await prisma.careCircle.update({
      where: { id: req.careCircleId },
      data: { name },
    });
    res.json(circle);
  } catch {
    res.status(500).json({ error: 'Failed to update care circle' });
  }
});

// Invite member
router.post('/:careCircleId/invite', requireCareCircleMember, requireOwner, async (req: CareCircleRequest, res: Response): Promise<void> => {
  try {
    const schema = z.object({
      emailOrPhone: z.string(),
      role: z.enum(['family', 'helper', 'advisor']),
    });
    const { emailOrPhone, role } = schema.parse(req.body);

    // Check subscription limits
    const sub = await prisma.subscription.findUnique({ where: { careCircleId: req.careCircleId } });
    if (sub?.plan === 'free') {
      const memberCount = await prisma.careCircleMember.count({
        where: { careCircleId: req.careCircleId!, status: 'active' },
      });
      if (memberCount >= 3) {
        res.status(402).json({ error: 'Free plan limited to 3 members. Upgrade to Premium.', code: 'UPGRADE_REQUIRED' });
        return;
      }
    }

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invitation = await prisma.invitation.create({
      data: {
        careCircleId: req.careCircleId!,
        emailOrPhone,
        role,
        invitedByUserId: req.userId!,
        token,
        expiresAt,
      },
    });

    const inviteUrl = `${process.env.FRONTEND_URL}/join/${token}`;
    res.status(201).json({ invitation, inviteUrl });
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors }); return; }
    res.status(500).json({ error: 'Failed to create invitation' });
  }
});

// Get invitation details (public)
router.get('/invitations/:token', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const invitation = await prisma.invitation.findUnique({
      where: { token: req.params.token },
      include: { careCircle: { select: { name: true } } },
    });

    if (!invitation) { res.status(404).json({ error: 'Invitation not found' }); return; }
    if (invitation.status !== 'pending') { res.status(410).json({ error: 'Invitation already used or expired' }); return; }
    if (invitation.expiresAt < new Date()) { res.status(410).json({ error: 'Invitation expired' }); return; }

    res.json({
      careCircleName: invitation.careCircle.name,
      role: invitation.role,
      emailOrPhone: invitation.emailOrPhone,
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch invitation' });
  }
});

// Update member role
router.put('/:careCircleId/members/:memberId', requireCareCircleMember, requireOwner, async (req: CareCircleRequest, res: Response): Promise<void> => {
  try {
    const { role, status } = req.body;
    const member = await prisma.careCircleMember.update({
      where: { id: req.params.memberId },
      data: { role, status },
    });
    res.json(member);
  } catch {
    res.status(500).json({ error: 'Failed to update member' });
  }
});

// Remove member
router.delete('/:careCircleId/members/:memberId', requireCareCircleMember, requireOwner, async (req: CareCircleRequest, res: Response): Promise<void> => {
  try {
    await prisma.careCircleMember.update({
      where: { id: req.params.memberId },
      data: { status: 'suspended' },
    });
    res.json({ message: 'Member removed' });
  } catch {
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

export default router;
