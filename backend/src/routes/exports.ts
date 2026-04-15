import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { requireCareCircleMember, requireOwner, CareCircleRequest } from '../middleware/careCircle';
import { generateCareLogPDF } from '../lib/pdfGenerator';

const router = Router();
router.use(authenticate);

// Export care log as PDF
router.get('/:careCircleId/:careRecipientId/care-log/pdf', requireCareCircleMember, requireOwner, async (req: CareCircleRequest, res: Response): Promise<void> => {
  try {
    // Check premium
    const sub = await prisma.subscription.findUnique({ where: { careCircleId: req.careCircleId } });
    if (sub?.plan === 'free') {
      res.status(402).json({ error: 'Exports require Premium plan.', code: 'UPGRADE_REQUIRED' });
      return;
    }

    const { days = '30' } = req.query;
    const daysNum = parseInt(days as string);
    const from = new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000);

    const [recipient, entries, tasks, medications] = await Promise.all([
      prisma.careRecipient.findFirst({
        where: { id: req.params.careRecipientId, careCircleId: req.careCircleId },
      }),
      prisma.careLogEntry.findMany({
        where: { careRecipientId: req.params.careRecipientId, createdAt: { gte: from } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.task.findMany({
        where: {
          careRecipientId: req.params.careRecipientId,
          status: 'done',
          completedAt: { gte: from },
        },
        orderBy: { completedAt: 'desc' },
      }),
      prisma.medication.findMany({
        where: { careRecipientId: req.params.careRecipientId },
        include: {
          logs: {
            where: { createdAt: { gte: from } },
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
    ]);

    if (!recipient) { res.status(404).json({ error: 'Recipient not found' }); return; }

    await prisma.auditEvent.create({
      data: {
        careCircleId: req.careCircleId!,
        careRecipientId: req.params.careRecipientId,
        actorUserId: req.userId!,
        eventType: 'download',
        entityType: 'care_log',
        entityId: req.params.careRecipientId,
        metadata: { format: 'pdf', days: daysNum },
      },
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="care-log-${recipient.fullName.replace(/\s+/g, '-')}.pdf"`);

    const pdfStream = generateCareLogPDF({ recipient, entries, tasks, medications, days: daysNum });
    pdfStream.pipe(res);
  } catch {
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// Export care log as CSV
router.get('/:careCircleId/:careRecipientId/care-log/csv', requireCareCircleMember, requireOwner, async (req: CareCircleRequest, res: Response): Promise<void> => {
  try {
    const sub = await prisma.subscription.findUnique({ where: { careCircleId: req.careCircleId } });
    if (sub?.plan === 'free') {
      res.status(402).json({ error: 'Exports require Premium plan.', code: 'UPGRADE_REQUIRED' });
      return;
    }

    const { days = '30' } = req.query;
    const from = new Date(Date.now() - parseInt(days as string) * 24 * 60 * 60 * 1000);

    const entries = await prisma.careLogEntry.findMany({
      where: { careRecipientId: req.params.careRecipientId, createdAt: { gte: from } },
      orderBy: { createdAt: 'desc' },
    });

    const csvRows = [
      ['Date', 'Type', 'Title', 'Body', 'Tags'].join(','),
      ...entries.map(e => [
        new Date(e.createdAt).toISOString(),
        e.type,
        `"${e.title.replace(/"/g, '""')}"`,
        `"${(e.body || '').replace(/"/g, '""')}"`,
        `"${(e.tags as string[]).join('; ')}"`,
      ].join(',')),
    ];

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="care-log.csv"`);
    res.send(csvRows.join('\n'));
  } catch {
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});

export default router;
