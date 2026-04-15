import { NavLink } from 'react-router-dom';
import { Heart, CheckSquare, Calendar, Pill, FolderOpen } from 'lucide-react';

const tabs = [
  { to: '/today', icon: Heart, label: 'Today' },
  { to: '/plan', icon: CheckSquare, label: 'Plan' },
  { to: '/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/meds', icon: Pill, label: 'Meds' },
  { to: '/vault', icon: FolderOpen, label: 'Vault' },
];

export default function BottomNav() {
  return (
    <div className="bg-white border-t border-gray-200 safe-area-pb">
      <div className="flex">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors ${
                isActive ? 'text-brand-600' : 'text-gray-500'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={20} className={isActive ? 'text-brand-600' : 'text-gray-400'} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </div>
  );
}
