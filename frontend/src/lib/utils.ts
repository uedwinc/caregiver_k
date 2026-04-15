import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, isToday, isTomorrow } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date, fmt = 'MMM d, yyyy') {
  return format(new Date(date), fmt);
}

export function formatDateTime(date: string | Date) {
  return format(new Date(date), 'MMM d, yyyy h:mm a');
}

export function formatTime(date: string | Date) {
  return format(new Date(date), 'h:mm a');
}

export function formatRelative(date: string | Date) {
  const d = new Date(date);
  if (isToday(d)) return `Today at ${formatTime(d)}`;
  if (isTomorrow(d)) return `Tomorrow at ${formatTime(d)}`;
  return formatDateTime(d);
}

export function timeAgo(date: string | Date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function priorityColor(priority: string) {
  switch (priority) {
    case 'urgent': return 'badge-red';
    case 'high': return 'badge-yellow';
    case 'medium': return 'badge-blue';
    case 'low': return 'badge-gray';
    default: return 'badge-gray';
  }
}

export function roleLabel(role: string) {
  switch (role) {
    case 'owner': return 'Primary Caregiver';
    case 'family': return 'Family Member';
    case 'helper': return 'Helper';
    case 'advisor': return 'Clinician/Advisor';
    default: return role;
  }
}

export function logTypeLabel(type: string) {
  const map: Record<string, string> = {
    note: 'Note',
    symptom: 'Symptom',
    vitals: 'Vitals',
    med_change: 'Med Change',
    incident: 'Incident',
    appointment_summary: 'Appointment Summary',
    insurance: 'Insurance',
  };
  return map[type] || type;
}

export function logTypeColor(type: string) {
  const map: Record<string, string> = {
    note: 'badge-gray',
    symptom: 'badge-yellow',
    vitals: 'badge-blue',
    med_change: 'badge-blue',
    incident: 'badge-red',
    appointment_summary: 'badge-green',
    insurance: 'badge-gray',
  };
  return map[type] || 'badge-gray';
}

export function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}
