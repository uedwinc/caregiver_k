import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { requireCareCircleMember, requireOwnerOrFamily, CareCircleRequest } from '../middleware/careCircle';

const router = Router();
router.use(authenticate);

const appointmentSchema = z.object({
  careCircleId: z.string(),
  careRecipientId: z.string(),
  title: z.string().min(1),
  providerName: z.string().optional(),
  locationName: z.string().optional(),
  address: z.string().optional(),
  startDateTime: z.string(),
  endDateTime: z.string().optional(),
  notes: z.string().optional(),
  prepChecklist: z.array(z.object({ text: z.string(), done: z.boolean() })).default([]),
  transportationNeeded: z.boolean().default(false),
});

const ridePlanSchema = z.object({
  driverMemberId: z.string(),
  pickupTime: z.string(),
  pickupLocation: z.string().optional(),
  dropoffLocation: z.string().optional(),
  instructions: z.string().optional(),
  backupDriverMemberId: z.string().optional(),
});

router.post('/', requireCareCircleMember, requireOwnerOrFamily, async (req: CareCircleRequest, res: Response): Promise<void> => {
  try {
    const data = appointmentSchema.parse(req.body);

    const recipient = await prisma.careRecipient.findFirst({
      where: { id: data.careRecipientId, careCircleId: req.careCircleId },
    });
    if (!recipient) { res.status(404).json({ error: 'Care recipient not found' }); return; }

    const appt = await prisma.appointment.create({
      data: {
        careRecipientId: data.careRecipientId,
        title: data.title,
        providerName: data.providerName,
        locationName: data.locationName,
        address: data.address,
        startDateTime: new Date(data.startDateTime),
        endDateTime: data.endDateTime ? new Date(data.endDateTime) : undefined,
        notes: data.notes,
        prepChecklist: data.prepChecklist,
        transportationNeeded: data.transportationNeeded,
        createdBy: req.userId!,
      },
    });

    res.status(201).json(appt);
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors }); return; }
    res.status(500).json({ error: 'Failed to create appointment' });
  }
});

router.get('/', requireCareCircleMember, async (req: CareCircleRequest, res: Response): Promise<void> => {
  try {
    const { careRecipientId, from, to } = req.query;

    const appts = await prisma.appointment.findMany({
      where: {
        careRecipientId: careRecipientId as string,
        careRecipient: { careCircleId: req.careCircleId },
        ...(from || to ? {
          startDateTime: {
            ...(from ? { gte: new Date(from as string) } : {}),
            ...(to ? { lte: new Date(to as string) } : {}),
          },
        } : {}),
      },
      include: { ridePlan: { include: { driver: true, backupDriver: true } } },
      orderBy: { startDateTime: 'asc' },
    });

    res.json(appts);
  } catch {
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

router.get('/:id', requireCareCircleMember, async (req: CareCircleRequest, res: Response): Promise<void> => {
  try {
    const appt = await prisma.appointment.findFirst({
      where: { id: req.params.id, careRecipient: { careCircleId: req.careCircleId } },
      include: { ridePlan: { include: { driver: true, backupDriver: true } } },
    });

    if (!appt) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(appt);
  } catch {
    res.status(500).json({ error: 'Failed to fetch appointment' });
  }
});

router.put('/:id', requireCareCircleMember, requireOwnerOrFamily, async (req: CareCircleRequest, res: Response): Promise<void> => {
  try {
    const appt = await prisma.appointment.findFirst({
      where: { id: req.params.id, careRecipient: { careCircleId: req.careCircleId } },
    });
    if (!appt) { res.status(404).json({ error: 'Not found' }); return; }

    const updated = await prisma.appointment.update({
      where: { id: req.params.id },
      data: {
        title: req.body.title,
        providerName: req.body.providerName,
        locationName: req.body.locationName,
        address: req.body.address,
        startDateTime: req.body.startDateTime ? new Date(req.body.startDateTime) : undefined,
        endDateTime: req.body.endDateTime ? new Date(req.body.endDateTime) : undefined,
        notes: req.body.notes,
        prepChecklist: req.body.prepChecklist,
        transportationNeeded: req.body.transportationNeeded,
        status: req.body.status,
      },
    });

    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Failed to update appointment' });
  }
});

// Create/update ride plan
router.post('/:id/ride-plan', requireCareCircleMember, requireOwnerOrFamily, async (req: CareCircleRequest, res: Response): Promise<void> => {
  try {
    const data = ridePlanSchema.parse(req.body);

    const appt = await prisma.appointment.findFirst({
      where: { id: req.params.id, careRecipient: { careCircleId: req.careCircleId } },
    });
    if (!appt) { res.status(404).json({ error: 'Appointment not found' }); return; }

    const ridePlan = await prisma.ridePlan.upsert({
      where: { appointmentId: req.params.id },
      create: {
        appointmentId: req.params.id,
        driverMemberId: data.driverMemberId,
        pickupTime: new Date(data.pickupTime),
        pickupLocation: data.pickupLocation,
        dropoffLocation: data.dropoffLocation,
        instructions: data.instructions,
        backupDriverMemberId: data.backupDriverMemberId,
      },
      update: {
        driverMemberId: data.driverMemberId,
        pickupTime: new Date(data.pickupTime),
        pickupLocation: data.pickupLocation,
        dropoffLocation: data.dropoffLocation,
        instructions: data.instructions,
        backupDriverMemberId: data.backupDriverMemberId,
      },
      include: { driver: true, backupDriver: true },
    });

    res.json(ridePlan);
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors }); return; }
    res.status(500).json({ error: 'Failed to save ride plan' });
  }
});

router.delete('/:id', requireCareCircleMember, requireOwnerOrFamily, async (req: CareCircleRequest, res: Response): Promise<void> => {
  try {
    await prisma.appointment.updateMany({
      where: { id: req.params.id, careRecipient: { careCircleId: req.careCircleId } },
      data: { status: 'canceled' },
    });
    res.json({ message: 'Appointment canceled' });
  } catch {
    res.status(500).json({ error: 'Failed to cancel appointment' });
  }
});

export default router;
