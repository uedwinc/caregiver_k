import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, Users, Heart, Link, Activity, Ban } from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { timeAgo } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

export default function AdminPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const qc = useQueryClient();

  if (!user?.isAdmin) {
    navigate('/today');
    return null;
  }

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/admin/stats').then(r => r.data),
  });

  const { data: shareLinks = [] } = useQuery({
    queryKey: ['admin-share-links'],
    queryFn: () => api.get('/admin/share-links').then(r => r.data),
  });

  const { data: auditEvents = [] } = useQuery({
    queryKey: ['admin-audit'],
    queryFn: () => api.get('/admin/audit').then(r => r.data),
  });

  const disableLink = useMutation({
    mutationFn: (id: string) => api.put(`/admin/share-links/${id}/disable`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-share-links'] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
          <ShieldCheck size={20} className="text-purple-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Console</h1>
          <p className="text-sm text-gray-500">Platform management</p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Users', value: stats.users, icon: Users, color: 'bg-blue-50 text-blue-600' },
            { label: 'Care Circles', value: stats.circles, icon: Heart, color: 'bg-red-50 text-red-600' },
            { label: 'Recipients', value: stats.recipients, icon: Users, color: 'bg-green-50 text-green-600' },
            { label: 'Active Shares', value: stats.activeShares, icon: Link, color: 'bg-yellow-50 text-yellow-600' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card text-center">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2 ${color}`}>
                <Icon size={18} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Active share links */}
      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Link size={16} /> Active Emergency Share Links
        </h2>
        {shareLinks.length === 0 ? (
          <p className="text-sm text-gray-500">No active share links</p>
        ) : (
          <div className="space-y-3">
            {shareLinks.map((link: any) => (
              <div key={link.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {link.emergencyCard?.careRecipient?.fullName}
                  </p>
                  <p className="text-xs text-gray-500">
                    Code: {link.code} · Expires {timeAgo(link.expiresAt)} · {link.accessLogs?.length || 0} accesses
                  </p>
                </div>
                <button
                  onClick={() => disableLink.mutate(link.id)}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100"
                >
                  <Ban size={12} /> Disable
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent audit events */}
      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Activity size={16} /> Recent Audit Events
        </h2>
        <div className="space-y-2">
          {auditEvents.slice(0, 20).map((event: any) => (
            <div key={event.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div>
                <p className="text-sm text-gray-900">
                  <span className="font-medium">{event.actor?.displayName}</span>
                  {' '}{event.eventType}{' '}{event.entityType}
                </p>
                <p className="text-xs text-gray-500">{timeAgo(event.createdAt)}</p>
              </div>
              <span className="badge badge-gray capitalize">{event.eventType}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
