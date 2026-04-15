import { useState } from 'react';
import { ChevronDown, Plus, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { useAppStore } from '../../store/appStore';
import { getInitials } from '../../lib/utils';

interface Props { compact?: boolean; }

export default function RecipientSwitcher({ compact }: Props) {
  const [open, setOpen] = useState(false);
  const { activeCareCircle, activeCareRecipient, setActiveCareCircle, setActiveCareRecipient } = useAppStore();
  const navigate = useNavigate();

  const { data: memberships } = useQuery({
    queryKey: ['my-circles'],
    queryFn: () => api.get('/care-circles').then(r => r.data),
  });

  if (!activeCareCircle || !activeCareRecipient) return null;

  const allRecipients = memberships?.flatMap((m: any) =>
    m.careCircle.careRecipients.map((r: any) => ({
      ...r,
      circleName: m.careCircle.name,
      circleId: m.careCircle.id,
      role: m.role,
      memberId: m.id,
    }))
  ) || [];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors w-full text-left"
      >
        <div className="w-7 h-7 bg-brand-100 rounded-lg flex items-center justify-center text-brand-700 text-xs font-semibold flex-shrink-0">
          {getInitials(activeCareRecipient.fullName)}
        </div>
        {!compact && (
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {activeCareRecipient.nickname || activeCareRecipient.fullName}
            </p>
            <p className="text-xs text-gray-500 truncate">{activeCareCircle.name}</p>
          </div>
        )}
        <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-2xl shadow-modal border border-gray-100 z-50 overflow-hidden">
            <div className="p-2">
              <p className="px-3 py-1.5 text-xs font-medium text-gray-400 uppercase tracking-wider">Care Recipients</p>
              {allRecipients.map((r: any) => (
                <button
                  key={r.id}
                  onClick={() => {
                    setActiveCareCircle({ id: r.circleId, name: r.circleName, role: r.role, memberId: r.memberId });
                    setActiveCareRecipient({ id: r.id, fullName: r.fullName, nickname: r.nickname, careCircleId: r.circleId });
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                    r.id === activeCareRecipient.id ? 'bg-brand-50 text-brand-700' : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="w-7 h-7 bg-brand-100 rounded-lg flex items-center justify-center text-brand-700 text-xs font-semibold">
                    {getInitials(r.fullName)}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="font-medium truncate">{r.nickname || r.fullName}</p>
                    <p className="text-xs text-gray-500 truncate">{r.circleName}</p>
                  </div>
                </button>
              ))}

              <div className="border-t border-gray-100 mt-1 pt-1">
                <button
                  onClick={() => { navigate('/onboarding'); setOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <Plus size={16} />
                  Add Care Circle
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
