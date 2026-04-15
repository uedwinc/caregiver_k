import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Phone, FileText, Shield } from 'lucide-react';
import api from '../lib/api';
import { formatDate } from '../lib/utils';

export default function EmergencySharePage() {
  const { token } = useParams<{ token: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ['emergency-share', token],
    queryFn: () => api.get(`/emergency/share/${token}`).then(r => r.data),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading emergency information...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-7 h-7 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Link expired or invalid</h1>
          <p className="text-gray-500 text-sm">This emergency share link has expired or been disabled.</p>
        </div>
      </div>
    );
  }

  const { emergencyCard: card, recipientName, expiresAt } = data;
  const contacts = Array.isArray(card.emergencyContacts) ? card.emergencyContacts : [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Emergency header */}
      <div className="bg-red-600 text-white px-4 py-5">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={20} />
            <span className="font-bold text-lg">EMERGENCY MEDICAL INFORMATION</span>
          </div>
          <p className="text-red-100 text-sm">For: {recipientName}</p>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-red-200">
            <Shield size={12} />
            Read-only · Expires {formatDate(expiresAt, 'MMM d, yyyy h:mm a')}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {card.conditions && (
          <div className="card">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Medical Conditions</h3>
            <p className="text-gray-900">{card.conditions}</p>
          </div>
        )}

        {card.allergies && (
          <div className="card border-l-4 border-red-400">
            <h3 className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-2">⚠️ ALLERGIES</h3>
            <p className="text-gray-900 font-semibold text-lg">{card.allergies}</p>
          </div>
        )}

        {card.careRecipient?.medications?.length > 0 && (
          <div className="card">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Current Medications</h3>
            <div className="space-y-2">
              {card.careRecipient.medications.map((m: any, i: number) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-brand-500 rounded-full mt-2 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-gray-900">{m.name}</span>
                    {m.dosageText && <span className="text-gray-500"> — {m.dosageText}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(card.primaryDoctorName || card.preferredHospital) && (
          <div className="card">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Medical Team</h3>
            {card.primaryDoctorName && (
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium text-gray-900">{card.primaryDoctorName}</p>
                  <p className="text-xs text-gray-500">Primary Physician</p>
                </div>
                {card.primaryDoctorPhone && (
                  <a href={`tel:${card.primaryDoctorPhone}`} className="flex items-center gap-1.5 text-brand-600 font-medium">
                    <Phone size={16} /> {card.primaryDoctorPhone}
                  </a>
                )}
              </div>
            )}
            {card.preferredHospital && (
              <div className="pt-2 border-t border-gray-50">
                <p className="text-xs text-gray-500">Preferred Hospital</p>
                <p className="font-medium text-gray-900">{card.preferredHospital}</p>
              </div>
            )}
          </div>
        )}

        {card.insuranceProvider && (
          <div className="card">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Insurance</h3>
            <p className="font-medium text-gray-900">{card.insuranceProvider}</p>
            {card.insuranceMemberId && <p className="text-sm text-gray-500">Member ID: {card.insuranceMemberId}</p>}
          </div>
        )}

        {contacts.length > 0 && (
          <div className="card">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Emergency Contacts</h3>
            <div className="space-y-3">
              {contacts.map((c: any, i: number) => (
                <div key={i} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{c.name}</p>
                    <p className="text-xs text-gray-500">{c.relationship}</p>
                  </div>
                  <a href={`tel:${c.phone}`} className="flex items-center gap-1.5 text-brand-600 font-semibold">
                    <Phone size={16} /> {c.phone}
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {card.careRecipient?.documents?.length > 0 && (
          <div className="card">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Key Documents</h3>
            {card.careRecipient.documents.map((d: any) => (
              <a key={d.id} href={d.fileUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-brand-600 hover:underline py-1">
                <FileText size={14} />
                {d.title} ({d.category})
              </a>
            ))}
          </div>
        )}

        <p className="text-center text-xs text-gray-400 pt-4">
          Powered by Caregiver Hub · This link expires {formatDate(expiresAt, 'MMM d, yyyy h:mm a')}
        </p>
      </div>
    </div>
  );
}
