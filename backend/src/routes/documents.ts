import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { requireCareCircleMember, requireOwnerOrFamily, CareCircleRequest } from '../middleware/careCircle';

const router = Router();
router.use(authenticate);

const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB || '10')) * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|pdf|doc|docx|txt|csv/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext || mime) cb(null, true);
    else cb(new Error('File type not allowed'));
  },
});

router.post('/upload', requireCareCircleMember, requireOwnerOrFamily, upload.single('file'), async (req: CareCircleRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) { res.status(400).json({ error: 'No file uploaded' }); return; }

    const schema = z.object({
      careRecipientId: z.string(),
      category: z.enum(['ID', 'Insurance', 'POA', 'Medical', 'Discharge', 'Other']),
      title: z.string().min(1),
      sensitivityLevel: z.enum(['normal', 'sensitive']).default('normal'),
      pinnedToEmergency: z.string().optional(),
    });

    const data = schema.parse(req.body);

    const recipient = await prisma.careRecipient.findFirst({
      where: { id: data.careRecipientId, careCircleId: req.careCircleId },
    });
    if (!recipient) { res.status(404).json({ error: 'Care recipient not found' }); return; }

    const fileUrl = `/uploads/${req.file.filename}`;

    const doc = await prisma.document.create({
      data: {
        careRecipientId: data.careRecipientId,
        category: data.category,
        title: data.title,
        fileUrl,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        uploadedBy: req.userId!,
        sensitivityLevel: data.sensitivityLevel,
        pinnedToEmergency: data.pinnedToEmergency === 'true',
      },
    });

    // Log audit event
    await prisma.auditEvent.create({
      data: {
        careCircleId: req.careCircleId!,
        careRecipientId: data.careRecipientId,
        actorUserId: req.userId!,
        eventType: 'create',
        entityType: 'document',
        entityId: doc.id,
        metadata: { title: doc.title, category: doc.category },
      },
    });

    res.status(201).json(doc);
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors }); return; }
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

router.get('/', requireCareCircleMember, async (req: CareCircleRequest, res: Response): Promise<void> => {
  try {
    const { careRecipientId, category } = req.query;

    const docs = await prisma.document.findMany({
      where: {
        careRecipientId: careRecipientId as string,
        careRecipient: { careCircleId: req.careCircleId },
        ...(category ? { category: category as any } : {}),
      },
      include: { accessRules: true },
      orderBy: { uploadedAt: 'desc' },
    });

    // Filter sensitive docs based on role
    const filtered = docs.filter(doc => {
      if (doc.sensitivityLevel === 'normal') return true;
      if (['owner', 'family'].includes(req.memberRole || '')) return true;

      // Check member-specific access
      const hasAccess = doc.accessRules.some(rule => {
        if (rule.accessType === 'role_based' && rule.allowedRole === req.memberRole) return true;
        if (rule.accessType === 'member_specific' && rule.allowedMemberId === req.memberId) return true;
        return false;
      });

      return hasAccess;
    });

    res.json(filtered);
  } catch {
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

router.get('/:id', requireCareCircleMember, async (req: CareCircleRequest, res: Response): Promise<void> => {
  try {
    const doc = await prisma.document.findFirst({
      where: { id: req.params.id, careRecipient: { careCircleId: req.careCircleId } },
      include: { accessRules: true },
    });

    if (!doc) { res.status(404).json({ error: 'Not found' }); return; }

    // Check access for sensitive docs
    if (doc.sensitivityLevel === 'sensitive' && !['owner', 'family'].includes(req.memberRole || '')) {
      const hasAccess = doc.accessRules.some(rule =>
        (rule.accessType === 'role_based' && rule.allowedRole === req.memberRole) ||
        (rule.accessType === 'member_specific' && rule.allowedMemberId === req.memberId)
      );
      if (!hasAccess) {
        res.status(403).json({ error: 'Access denied to sensitive document' });
        return;
      }
    }

    // Log view
    await prisma.auditEvent.create({
      data: {
        careCircleId: req.careCircleId!,
        actorUserId: req.userId!,
        eventType: 'view',
        entityType: 'document',
        entityId: doc.id,
        metadata: { title: doc.title },
      },
    });

    res.json(doc);
  } catch {
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

// Set document access rules
router.post('/:id/access', requireCareCircleMember, requireOwnerOrFamily, async (req: CareCircleRequest, res: Response): Promise<void> => {
  try {
    const schema = z.object({
      rules: z.array(z.object({
        accessType: z.enum(['role_based', 'member_specific']),
        allowedRole: z.string().optional(),
        allowedMemberId: z.string().optional(),
      })),
    });

    const { rules } = schema.parse(req.body);

    // Delete existing rules and recreate
    await prisma.documentAccess.deleteMany({ where: { documentId: req.params.id } });

    const created = await prisma.documentAccess.createMany({
      data: rules.map(r => ({
        documentId: req.params.id,
        accessType: r.accessType,
        allowedRole: r.allowedRole as any,
        allowedMemberId: r.allowedMemberId,
      })),
    });

    res.json({ created: created.count });
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors }); return; }
    res.status(500).json({ error: 'Failed to set access rules' });
  }
});

router.put('/:id', requireCareCircleMember, requireOwnerOrFamily, async (req: CareCircleRequest, res: Response): Promise<void> => {
  try {
    const doc = await prisma.document.updateMany({
      where: { id: req.params.id, careRecipient: { careCircleId: req.careCircleId } },
      data: {
        title: req.body.title,
        category: req.body.category,
        sensitivityLevel: req.body.sensitivityLevel,
        pinnedToEmergency: req.body.pinnedToEmergency,
      },
    });
    res.json(doc);
  } catch {
    res.status(500).json({ error: 'Failed to update document' });
  }
});

router.delete('/:id', requireCareCircleMember, requireOwnerOrFamily, async (req: CareCircleRequest, res: Response): Promise<void> => {
  try {
    const doc = await prisma.document.findFirst({
      where: { id: req.params.id, careRecipient: { careCircleId: req.careCircleId } },
    });
    if (!doc) { res.status(404).json({ error: 'Not found' }); return; }

    // Delete file from disk
    const filePath = path.join(process.cwd(), doc.fileUrl);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await prisma.document.delete({ where: { id: req.params.id } });
    res.json({ message: 'Document deleted' });
  } catch {
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

export default router;
