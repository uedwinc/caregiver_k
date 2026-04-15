import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(1).max(100),
  phone: z.string().optional(),
  inviteToken: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const data = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        displayName: data.displayName,
        phone: data.phone,
      },
      select: { id: true, email: true, displayName: true, phone: true, createdAt: true },
    });

    // Handle invite token
    if (data.inviteToken) {
      const invitation = await prisma.invitation.findUnique({
        where: { token: data.inviteToken },
      });

      if (invitation && invitation.status === 'pending' && invitation.expiresAt > new Date()) {
        await prisma.careCircleMember.create({
          data: {
            careCircleId: invitation.careCircleId,
            userId: user.id,
            role: invitation.role,
            status: 'active',
            displayName: data.displayName,
            phone: data.phone,
          },
        });

        await prisma.invitation.update({
          where: { id: invitation.id },
          data: { status: 'accepted' },
        });
      }
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({ user, token });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
      return;
    }
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const data = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const valid = await bcrypt.compare(data.password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        isAdmin: user.isAdmin,
      },
      token,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
      return;
    }
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        phone: true,
        avatarUrl: true,
        isAdmin: true,
        createdAt: true,
        careCircleMembers: {
          where: { status: 'active' },
          include: { careCircle: true },
        },
      },
    });

    res.json(user);
  } catch {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

router.put('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { displayName, phone } = req.body;

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { displayName, phone },
      select: { id: true, email: true, displayName: true, phone: true, avatarUrl: true },
    });

    res.json(user);
  } catch {
    res.status(500).json({ error: 'Update failed' });
  }
});

router.post('/change-password', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) { res.status(401).json({ error: 'Current password incorrect' }); return; }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: req.userId }, data: { passwordHash } });

    res.json({ message: 'Password updated' });
  } catch {
    res.status(500).json({ error: 'Failed to change password' });
  }
});

export default router;
