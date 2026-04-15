import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Users, Plus, Mail, Crown, UserCheck, UserX, Copy, Check } from 'lucide-react';
import api from '../lib/api';
import { useAppStore } from '../store/appStore';
import { roleLabel, getInitials } from '../lib/utils';
import Modal from '../components/ui/Modal';
import { useForm } from 'react-hook-form';

export default function MembersPage() {
  const { activeCareCircle } = useAppStore();
  const [showInvite, setShowInvite] = useState(false);
  const [inviteResult, setInviteResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const qc = useQueryClient();

  const { data: circle, isLoading } = useQuery({
    queryKey: ['circle-detail', activeCareCircle?.id],
    queryFn: () => api.get(`/care-circles/${activeCareCircle?.id}`).then(r => r.data),
    enabled: !!activeCareCircle?.id,
  });

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<{
    emailOrPhone: string; role: string;
  }>();

  const onInvite = async (data: any) => {
    try {
      const res = await api.post(`/care-circles/${activeCareCircle?.id}/invite`, data);
      setInviteResult(res.data);
      reset();
      qc.invalidateQueries({ queryKey: ['circle-detail'] });
    } catch (err: any) {
      if (err.response?.data?.code === 'UPGRADE_REQUIRED') {
        alert('Free plan is limited to 3 members. Upgrade to Premium to invite more.');
      }
    }
  };

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const roleIcon = (role: string) => {
    if (role === 'owner') return <Crown size={14} className="text-yellow-500" />;
    if (role === 'family') return <UserCheck size={14} className="text-blue-500" />;
    return <Users size={14} className="text-gray-400" />;
  };

  const members = circle?.members || [];

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Members & Roles</h1>
          <p className="text-sm text-gray-500 mt-0.5">{members.length} members in {activeCareCircle?.name}</p>
        </div>
        {activeCareCircle?.role === 'owner' && (
          <button onClick={() => setShowInvite(true)} className="btn-primary">
            <Plus size={16} /> Invite
          </button>
        )}
      </div>

      {isLoading && (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="skeleton h-16 rounded-2xl" />)}</div>
      )}

      <div className="space-y-3">
        {members.map((member: any) => (
          <div key={member.id} className="card flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center text-brand-700 font-semibold text-sm flex-shrink-0">
              {getInitials(member.displayName)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-gray-900">{member.displayName}</p>
                {roleIcon(member.role)}
              </div>
              <p className="text-sm text-gray-500">{member.user?.email}</p>
            </div>
            <div className="text-right">
              <span className="badge badge-blue">{roleLabel(member.role)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Subscription info */}
      {circle?.subscription && (
        <div className={`card ${circle.subscription.plan === 'premium' ? 'bg-gradient-to-r from-brand-50 to-purple-50 border-brand-200' : ''}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-900 capitalize">{circle.subscription.plan} Plan</p>
              <p className="text-sm text-gray-500">
                {circle.subscription.plan === 'free'
                  ? 'Up to 3 members, 1 care recipient'
                  : 'Unlimited members and recipients'}
              </p>
            </div>
            {circle.subscription.plan === 'free' && (
              <button className="btn-primary text-sm">Upgrade</button>
            )}
          </div>
        </div>
      )}

      {/* Invite modal */}
      <Modal open={showInvite} onClose={() => { setShowInvite(false); setInviteResult(null); }} title="Invite member">
        {!inviteResult ? (
          <form onSubmit={handleSubmit(onInvite)} className="space-y-4">
            <div>
              <label className="label">Email or phone</label>
              <input
                {...register('emailOrPhone', { required: true })}
                className="input"
                placeholder="jane@example.com or +1 555 000 0000"
              />
            </div>
            <div>
              <label className="label">Role</label>
              <select {...register('role', { required: true })} className="input">
                <option value="family">Family Member</option>
                <option value="helper">Helper</option>
                <option value="advisor">Clinician/Advisor</option>
              </select>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-500 space-y-1">
              <p><strong>Family Member:</strong> View and edit most care items</p>
              <p><strong>Helper:</strong> View assigned tasks and schedule only</p>
              <p><strong>Clinician/Advisor:</strong> View emergency card and selected logs</p>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowInvite(false)} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
                {isSubmitting ? 'Sending...' : 'Send invite'}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
              <Mail size={24} className="text-green-600 mx-auto mb-2" />
              <p className="font-semibold text-green-800">Invitation created!</p>
            </div>
            <div>
              <label className="label">Invite link</label>
              <div className="flex gap-2">
                <input value={inviteResult.inviteUrl} readOnly className="input text-xs" />
                <button onClick={() => copyLink(inviteResult.inviteUrl)} className="btn-secondary px-3">
                  {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-500 text-center">Link expires in 7 days</p>
            <button onClick={() => { setShowInvite(false); setInviteResult(null); }} className="btn-primary w-full">Done</button>
          </div>
        )}
      </Modal>
    </div>
  );
}
