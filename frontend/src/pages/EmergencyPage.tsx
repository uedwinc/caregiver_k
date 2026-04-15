import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Phone, FileText, Share2, Download, Shield, Copy, Check } from 'lucide-react';
import api from '../lib/api';
import { useAppStore } from '../store/appStore';
import Modal from '../components/ui/Modal';

export default function EmergencyPage() {
  const { activeCareCircle, activeCareRecipient } = useAppStore();
  const [showShare, setShowShare] = useState(false);
  const [shareData, setShareData] = useState<any>(null);
  const [duration, setDuration] = useState(6);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();

  const { data: card, isLoading } = useQuery({
    queryKey: ['emergency-card', activeCareRecipient?.id],
    queryFn: () => api.get(`/emergency/${activeCareCircle?.id}/${activeCareRecipient?.id}`).then(r => r.data),
    enabled: !!activeCareRecipient?.id,
    onSuccess: (data: any) => setForm(data),
  });

  const handleShare = async () => {
    try {
      setSharing(true);
      const res = await api.post(`/emergency/${activeCareCircle?.id}/${activeCareRecipient?.id}/share`, { durationHours: duration });
      setShareData(res.data);
    } catch (err: any) {
      if (err.response?.data?.code === 'UPGRADE_REQUIRED') {
        alert('Emergency share requires Premium plan.');
      }
    } finally {
      setSharing(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.put(`/emergency/${activeCareCircle?.id}/${activeCareRecipient?.id}`, form);
      setEditing(false);
      qc.invalidateQueries({ queryKey: ['emergency-card'] });
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const contacts = Array.isArray(card?.emergencyContacts) ? card.emergencyContacts : [];

  if (isLoading) {
    return <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="skeleton h-24 rounded-2xl" />)}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-red-600 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-3 mb-2">
          <AlertTriangle size={24} />
          <h1 className="text-xl font-bold">Emergency Mode</h1>
        </div>
        <p className="text-red-100 text-sm">
          Critical information for {activeCareRecipient?.fullName}. Keep this up to date.
        </p>
        <div className="flex gap-3 mt-4">
          <button
            onClick={() => setEditing(true)}
            className="flex-1 bg-white/20 hover:bg-white/30 text-white rounded-xl py-2 text-sm font-medium transition-colors"
          >
            Edit card
          </button>
          <button
            onClick={() => setShowShare(true)}
            className="flex-1 bg-white text-red-600 rounded-xl py-2 text-sm font-semibold hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
          >
            <Share2 size={14} /> Share with ER
          </button>
        </div>
      </div>

      {/* Emergency card content */}
      <div className="space-y-4">
        {card?.conditions && (
          <div className="card">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Medical Conditions</h3>
            <p className="text-gray-900">{card.conditions}</p>
          </div>
        )}

        {card?.allergies && (
          <div className="card border-l-4 border-red-400">
            <h3 className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-2">⚠️ Allergies</h3>
            <p className="text-gray-900 font-medium">{card.allergies}</p>
          </div>
        )}

        {card?.careRecipient?.medications?.length > 0 && (
          <div className="card">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Current Medications</h3>
            <div className="space-y-2">
              {card.careRecipient.medications.map((m: any) => (
                <div key={m.id} className="flex items-start gap-2">
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

        {(card?.primaryDoctorName || card?.preferredHospital) && (
          <div className="card">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Medical Team</h3>
            {card.primaryDoctorName && (
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-900">{card.primaryDoctorName}</p>
                  <p className="text-xs text-gray-500">Primary Physician</p>
                </div>
                {card.primaryDoctorPhone && (
                  <a href={`tel:${card.primaryDoctorPhone}`} className="flex items-center gap-1.5 text-sm text-brand-600 font-medium">
                    <Phone size={14} /> {card.primaryDoctorPhone}
                  </a>
                )}
              </div>
            )}
            {card.preferredHospital && (
              <div className="pt-2">
                <p className="text-xs text-gray-500">Preferred Hospital</p>
                <p className="text-sm font-medium text-gray-900">{card.preferredHospital}</p>
              </div>
            )}
          </div>
        )}

        {(card?.insuranceProvider) && (
          <div className="card">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Insurance</h3>
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
                  <a href={`tel:${c.phone}`} className="flex items-center gap-1.5 text-sm text-brand-600 font-medium">
                    <Phone size={14} /> {c.phone}
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pinned documents */}
        {card?.careRecipient?.documents?.length > 0 && (
          <div className="card">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Pinned Documents</h3>
            <div className="space-y-2">
              {card.careRecipient.documents.map((d: any) => (
                <a key={d.id} href={d.fileUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-brand-600 hover:underline">
                  <FileText size={14} />
                  {d.title}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Generate PDF */}
      <a
        href={`/api/emergency/${activeCareCircle?.id}/${activeCareRecipient?.id}/pdf`}
        className="btn-secondary w-full flex items-center justify-center gap-2"
        download
      >
        <Download size={16} /> Generate Emergency PDF
      </a>

      {/* Share modal */}
      <Modal open={showShare} onClose={() => { setShowShare(false); setShareData(null); }} title="Share with ER">
        {!shareData ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Create a time-limited read-only link to share the emergency card with medical staff.
            </p>
            <div>
              <label className="label">Link duration</label>
              <select value={duration} onChange={e => setDuration(Number(e.target.value))} className="input">
                <option value={1}>1 hour</option>
                <option value={6}>6 hours</option>
                <option value={24}>24 hours</option>
                <option value={72}>72 hours</option>
              </select>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowShare(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleShare} disabled={sharing} className="btn-danger flex-1">
                {sharing ? 'Creating...' : 'Create share link'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
              <Shield size={24} className="text-green-600 mx-auto mb-2" />
              <p className="font-semibold text-green-800">Share link created</p>
              <p className="text-sm text-green-600 mt-1">Expires in {duration} hours</p>
            </div>

            <div>
              <label className="label">Share URL</label>
              <div className="flex gap-2">
                <input value={shareData.shareUrl} readOnly className="input text-xs" />
                <button onClick={() => copyToClipboard(shareData.shareUrl)} className="btn-secondary px-3">
                  {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                </button>
              </div>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-500 mb-2">Or share this 6-digit code</p>
              <div className="text-4xl font-bold tracking-widest text-gray-900 bg-gray-50 rounded-xl py-4">
                {shareData.code}
              </div>
            </div>

            <button onClick={() => { setShowShare(false); setShareData(null); }} className="btn-primary w-full">
              Done
            </button>
          </div>
        )}
      </Modal>

      {/* Edit modal */}
      <Modal open={editing} onClose={() => setEditing(false)} title="Edit Emergency Card">
        <div className="space-y-4">
          <div>
            <label className="label">Medical conditions</label>
            <textarea value={form.conditions || ''} onChange={e => setForm((f: any) => ({ ...f, conditions: e.target.value }))}
              className="input min-h-[80px] resize-none" placeholder="Diabetes, Hypertension..." />
          </div>
          <div>
            <label className="label">Allergies</label>
            <input value={form.allergies || ''} onChange={e => setForm((f: any) => ({ ...f, allergies: e.target.value }))}
              className="input" placeholder="Penicillin, Shellfish..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Primary doctor</label>
              <input value={form.primaryDoctorName || ''} onChange={e => setForm((f: any) => ({ ...f, primaryDoctorName: e.target.value }))}
                className="input" placeholder="Dr. Smith" />
            </div>
            <div>
              <label className="label">Doctor phone</label>
              <input value={form.primaryDoctorPhone || ''} onChange={e => setForm((f: any) => ({ ...f, primaryDoctorPhone: e.target.value }))}
                className="input" placeholder="(555) 000-0000" />
            </div>
          </div>
          <div>
            <label className="label">Preferred hospital</label>
            <input value={form.preferredHospital || ''} onChange={e => setForm((f: any) => ({ ...f, preferredHospital: e.target.value }))}
              className="input" placeholder="City General Hospital" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Insurance provider</label>
              <input value={form.insuranceProvider || ''} onChange={e => setForm((f: any) => ({ ...f, insuranceProvider: e.target.value }))}
                className="input" placeholder="Blue Cross" />
            </div>
            <div>
              <label className="label">Member ID</label>
              <input value={form.insuranceMemberId || ''} onChange={e => setForm((f: any) => ({ ...f, insuranceMemberId: e.target.value }))}
                className="input" placeholder="XYZ123456" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setEditing(false)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
