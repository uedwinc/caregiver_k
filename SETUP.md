# Caregiver Hub — Setup Guide

## Prerequisites

- Node.js 18+ ([nodejs.org](https://nodejs.org))
- PostgreSQL 14+ ([postgresql.org](https://www.postgresql.org/download/))
- npm or yarn

---

## Local Development Setup

### 1. Install Node.js

Download and install from https://nodejs.org (LTS version recommended).

### 2. Install PostgreSQL

Download from https://www.postgresql.org/download/ and create a database:

```sql
CREATE DATABASE caregiver_hub;
CREATE USER caregiver_user WITH PASSWORD 'yourpassword';
GRANT ALL PRIVILEGES ON DATABASE caregiver_hub TO caregiver_user;
```

### 3. Backend Setup

```bash
cd backend
npm install

# Copy and configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL and JWT_SECRET

# Generate Prisma client and run migrations
npm run db:generate
npm run db:migrate

# Seed with demo data (optional)
npm run db:seed

# Start development server
npm run dev
```

Backend runs on http://localhost:4000

### 4. Frontend Setup

```bash
cd frontend
npm install

# Start development server
npm run dev
```

Frontend runs on http://localhost:5173

---

## Demo Credentials

After seeding:
- **Demo user:** demo@caregiverhub.com / demo1234
- **Admin:** admin@caregiverhub.com / admin123!

---

## Production Build

### Backend
```bash
cd backend
npm run build
npm start
```

### Frontend
```bash
cd frontend
npm run build
# Serve the dist/ folder with nginx or a static host
```

---

## AWS Deployment

### Architecture

```
Route 53 → CloudFront → S3 (frontend static)
                      → ALB → ECS Fargate (backend API)
                                    ↓
                              RDS PostgreSQL
                              S3 (file uploads)
```

### Steps

#### 1. RDS PostgreSQL
- Create RDS PostgreSQL instance (db.t3.micro for dev, db.t3.medium+ for prod)
- Set `DATABASE_URL` in your environment/secrets

#### 2. Backend on ECS Fargate

Create a `Dockerfile` in `/backend`:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY prisma ./prisma
RUN npx prisma generate
COPY dist ./dist
EXPOSE 4000
CMD ["node", "dist/index.js"]
```

Build and push to ECR:
```bash
aws ecr create-repository --repository-name caregiver-hub-api
docker build -t caregiver-hub-api .
docker tag caregiver-hub-api:latest <account>.dkr.ecr.<region>.amazonaws.com/caregiver-hub-api:latest
docker push <account>.dkr.ecr.<region>.amazonaws.com/caregiver-hub-api:latest
```

Create ECS task definition and service with:
- Environment variables from AWS Secrets Manager
- ALB target group on port 4000

#### 3. Frontend on S3 + CloudFront

```bash
cd frontend
npm run build

# Create S3 bucket
aws s3 mb s3://caregiver-hub-frontend

# Upload build
aws s3 sync dist/ s3://caregiver-hub-frontend --delete

# Create CloudFront distribution pointing to S3
# Set default root object to index.html
# Add error page: 404 → /index.html (for SPA routing)
```

#### 4. File Uploads on S3

Update backend `.env`:
```
AWS_REGION=us-east-1
AWS_S3_BUCKET=caregiver-hub-uploads
```

Install AWS SDK in backend:
```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

Then update `documents.ts` to use S3 presigned URLs instead of local disk storage.

#### 5. Environment Variables (Production)

Store in AWS Secrets Manager or ECS task definition:
```
DATABASE_URL=postgresql://...
JWT_SECRET=<strong-random-secret>
NODE_ENV=production
FRONTEND_URL=https://yourdomain.com
AWS_S3_BUCKET=caregiver-hub-uploads
```

---

## Security Checklist

- [ ] Change JWT_SECRET to a strong random value
- [ ] Enable RDS encryption at rest
- [ ] Use HTTPS everywhere (ACM certificate on CloudFront/ALB)
- [ ] Set up VPC with private subnets for RDS
- [ ] Enable CloudTrail for AWS audit logging
- [ ] Set up WAF on CloudFront for rate limiting
- [ ] Enable S3 bucket versioning for uploads
- [ ] Configure CORS properly for production domain

---

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| DATABASE_URL | PostgreSQL connection string | Yes |
| JWT_SECRET | Secret for signing JWTs | Yes |
| JWT_EXPIRES_IN | Token expiry (default: 7d) | No |
| PORT | API port (default: 4000) | No |
| FRONTEND_URL | Frontend URL for CORS | Yes |
| UPLOAD_DIR | Local upload directory | No |
| AWS_S3_BUCKET | S3 bucket for uploads | Prod |
| AWS_REGION | AWS region | Prod |
| SMTP_HOST | Email server host | No |
| SMTP_USER | Email username | No |
| SMTP_PASS | Email password | No |
