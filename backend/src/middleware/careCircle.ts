import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import prisma from '../lib/prisma';
import { MemberRole } from '@prisma/client';

export interface CareCircleRequest extends AuthRequest {
  careCircleId?: string;
  memberRole?: MemberRole;
  memberId?: string;
}

export const requireCareCircleMember = async (
  req: CareCircleRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const careCircleId = req.params.careCircleId || req.body.careCircleId || req.query.careCircleId as string;

    if (!careCircleId) {
      res.status(400).json({ error: 'Care circle ID required' });
      return;
    }

    const member = await prisma.careCircleMember.findFirst({
      where: {
        careCircleId,
        userId: req.userId!,
        status: 'active',
      },
    });

    if (!member) {
      res.status(403).json({ error: 'Not a member of this care circle' });
      return;
    }

    req.careCircleId = careCircleId;
    req.memberRole = member.role;
    req.memberId = member.id;
    next();
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
};

export const requireOwnerOrFamily = (
  req: CareCircleRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!['owner', 'family'].includes(req.memberRole || '')) {
    res.status(403).json({ error: 'Insufficient permissions' });
    return;
  }
  next();
};

export const requireOwner = (
  req: CareCircleRequest,
  res: Response,
  next: NextFunction
): void => {
  if (req.memberRole !== 'owner') {
    res.status(403).json({ error: 'Owner access required' });
    return;
  }
  next();
};
