import prisma from './lib/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminHash = await bcrypt.hash('admin123!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@caregiverhub.com' },
    update: {},
    create: {
      email: 'admin@caregiverhub.com',
      passwordHash: adminHash,
      displayName: 'Admin',
      isAdmin: true,
    },
  });

  // Create demo user
  const demoHash = await bcrypt.hash('demo1234', 12);
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@caregiverhub.com' },
    update: {},
    create: {
      email: 'demo@caregiverhub.com',
      passwordHash: demoHash,
      displayName: 'Jane Smith',
    },
  });

  // Create care circle
  const circle = await prisma.careCircle.upsert({
    where: { id: 'demo-circle-1' },
    update: {},
    create: {
      id: 'demo-circle-1',
      name: 'The Smith Family',
      ownerUserId: demoUser.id,
    },
  });

  // Add member
  await prisma.careCircleMember.upsert({
    where: { careCircleId_userId: { careCircleId: circle.id, userId: demoUser.id } },
    update: {},
    create: {
      careCircleId: circle.id,
      userId: demoUser.id,
      role: 'owner',
      status: 'active',
      displayName: 'Jane Smith',
    },
  });

  // Create subscription
  await prisma.subscription.upsert({
    where: { careCircleId: circle.id },
    update: {},
    create: {
      careCircleId: circle.id,
      plan: 'premium',
      status: 'active',
    },
  });

  // Create care recipient
  const recipient = await prisma.careRecipient.upsert({
    where: { id: 'demo-recipient-1' },
    update: {},
    create: {
      id: 'demo-recipient-1',
      careCircleId: circle.id,
      fullName: 'Margaret Smith',
      nickname: 'Mom',
      dob: new Date('1945-03-15'),
      address: '456 Oak Street, Springfield, IL 62701',
      notes: 'Prefers morning appointments. Has difficulty with stairs.',
      mobilityNotes: 'Uses a walker. Needs extra time.',
    },
  });

  // Create emergency card
  await prisma.emergencyCard.upsert({
    where: { careRecipientId: recipient.id },
    update: {},
    create: {
      careRecipientId: recipient.id,
      conditions: 'Type 2 Diabetes, Hypertension, Mild Cognitive Impairment',
      allergies: 'Penicillin (severe), Shellfish',
      primaryDoctorName: 'Dr. Robert Chen',
      primaryDoctorPhone: '(217) 555-0100',
      preferredHospital: 'Springfield Memorial Hospital',
      insuranceProvider: 'Blue Cross Blue Shield',
      insuranceMemberId: 'BCBS-123456789',
      emergencyContacts: [
        { name: 'Jane Smith', relationship: 'Daughter', phone: '(217) 555-0200' },
        { name: 'Tom Smith', relationship: 'Son', phone: '(312) 555-0300' },
      ],
    },
  });

  // Create medications
  await prisma.medication.createMany({
    skipDuplicates: true,
    data: [
      {
        careRecipientId: recipient.id,
        name: 'Metformin',
        dosageText: '500mg',
        instructions: 'Take with meals',
        scheduleType: 'daily',
        timesPerDay: 2,
        times: ['8:00 AM', '6:00 PM'],
        currentSupply: 45,
        supplyUnit: 'tablets',
        refillThreshold: '10',
        pharmacyName: 'CVS Pharmacy',
        pharmacyPhone: '(217) 555-0400',
        status: 'active',
        createdBy: demoUser.id,
      },
      {
        careRecipientId: recipient.id,
        name: 'Lisinopril',
        dosageText: '10mg',
        instructions: 'Take in the morning',
        scheduleType: 'daily',
        timesPerDay: 1,
        times: ['8:00 AM'],
        currentSupply: 28,
        supplyUnit: 'tablets',
        refillThreshold: '7',
        status: 'active',
        createdBy: demoUser.id,
      },
    ],
  });

  // Create appointment
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);

  await prisma.appointment.create({
    data: {
      careRecipientId: recipient.id,
      title: 'Endocrinology Follow-up',
      providerName: 'Dr. Sarah Lee',
      locationName: 'Springfield Endocrinology',
      address: '789 Medical Plaza, Suite 300',
      startDateTime: tomorrow,
      notes: 'Bring glucose log. Fast for 8 hours before.',
      transportationNeeded: true,
      status: 'scheduled',
      createdBy: demoUser.id,
    },
  });

  // Create task
  await prisma.task.create({
    data: {
      careRecipientId: recipient.id,
      title: 'Pick up Metformin refill',
      description: 'CVS on Main St. Prescription ready.',
      priority: 'high',
      status: 'open',
      recurrenceRule: 'none',
      createdBy: demoUser.id,
    },
  });

  // Create care log entry
  await prisma.careLogEntry.create({
    data: {
      careRecipientId: recipient.id,
      type: 'vitals',
      title: 'Morning vitals',
      body: 'BP: 128/82, Blood sugar: 145 mg/dL. Feeling well today.',
      tags: ['vitals', 'morning', 'blood-pressure'],
      createdBy: demoUser.id,
    },
  });

  console.log('✅ Seed complete!');
  console.log('Demo login: demo@caregiverhub.com / demo1234');
  console.log('Admin login: admin@caregiverhub.com / admin123!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
