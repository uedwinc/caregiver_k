import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { requireCareCircleMember, requireOwnerOrFamily, CareCircleRequest } from '../middleware/careCircle';

const router = Router();
router.use(authenticate);

const medSchema = z.object({
  careCircleId: z.string(),
  careRecipientId: z.string(),
  name: z.string().min(1),
  dosageText: z.string().optional(),
  instructions: z.string().optional(),
  scheduleType: z.enum(['daily', 'weekly', 'as_needed', 'custom']).default('daily'),
  timesPerDay: z.number().optional(),
  times: z.array(z.string()).default([]),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  pharmacyName: z.string().optional(),
  pharmacyPhone: z.string().optional(),
  refillThreshold: z.string().optional(),
  currentSupply: z.number().optional(),
  supplyUnit: z.string().optional(),
});

router.post('/', requireCareCircleMember, requireOwnerOrFamily, async (req: CareCircleRequest, res: Response): Promise<void> => {
  try {
    const data = medSchema.parse(req.body);

    // Verify recipient belongs to circle
    const recipient = await prisma.careRecipient.findFirst({
      where: { id: data.careRecipientId, careCircleId: req.careCircleId },
    });
    if (!recipient) { res.status(404).json({ error: 'Care recipient not found' }); return; }

    const med = await prisma.medication.create({
      data: {
        careRecipientId: data.careRecipientId,
        name: data.name,
        dosageText: data.dosageText,
        instructions: data.instructions,
        scheduleType: data.scheduleType,
        timesPerDay: data.timesPerDay,
        times: data.times,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        pharmacyName: data.pharmacyName,
        pharmacyPhone: data.pharmacyPhone,
        refillThreshold: data.refillThreshold,
        currentSupply: data.currentSupply,
        supplyUnit: data.supplyUnit,
        createdBy: req.userId!,
      },
    });

    res.status(201).json(med);
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors }); return; }
    res.status(500).json({ error: 'Failed to create medication' });
  }
});

router.get('/', requireCareCircleMember, async (req: CareCircleRequest, res: Response): Promise<void> => {
  try {
    const { careRecipientId } = req.query;

    const meds = await prisma.medication.findMany({
      where: {
        careRecipientId: careRecipientId as string,
        careRecipient: { careCircleId: req.careCircleId },
      },
      orderBy: [{ status: 'asc' }, { name: 'asc' }],
    });

    res.json(meds);
  } catch {
    res.status(500).json({ error: 'Failed to fetch medications' });
  }
});

router.get('/:id', requireCareCircleMember, async (req: CareCircleRequest, res: Response): Promise<void> => {
  try {
    const med = await prisma.medication.findFirst({
      where: {
        id: req.params.id,
        careRecipient: { careCircleId: req.careCircleId },
      },
      include: { logs: { orderBy: { createdAt: 'desc' }, take: 30 } },
    });

    if (!med) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(med);
  } catch {
    res.status(500).json({ error: 'Failed to fetch medication' });
  }
});

router.put('/:id', requireCareCircleMember, requireOwnerOrFamily, async (req: CareCircleRequest, res: Response): Promise<void> => {
  try {
    const med = await prisma.medication.findFirst({
      where: { id: req.params.id, careRecipient: { careCircleId: req.careCircleId } },
    });
    if (!med) { res.status(404).json({ error: 'Not found' }); return; }

    const updated = await prisma.medication.update({
      where: { id: req.params.id },
      data: {
        name: req.body.name,
        dosageText: req.body.dosageText,
        instructions: req.body.instructions,
        scheduleType: req.body.scheduleType,
        timesPerDay: req.body.timesPerDay,
        times: req.body.times,
        startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
        endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
        pharmacyName: req.body.pharmacyName,
        pharmacyPhone: req.body.pharmacyPhone,
        refillThreshold: req.body.refillThreshold,
        currentSupply: req.body.currentSupply,
        supplyUnit: req.body.supplyUnit,
        status: req.body.status,
      },
    });

    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Failed to update medication' });
  }
});

// Log medication action (taken/skipped/snoozed)
router.post('/:id/log', requireCareCircleMember, async (req: CareCircleRequest, res: Response): Promise<void> => {
  try {
    const schema = z.object({
      action: z.enum(['taken', 'skipped', 'snoozed']),
      scheduledFor: z.string().optional(),
      reason: z.string().optional(),
    });
    const data = schema.parse(req.body);

    const med = await prisma.medication.findFirst({
      where: { id: req.params.id, careRecipient: { careCircleId: req.careCircleId } },
    });
    if (!med) { res.status(404).json({ error: 'Not found' }); return; }

    const log = await prisma.medicationLog.create({
      data: {
        medicationId: req.params.id,
        action: data.action,
        scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : undefined,
        takenAt: data.action === 'taken' ? new Date() : undefined,
        skippedAt: data.action === 'skipped' ? new Date() : undefined,
        reason: data.reason,
        loggedBy: req.userId!,
      },
    });

    res.status(201).json(log);
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors }); return; }
    res.status(500).json({ error: 'Failed to log medication action' });
  }
});

router.delete('/:id', requireCareCircleMember, requireOwnerOrFamily, async (req: CareCircleRequest, res: Response): Promise<void> => {
  try {
    await prisma.medication.updateMany({
      where: { id: req.params.id, careRecipient: { careCircleId: req.careCircleId } },
      data: { status: 'inactive' },
    });
    res.json({ message: 'Medication deactivated' });
  } catch {
    res.status(500).json({ error: 'Failed to delete medication' });
  }
});

export default router;
