# Caregivers

Build a production-quality responsive web app (mobile-first, PWA-style) named Caregiver Hub: a shared command center for family caregiving. The app must feel world-class: calm, minimal, fast, accessible, and trustworthy. Prioritize an Apple-like UI: clean typography, generous whitespace, subtle shadows, clear hierarchy, and zero clutter.
1) Core concept
CaregiverOS lets a family coordinate care for one or more care recipients. It includes:

* Command Center (Today view): meds due, upcoming appointments, tasks, rides, urgent alerts.
* Tasks + recurring routines: assignable with ownership, due dates, recurrence, checklists.
* Medication list + schedule + refill reminders.
* Appointments + transportation coordination.
* Emergency Mode: instant access to emergency card + key docs + time-limited share link + printable/downloadable PDF.
* Document Vault: upload, organize, and share documents with role-based and per-document access control.
* Care Log / Journal: entries with tags and photos; export as PDF/CSV.
* Activity/Audit log: who changed what, who accessed emergency share.

2) Users, roles, permissions (must be strict)
Support these role types inside a family space (“Care Circle”):

* Owner / Primary Caregiver: full access; manages billing, roles, emergency share, exports.
* Family Member: can view/edit most care items but may be restricted from sensitive docs/journal.
* Helper (paid or volunteer): can view assigned tasks, today schedule, pickup instructions; cannot access sensitive docs unless explicitly granted.
* Read-only Clinician/Advisor (optional): can view emergency card and selected logs if invited.

Permissions requirements:

* All data is scoped to a Care Circle.
* Each Care Recipient is within a Care Circle.
* Documents require per-document access rules (ACL) in addition to role defaults.
* Implement “Break-glass Emergency Share”: a time-limited link or code granting temporary access to the Emergency Card + selected documents ONLY.

3) Data model (create these collections/tables)
Create database models with relations:
CareCircle

* id, name, createdAt, ownerUserId

CareCircleMember

* id, careCircleId, userId, role (Owner/Family/Helper/Advisor), status (invited/active/suspended), displayName, phone, createdAt

CareRecipient

* id, careCircleId, fullName, nickname, DOB (optional), address, notes, mobilityNotes, createdAt

EmergencyCard

* id, careRecipientId
* conditions (text)
* allergies (text)
* medicationsSummary (text or generated)
* primaryDoctorName, primaryDoctorPhone
* preferredHospital
* insuranceProvider, insuranceMemberId
* emergencyContacts (json list: name/relationship/phone)
* lastUpdatedAt

Medication

* id, careRecipientId
* name, dosageText, instructions, scheduleType (daily/weekly/as-needed/custom)
* timesPerDay (optional), times (json list), startDate, endDate (optional)
* pharmacyName, pharmacyPhone (optional)
* refillThreshold (e.g., “7 days remaining” or “10 pills remaining”), currentSupply (number + unit)
* status (active/inactive)
* createdBy, createdAt

Appointment

* id, careRecipientId
* title, providerName, locationName, address, startDateTime, endDateTime
* notes, prepChecklist (json list)
* transportationNeeded (boolean)
* status (scheduled/completed/canceled)
* createdBy, createdAt

RidePlan

* id, appointmentId
* driverMemberId (CareCircleMember), pickupTime, pickupLocation, dropoffLocation
* instructions, backupDriverMemberId, status (planned/confirmed/done)

Task

* id, careRecipientId
* title, description, dueDateTime (optional), recurrenceRule (none/daily/weekly/monthly/customText)
* priority (low/medium/high/urgent)
* status (open/in_progress/done)
* checklistItems (json list: text + done)
* ownerMemberId (responsible), backupMemberId (optional)
* createdBy, createdAt, completedAt

CareLogEntry

* id, careRecipientId
* type (note/symptom/vitals/med-change/incident/appointment-summary/insurance)
* title, body, tags (json list), attachments (files/photos)
* visibility (default “Care Circle”; optionally restricted)
* createdBy, createdAt

Document

* id, careRecipientId
* category (ID/Insurance/POA/Medical/Discharge/Other)
* title, fileUrl, fileType, uploadedBy, uploadedAt
* sensitivityLevel (normal/sensitive)
* pinnedToEmergency (boolean)

DocumentAccess

* id, documentId
* accessType (role-based/member-specific)
* allowedRole (optional)
* allowedMemberId (optional)
* createdAt

Notification

* id, userId, careCircleId, careRecipientId (optional)
* type (task_due/med_due/refill/appointment/ride/emergency_share)
* payload (json), readAt, createdAt

AuditEvent

* id, careCircleId, careRecipientId (optional)
* actorUserId
* eventType (create/update/delete/view/share/download)
* entityType (document/task/medication/appointment/emergency)
* entityId
* metadata (json)
* createdAt

