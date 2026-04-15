import PDFDocument from 'pdfkit';

export function generateEmergencyPDF(card: any): PDFKit.PDFDocument {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  const recipient = card.careRecipient;

  // Header
  doc.rect(0, 0, doc.page.width, 80).fill('#DC2626');
  doc.fillColor('white').fontSize(24).font('Helvetica-Bold')
    .text('EMERGENCY MEDICAL INFORMATION', 50, 25, { align: 'center' });

  doc.moveDown(3);
  doc.fillColor('#111827');

  // Recipient info
  doc.fontSize(20).font('Helvetica-Bold').text(recipient.fullName);
  if (recipient.dob) {
    doc.fontSize(12).font('Helvetica').fillColor('#6B7280')
      .text(`Date of Birth: ${new Date(recipient.dob).toLocaleDateString()}`);
  }

  doc.moveDown();
  doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke('#E5E7EB');
  doc.moveDown();

  const section = (title: string) => {
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#DC2626').text(title);
    doc.moveDown(0.3);
  };

  const field = (label: string, value: string | null | undefined) => {
    if (!value) return;
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#374151').text(`${label}: `, { continued: true });
    doc.font('Helvetica').fillColor('#111827').text(value);
  };

  // Medical conditions
  if (card.conditions) {
    section('Medical Conditions');
    doc.fontSize(11).font('Helvetica').fillColor('#111827').text(card.conditions);
    doc.moveDown();
  }

  // Allergies
  if (card.allergies) {
    section('⚠️ Allergies');
    doc.fontSize(11).font('Helvetica').fillColor('#DC2626').text(card.allergies);
    doc.moveDown();
  }

  // Medications
  if (recipient.medications?.length > 0) {
    section('Current Medications');
    recipient.medications.forEach((med: any) => {
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#111827').text(`• ${med.name}`, { continued: true });
      if (med.dosageText) doc.font('Helvetica').text(` — ${med.dosageText}`);
      else doc.text('');
      if (med.instructions) {
        doc.fontSize(10).font('Helvetica').fillColor('#6B7280').text(`  ${med.instructions}`);
      }
    });
    doc.moveDown();
  }

  // Primary doctor
  if (card.primaryDoctorName) {
    section('Primary Physician');
    field('Name', card.primaryDoctorName);
    field('Phone', card.primaryDoctorPhone);
    doc.moveDown();
  }

  // Hospital preference
  if (card.preferredHospital) {
    section('Preferred Hospital');
    doc.fontSize(11).font('Helvetica').fillColor('#111827').text(card.preferredHospital);
    doc.moveDown();
  }

  // Insurance
  if (card.insuranceProvider) {
    section('Insurance');
    field('Provider', card.insuranceProvider);
    field('Member ID', card.insuranceMemberId);
    doc.moveDown();
  }

  // Emergency contacts
  const contacts = Array.isArray(card.emergencyContacts) ? card.emergencyContacts : [];
  if (contacts.length > 0) {
    section('Emergency Contacts');
    contacts.forEach((c: any) => {
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#111827').text(`${c.name} (${c.relationship})`);
      doc.font('Helvetica').text(`  📞 ${c.phone}`);
    });
    doc.moveDown();
  }

  // Pinned documents list
  if (recipient.documents?.length > 0) {
    section('Key Documents on File');
    recipient.documents.forEach((d: any) => {
      doc.fontSize(11).font('Helvetica').fillColor('#111827').text(`• ${d.title} (${d.category})`);
    });
    doc.moveDown();
  }

  // Footer
  doc.fontSize(9).fillColor('#9CA3AF')
    .text(`Generated: ${new Date().toLocaleString()} | Caregiver Hub`, 50, doc.page.height - 50, { align: 'center' });

  doc.end();
  return doc;
}

export function generateCareLogPDF(data: {
  recipient: any;
  entries: any[];
  tasks: any[];
  medications: any[];
  days: number;
}): PDFKit.PDFDocument {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  const { recipient, entries, tasks, days } = data;

  // Header
  doc.rect(0, 0, doc.page.width, 70).fill('#1E40AF');
  doc.fillColor('white').fontSize(20).font('Helvetica-Bold')
    .text('Care Log Report', 50, 20, { align: 'center' });
  doc.fontSize(12).font('Helvetica')
    .text(`${recipient.fullName} — Last ${days} days`, 50, 45, { align: 'center' });

  doc.moveDown(3);
  doc.fillColor('#111827');

  // Summary
  doc.fontSize(14).font('Helvetica-Bold').text('Summary');
  doc.fontSize(11).font('Helvetica')
    .text(`Total log entries: ${entries.length}`)
    .text(`Tasks completed: ${tasks.length}`)
    .text(`Period: ${new Date(Date.now() - days * 86400000).toLocaleDateString()} – ${new Date().toLocaleDateString()}`);

  doc.moveDown();
  doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke('#E5E7EB');
  doc.moveDown();

  // Log entries
  if (entries.length > 0) {
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#1E40AF').text('Log Entries');
    doc.moveDown(0.5);

    entries.forEach(entry => {
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#111827').text(entry.title);
      doc.fontSize(10).font('Helvetica').fillColor('#6B7280')
        .text(`${entry.type.toUpperCase()} • ${new Date(entry.createdAt).toLocaleString()}`);
      if (entry.body) {
        doc.fontSize(11).font('Helvetica').fillColor('#374151').text(entry.body);
      }
      const tags = Array.isArray(entry.tags) ? entry.tags : [];
      if (tags.length > 0) {
        doc.fontSize(10).fillColor('#6B7280').text(`Tags: ${tags.join(', ')}`);
      }
      doc.moveDown(0.5);
    });
  }

  // Completed tasks
  if (tasks.length > 0) {
    doc.addPage();
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#1E40AF').text('Completed Tasks');
    doc.moveDown(0.5);

    tasks.forEach(task => {
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#111827').text(`✓ ${task.title}`);
      doc.fontSize(10).font('Helvetica').fillColor('#6B7280')
        .text(`Completed: ${task.completedAt ? new Date(task.completedAt).toLocaleString() : 'N/A'}`);
      if (task.completionNote) {
        doc.fontSize(11).font('Helvetica').fillColor('#374151').text(task.completionNote);
      }
      doc.moveDown(0.3);
    });
  }

  doc.fontSize(9).fillColor('#9CA3AF')
    .text(`Generated: ${new Date().toLocaleString()} | Caregiver Hub`, 50, doc.page.height - 50, { align: 'center' });

  doc.end();
  return doc;
}
