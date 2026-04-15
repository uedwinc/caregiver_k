import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { requireCareCircleMember, requireOwnerOrFamily, CareCircleRequest } from '../middleware/careCircle';

const router = Router();
router.use(authenticate);

const recipientSchema = z.object({
  careCircleId: z.string(),
  fullName: z.string().min(1),
  nickname: z.string().optional(),
  dob: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  mobilityNotes: z.string().optional(),
});

router.post('/', requireCareCircleMember, requireOwnerOrFamily, async (req: CareCircleRequest, res: Response): Promise<void> => {
  try {
    const data = recipientSchema.parse(req.body);

    // Check free plan limit
    const sub = await prisma.subscription.findUnique({ where: { careCircleId: req.careCircleId } });
    if (sub?.plan === 'free') {
      const count = await prisma.careRecipient.count({ where: { careCircleId: req.careCircleId! } });
      if (count >= 1) {
        res.status(402).json({ error: 'Free plan limited to 1 care recipient. Upgrade to Premium.', code: 'UPGRADE_REQUIRED' });
        return;
      }
    }

    const recipient = await prisma.careRecipient.create({
      data: {
        careCircleId: req.careCircleId!,
        fullName: data.fullName,
        nickname: data.nickname,
        dob: data.dob ? new Date(data.dob) : undefined,
        address: data.address,
        notes: data.notes,
        mobilityNotes: data.mobilityNotes,
      },
    });

    // Create empty emergency card
    await prisma.emergencyCard.create({
      data: { careRecipientId: recipient.id },
    });

    res.status(201).json(recipient);
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors }); return; }
    res.status(500).json({ error: 'Failed to create care recipient' });
  }
});

router.get('/', requireCareCircleMember, async (req: CareCircleRequest, res: Response): Promise<void> => {
  try {
    const recipients = await prisma.careRecipient.findMany({
      where: { careCircleId: req.careCircleId },
      include: { emergencyCard: true },
    });
    res.json(recipients);
  } catch {
    res.status(500).json({ error: 'Failed to fetch recipients' });
  }
});

router.get('/:id', requireCareCircleMember, async (req: CareCircleRequest, res: Response): Promise<void> => {
  try {
    const recipient = await prisma.careRecipient.findFirst({
      where: { id: req.params.id, careCircleId: req.careCircleId },
      include: { emergencyCard: true },
    });

    if (!recipient) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(recipient);
  } catch {
    res.status(500).json({ error: 'Failed to fetch recipient' });
  }
});

router.put('/:id', requireCareCircleMember, requireOwnerOrFamily, async (req: CareCircleRequest, res: Response): Promise<void> => {
  try {
    const { fullName, nickname, dob, address, notes, mobilityNotes } = req.body;

    const recipient = await prisma.careRecipient.updateMany({
      where: { id: req.params.id, careCircleId: req.careCircleId },
      data: {
        fullName,
        nickname,
        dob: dob ? new Date(dob) : undefined,
        address,
        notes,
        mobilityNotes,
      },
    });

    res.json(recipient);
  } catch {
    res.status(500).json({ error: 'Failed to update recipient' });
  }
});

// Today view - aggregated data for a recipient
router.get('/:id/today', requireCareCircleMember, async (req: CareCircleRequest, res: Response): Promise<void> => {
  try {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const [medications, appointments, tasks, urgentTasks] = await Promise.all([
      prisma.medication.findMany({
        where: { careRecipientId: req.params.id, status: 'active' },
        orderBy: { name: 'asc' },
      }),
      prisma.appointment.findMany({
        where: {
          careRecipientId: req.params.id,
          startDateTime: { gte: now, lte: tomorrow },
          status: 'scheduled',
        },
        include: { ridePlan: true },
        orderBy: { startDateTime: 'asc' },
      }),
      prisma.task.findMany({
        where: {
          careRecipientId: req.params.id,
          status: { in: ['open', 'in_progress'] },
          dueDateTime: { lte: tomorrow },
        },
        include: {
          owner: { select: { displayName: true } },
        },
        orderBy: [{ priority: 'desc' }, { dueDateTime: 'asc' }],
      }),
      prisma.task.findMany({
        where: {
          careRecipientId: req.params.id,
          priority: 'urgent',
          status: { in: ['open', 'in_progress'] },
        },
      }),
    ]);

    // Check refill alerts
    const refillAlerts = medications.filter(m => {
      if (!m.currentSupply || !m.refillThreshold) return false;
      const threshold = parseFloat(m.refillThreshold);
      return !isNaN(threshold) && m.currentSupply <= threshold;
    });

    res.json({
      medications,
      appointments,
      tasks,
      urgentTasks,
      refillAlerts,
      generatedAt: now,
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch today view' });
  }
});

export default router;
