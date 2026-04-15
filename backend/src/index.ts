import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

import authRoutes from './routes/auth';
import careCircleRoutes from './routes/careCircles';
import careRecipientRoutes from './routes/careRecipients';
import medicationRoutes from './routes/medications';
import appointmentRoutes from './routes/appointments';
import taskRoutes from './routes/tasks';
import documentRoutes from './routes/documents';
import careLogRoutes from './routes/careLogs';
import emergencyRoutes from './routes/emergency';
import notificationRoutes from './routes/notifications';
import auditRoutes from './routes/audit';
import adminRoutes from './routes/admin';
import exportRoutes from './routes/exports';

const app = express();
const PORT = process.env.PORT || 4000;

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/care-circles', careCircleRoutes);
app.use('/api/care-recipients', careRecipientRoutes);
app.use('/api/medications', medicationRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/care-logs', careLogRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/exports', exportRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Caregiver Hub API running on port ${PORT}`);
});

export default app;
