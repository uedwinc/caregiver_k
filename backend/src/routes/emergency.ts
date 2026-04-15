import { Router, Response, Request } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { requireCareCircleMember, requireOwner, CareCircleRequest } from '../middleware/careCircle';
import { generateEmergencyPDF } from '../lib/pdfGenerator';

const router = Router();

// Public emergency share access (no auth required)
router.get('/share/:token', async (req: Request, res: Response): Promise<void> => {
  try {
    const shareLink = await prisma.emergencyShareLink.findUnique({
      where: { token: req.params.token },
      include: {
        emergencyCard: {
          include: {
            careRecipient: {
              include: {
                documents: {
                  where: { pinnedToEmergency: true },
                  select: { id: true, title: true, category: true, fileUrl: true },
                },
                medications: {
                  where: { status: 'active' },
                  select: { name: true, dosageText: true, instructions: true },
                },
              },
            },
          },
        },
      },
    });

    if (!shareLink) { res.status(404).json({ error: 'Share link not found' }); return; }
    if (shareLink.disabled) { res.status(410).json({ error: 'This share link has been disabled' }); return; }
    if (shareLink.expiresAt < new Date()) { res.status(410).json({ error: 'Share link has expired' }); return; }

    // Log access
    await prisma.emergencyShareAccess.create({
      data: {
        shareLinkId: shareLink.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    });

    await prisma.auditEvent.create({
      data: {
        careCircleId: shareLink.emergencyCard.careRecipient.careCircleId,
        careRecipientId: shareLink.emergencyCard.careRecipientId,
        actorUserId: shareLink.createdByUserId,
        eventType: 'view',
        entityType: 'emergency',
        entityId: shareLink.id,
        metadata: { ip: req.ip, via: 'share_link' },
      },
    });

    res.json({
      emergencyCard: shareLink.emergencyCard,
      expiresAt: shareLink.expiresAt,
      recipientName: shareLink.emergencyCard.careRecipient.fullName,
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch emergency data' });
  }
});

// Verify share by 6-digit code
router.post('/share/verify-code', async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.body;

    const shareLink = await prisma.emergencyShareLink.findFirst({
      where: { code, disabled: false, expiresAt: { gt: new Date() } },
    });

    if (!shareLink) { res.status(404).json({ error: 'Invalid or expired code' }); return; }

    res.json({ token: shareLink.token });
  } catch {
    res.status(500).json({ error: 'Failed to verify code' });
  }
});

// All routes below require auth
router.use(authenticate);

// Get emergency card
router.get('/:careCircleId/:careRecipientId', requireCareCircleMember, async (req: CareCircleRequest, res: Response): Promise<void> => {
  try {
    const card = await prisma.emergencyCard.findFirst({
      where: {
        careRecipientId: req.params.careRecipientId,
        careRecipient: { careCircleId: req.careCircleId },
      },
      include: {
        careRecipient: {
          include: {
            medications: { where: { status: 'active' } },
            documents: { where: { pinnedToEmergency: true } },
          },
        },
      },
    });

    if (!card) { res.status(404).json({ error: 'Emergency card not found' }); return; }
    res.json(card);
  } catch {
    res.status(500).json({ error: 'Failed to fetch emergency card' });
  }
});

// Update emergency card
router.put('/:careCircleId/:careRecipientId', requireCareCircleMember, async (req: CareCircleRequest, res: Response): Promise<void> => {
  try {
    const card = await prisma.emergencyCard.updateMany({
      where: {
        careRecipientId: req.params.careRecipientId,
        careRecipient: { careCircleId: req.careCircleId },
      },
      data: {
        conditions: req.body.conditions,
        allergies: req.body.allergies,
        medicationsSummary: req.body.medicationsSummary,
        primaryDoctorName: req.body.primaryDoctorName,
        primaryDoctorPhone: req.body.primaryDoctorPhone,
        preferredHospital: req.body.preferredHospital,
        insuranceProvider: req.body.insuranceProvider,
        insuranceMemberId: req.body.insuranceMemberId,
        emergencyContacts: req.body.emergencyContacts,
      },
    });

    res.json(card);
  } catch {
    res.status(500).json({ error: 'Failed to update emergency card' });
  }
});

// Create share link
router.post('/:careCircleId/:careRecipientId/share', requireCareCircleMember, async (req: CareCircleRequest, res: Response): Promise<void> => {
  try {
    // Check premium for emergency share
    const sub = await prisma.subscription.findUnique({ where: { careCircleId: req.careCircleId } });
    if (sub?.plan === 'free') {
      res.status(402).json({ error: 'Emergency share requires Premium plan.', code: 'UPGRADE_REQUIRED' });
      return;
    }

    const schema = z.object({ durationHours: z.number().min(1).max(72).default(6) });
    const { durationHours } = schema.parse(req.body);

    const card = await prisma.emergencyCard.findFirst({
      where: {
        careRecipientId: req.params.careRecipientId,
        careRecipient: { careCircleId: req.careCircleId },
      },
    });
    if (!card) { res.status(404).json({ error: 'Emergency card not found' }); return; }

    const token = uuidv4();
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000);

    const shareLink = await prisma.emergencyShareLink.create({
      data: {
        emergencyCardId: card.id,
        token,
        code,
        expiresAt,
        createdByUserId: req.userId!,
      },
    });

    await prisma.auditEvent.create({
      data: {
        careCircleId: req.careCircleId!,
        careRecipientId: req.params.careRecipientId,
        actorUserId: req.userId!,
        eventType: 'share',
        entityType: 'emergency',
        entityId: shareLink.id,
        metadata: { durationHours, expiresAt },
      },
    });

    const shareUrl = `${process.env.FRONTEND_URL}/emergency/share/${token}`;
    res.status(201).json({ shareLink, shareUrl, code });
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors }); return; }
    res.status(500).json({ error: 'Failed to create share link' });
  }
});

// Generate emergency PDF
router.get('/:careCircleId/:careRecipientId/pdf', requireCareCircleMember, async (req: CareCircleRequest, res: Response): Promise<void> => {
  try {
    const card = await prisma.emergencyCard.findFirst({
      where: {
        careRecipientId: req.params.careRecipientId,
        careRecipient: { careCircleId: req.careCircleId },
      },
      include: {
        careRecipient: {
          include: {
            medications: { where: { status: 'active' } },
            documents: { where: { pinnedToEmergency: true } },
          },
        },
      },
    });

    if (!card) { res.status(404).json({ error: 'Emergency card not found' }); return; }

    await prisma.auditEvent.create({
      data: {
        careCircleId: req.careCircleId!,
        careRecipientId: req.params.careRecipientId,
        actorUserId: req.userId!,
        eventType: 'download',
        entityType: 'emergency',
        entityId: card.id,
        metadata: { format: 'pdf' },
      },
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="emergency-card-${card.careRecipient.fullName.replace(/\s+/g, '-')}.pdf"`);

    const pdfStream = generateEmergencyPDF(card);
    pdfStream.pipe(res);
  } catch {
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// Disable share link
router.delete('/:careCircleId/share-links/:linkId', requireCareCircleMember, requireOwner, async (req: CareCircleRequest, res: Response): Promise<void> => {
  try {
    await prisma.emergencyShareLink.update({
      where: { id: req.params.linkId },
      data: { disabled: true },
    });
    res.json({ message: 'Share link disabled' });
  } catch {
    res.status(500).json({ error: 'Failed to disable share link' });
  }
});

export default router;
