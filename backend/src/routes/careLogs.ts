import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { requireCareCircleMember, CareCircleRequest } from '../middleware/careCircle';

const router = Router();
router.use(authenticate);

const logSchema = z.object({
  careCircleId: z.string(),
  careRecipientId: z.string(),
  type: z.enum(['note', 'symptom', 'vitals', 'med_change', 'incident', 'appointment_summary', 'insurance']),
  title: z.string().min(1),
  body: z.string().optional(),
  tags: z.array(z.string()).default([]),
  visibility: z.string().default('circle'),
});

router.post('/', requireCareCircleMember, async (req: CareCircleRequest, res: Response): Promise<void> => {
  try {
    const data = logSchema.parse(req.body);

    const recipient = await prisma.careRecipient.findFirst({
      where: { id: data.careRecipientId, careCircleId: req.careCircleId },
    });
    if (!recipient) { res.status(404).json({ error: 'Care recipient not found' }); return; }

    const entry = await prisma.careLogEntry.create({
      data: {
        careRecipientId: data.careRecipientId,
        type: data.type,
        title: data.title,
        body: data.body,
        tags: data.tags,
        visibility: data.visibility,
        createdBy: req.userId!,
      },
    });

    res.status(201).json(entry);
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors }); return; }
    res.status(500).json({ error: 'Failed to create log entry' });
  }
});

router.get('/', requireCareCircleMember, async (req: CareCircleRequest, res: Response): Promise<void> => {
  try {
    const { careRecipientId, type, from, to, tag } = req.query;

    const entries = await prisma.careLogEntry.findMany({
      where: {
        careRecipientId: careRecipientId as string,
        careRecipient: { careCircleId: req.careCircleId },
        ...(type ? { type: type as any } : {}),
        ...(from || to ? {
          createdAt: {
            ...(from ? { gte: new Date(from as string) } : {}),
            ...(to ? { lte: new Date(to as string) } : {}),
          },
        } : {}),
        ...(tag ? { tags: { array_contains: tag } } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(entries);
  } catch {
    res.status(500).json({ error: 'Failed to fetch log entries' });
  }
});

router.get('/:id', requireCareCircleMember, async (req: CareCircleRequest, res: Response): Promise<void> => {
  try {
    const entry = await prisma.careLogEntry.findFirst({
      where: { id: req.params.id, careRecipient: { careCircleId: req.careCircleId } },
    });

    if (!entry) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(entry);
  } catch {
    res.status(500).json({ error: 'Failed to fetch log entry' });
  }
});

router.put('/:id', requireCareCircleMember, async (req: CareCircleRequest, res: Response): Promise<void> => {
  try {
    const entry = await prisma.careLogEntry.findFirst({
      where: { id: req.params.id, careRecipient: { careCircleId: req.careCircleId } },
    });
    if (!entry) { res.status(404).json({ error: 'Not found' }); return; }

    // Only creator or owner/family can edit
    if (entry.createdBy !== req.userId && !['owner', 'family'].includes(req.memberRole || '')) {
      res.status(403).json({ error: 'Cannot edit this entry' });
      return;
    }

    const updated = await prisma.careLogEntry.update({
      where: { id: req.params.id },
      data: {
        title: req.body.title,
        body: req.body.body,
        tags: req.body.tags,
        visibility: req.body.visibility,
      },
    });

    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Failed to update log entry' });
  }
});

router.delete('/:id', requireCareCircleMember, async (req: CareCircleRequest, res: Response): Promise<void> => {
  try {
    const entry = await prisma.careLogEntry.findFirst({
      where: { id: req.params.id, careRecipient: { careCircleId: req.careCircleId } },
    });
    if (!entry) { res.status(404).json({ error: 'Not found' }); return; }

    if (entry.createdBy !== req.userId && !['owner', 'family'].includes(req.memberRole || '')) {
      res.status(403).json({ error: 'Cannot delete this entry' });
      return;
    }

    await prisma.careLogEntry.delete({ where: { id: req.params.id } });
    res.json({ message: 'Entry deleted' });
  } catch {
    res.status(500).json({ error: 'Failed to delete log entry' });
  }
});

export default router;
