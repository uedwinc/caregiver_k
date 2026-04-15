import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { requireCareCircleMember, CareCircleRequest } from '../middleware/careCircle';

const router = Router();
router.use(authenticate);

const taskSchema = z.object({
  careCircleId: z.string(),
  careRecipientId: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  dueDateTime: z.string().optional(),
  recurrenceRule: z.enum(['none', 'daily', 'weekly', 'monthly', 'custom']).default('none'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  checklistItems: z.array(z.object({ text: z.string(), done: z.boolean() })).default([]),
  ownerMemberId: z.string().optional(),
  backupMemberId: z.string().optional(),
});

router.post('/', requireCareCircleMember, async (req: CareCircleRequest, res: Response): Promise<void> => {
  try {
    const data = taskSchema.parse(req.body);

    const recipient = await prisma.careRecipient.findFirst({
      where: { id: data.careRecipientId, careCircleId: req.careCircleId },
    });
    if (!recipient) { res.status(404).json({ error: 'Care recipient not found' }); return; }

    const task = await prisma.task.create({
      data: {
        careRecipientId: data.careRecipientId,
        title: data.title,
        description: data.description,
        dueDateTime: data.dueDateTime ? new Date(data.dueDateTime) : undefined,
        recurrenceRule: data.recurrenceRule,
        priority: data.priority,
        checklistItems: data.checklistItems,
        ownerMemberId: data.ownerMemberId,
        backupMemberId: data.backupMemberId,
        createdBy: req.userId!,
      },
      include: {
        owner: { select: { displayName: true, userId: true } },
        backup: { select: { displayName: true, userId: true } },
      },
    });

    res.status(201).json(task);
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors }); return; }
    res.status(500).json({ error: 'Failed to create task' });
  }
});

router.get('/', requireCareCircleMember, async (req: CareCircleRequest, res: Response): Promise<void> => {
  try {
    const { careRecipientId, status, priority } = req.query;

    const tasks = await prisma.task.findMany({
      where: {
        careRecipientId: careRecipientId as string,
        careRecipient: { careCircleId: req.careCircleId },
        ...(status ? { status: status as any } : {}),
        ...(priority ? { priority: priority as any } : {}),
      },
      include: {
        owner: { select: { displayName: true, userId: true } },
        backup: { select: { displayName: true, userId: true } },
      },
      orderBy: [{ priority: 'desc' }, { dueDateTime: 'asc' }, { createdAt: 'desc' }],
    });

    res.json(tasks);
  } catch {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

router.get('/:id', requireCareCircleMember, async (req: CareCircleRequest, res: Response): Promise<void> => {
  try {
    const task = await prisma.task.findFirst({
      where: { id: req.params.id, careRecipient: { careCircleId: req.careCircleId } },
      include: {
        owner: { select: { displayName: true, userId: true } },
        backup: { select: { displayName: true, userId: true } },
      },
    });

    if (!task) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(task);
  } catch {
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

router.put('/:id', requireCareCircleMember, async (req: CareCircleRequest, res: Response): Promise<void> => {
  try {
    const task = await prisma.task.findFirst({
      where: { id: req.params.id, careRecipient: { careCircleId: req.careCircleId } },
    });
    if (!task) { res.status(404).json({ error: 'Not found' }); return; }

    const isCompleting = req.body.status === 'done' && task.status !== 'done';

    const updated = await prisma.task.update({
      where: { id: req.params.id },
      data: {
        title: req.body.title,
        description: req.body.description,
        dueDateTime: req.body.dueDateTime ? new Date(req.body.dueDateTime) : undefined,
        recurrenceRule: req.body.recurrenceRule,
        priority: req.body.priority,
        status: req.body.status,
        checklistItems: req.body.checklistItems,
        ownerMemberId: req.body.ownerMemberId,
        backupMemberId: req.body.backupMemberId,
        completionNote: req.body.completionNote,
        completedAt: isCompleting ? new Date() : undefined,
      },
      include: {
        owner: { select: { displayName: true } },
        backup: { select: { displayName: true } },
      },
    });

    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Failed to update task' });
  }
});

router.delete('/:id', requireCareCircleMember, async (req: CareCircleRequest, res: Response): Promise<void> => {
  try {
    await prisma.task.deleteMany({
      where: { id: req.params.id, careRecipient: { careCircleId: req.careCircleId } },
    });
    res.json({ message: 'Task deleted' });
  } catch {
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

export default router;