Invitation

* id, careCircleId, emailOrPhone, role, invitedByUserId, status, token, expiresAt, createdAt

Subscription

* id, careCircleId, plan (free/premium), status, renewalDate, providerCustomerId (placeholder)

4) Navigation + page architecture (must be elegant)
Global top-level: Care Circle switcher + Recipient switcher.
For a selected Care Recipient, use 5 primary tabs (mobile bottom nav; desktop sidebar):

1. Today
2. Plan (Tasks & Routines)
3. Calendar
4. Meds
5. Vault
Secondary via menu:


* Care Log
* Emergency Mode
* Members & Roles
* Exports
* Settings

5) UI/UX requirements (must feel premium)

* Clean, consistent design system:

Font: modern system sans
8pt spacing grid
Card-based layout with clear headings
High-contrast mode + large text toggle


* “Today” is the default home:

“Next 24 hours” timeline
Critical alerts at top (refill soon, urgent tasks, upcoming ride)
Quick actions: Add Task, Add Med, Add Appointment, Upload Document, Emergency Mode


* Use progressive disclosure: don’t show complex options until user taps “Advanced”.
* Include empty states with helpful CTAs (e.g., “Add first medication”).

6) Key flows (implement end-to-end)
Onboarding

* Create Care Circle → create first Care Recipient → invite members (SMS/email) → set roles → build Emergency Card → upload 2 key docs (insurance card + POA) → add one medication + one appointment → land on Today view.

Invite flow

* Owner invites by email/phone → recipient gets link → creates account → joins circle → sees guided role-based onboarding.

Task/routine

* Create task with owner + backup + recurrence + reminders.
* Completion requires optional “proof” note (e.g., “Refill called in at 2:15pm”).

Medication + refill

* Add meds with schedule and supply.
* Refill reminder triggers when threshold met.
* Provide “Mark taken” and “Skip” actions with reason.

Appointments + transportation

* Create appointment → if transportation needed, create RidePlan with driver + backup + pickup time.
* Reminders: day before + 2 hours before.

Vault

* Upload documents, categorize, mark sensitive, set access rules, optionally pin to Emergency Mode.
* Provide “Request Access” button for restricted docs (sends approval request to Owner).

Emergency Mode (must be best-in-class)

* Big red “Emergency Mode” entry in UI (but not scary).
* Shows: Emergency Card + meds summary + allergies + key contacts + pinned documents.
* Add “Generate Emergency PDF” button (PDF contains only approved emergency fields + pinned docs list).
* Add “Share with ER”:

Create time-limited share token (e.g., 1 hour, 6 hours, 24 hours).
Share page is read-only and logs access in AuditEvent.
Show a simple 6-digit code as fallback.



Care Log + Export

* Log entries with types/tags, attach photo.
* Export last 30/90 days as PDF and CSV.
* Export includes tasks completed, meds changes, appointment summaries.

7) Smart notifications (rules-based, not AI)
Implement automation rules:

* Task due reminders: 24h before (optional), 2h before, at due time.
* Medication reminders based on schedule; allow “snooze 15/30/60”.
* Refill reminders when below threshold; escalate if unaddressed for 48h.
* Appointment reminders: 24h and 2h.
* Ride reminders to driver + backup.
* Daily digest to Owner (optional): “Today’s tasks, meds, appointments”.

All notifications should be push (if supported) and fallback to email/SMS.
8) Security + trust features (do not skip)

* Role-based access + per-document ACL.
* Audit log for document views/downloads and emergency share link opens.
* Session timeout option for sensitive screens (Vault, Emergency Mode).
* Clear privacy controls + “what others can see” preview.

9) Monetization (implement but keep tasteful)
Plans:

* Free: 1 Care Recipient, 3 members, limited vault storage, basic reminders.
* Premium: unlimited members, advanced exports, expanded vault, multiple recipients, emergency share, audit log, priority support.
Implement paywall screens only at the moment of need (e.g., inviting 4th member, exporting, enabling emergency share).

10) Admin console (simple but useful)
Admin page for platform operator:

* User management, abuse flags, basic analytics (active circles, recipients).
* Ability to disable compromised share links.
* View audit events for dispute resolution.

11) Quality bar

* Every screen must have:

clear header + back behavior
loading skeletons
error states
empty states
accessibility labels


* Performance: prioritize fast initial load and snappy navigation.
* Copywriting: calm, supportive tone; never guilt-trip caregivers.

Deliver a complete MVP with polished UI and working flows for: onboarding, roles, Today view, tasks, meds, appointments + rides, vault + ACL, emergency mode + share, care log + export, notifications, and audit events.

I will be deploying and testing locally and also on AWS so guide me appropriately