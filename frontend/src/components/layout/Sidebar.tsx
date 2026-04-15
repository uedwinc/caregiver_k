import { NavLink, useNavigate } from 'react-router-dom';
import {
  Heart, Calendar, Pill, FolderOpen, CheckSquare,
  BookOpen, AlertTriangle, Users, Download, Settings,
  ShieldCheck, LogOut, ChevronDown
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { getInitials } from '../../lib/utils';
import RecipientSwitcher from './RecipientSwitcher';

const primaryNav = [
  { to: '/today', icon: Heart, label: 'Today' },
  { to: '/plan', icon: CheckSquare, label: 'Plan' },
  { to: '/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/meds', icon: Pill, label: 'Medications' },
  { to: '/vault', icon: FolderOpen, label: 'Vault' },
];

const secondaryNav = [
  { to: '/care-log', icon: BookOpen, label: 'Care Log' },
  { to: '/emergency', icon: AlertTriangle, label: 'Emergency Mode' },
  { to: '/members', icon: Users, label: 'Members & Roles' },
  { to: '/exports', icon: Download, label: 'Exports' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const { activeCareCircle } = useAppStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-100">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-100">
        <div className="w-8 h-8 bg-brand-600 rounded-xl flex items-center justify-center">
          <Heart className="w-4 h-4 text-white" />
        </div>
        <span className="font-semibold text-gray-900">Caregiver Hub</span>
      </div>

      {/* Circle + Recipient switcher */}
      <div className="px-3 py-3 border-b border-gray-100">
        <RecipientSwitcher />
      </div>

      {/* Primary nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {primaryNav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <Icon className="w-4.5 h-4.5 flex-shrink-0" size={18} />
            {label}
          </NavLink>
        ))}

        <div className="pt-4 pb-1">
          <p className="px-3 text-xs font-medium text-gray-400 uppercase tracking-wider">More</p>
        </div>

        {secondaryNav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                to === '/emergency'
                  ? isActive
                    ? 'bg-red-50 text-red-700'
                    : 'text-red-600 hover:bg-red-50'
                  : isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <Icon className="w-4.5 h-4.5 flex-shrink-0" size={18} />
            {label}
          </NavLink>
        ))}

        {user?.isAdmin && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive ? 'bg-purple-50 text-purple-700' : 'text-gray-600 hover:bg-gray-50'
              }`
            }
          >
            <ShieldCheck size={18} />
            Admin Console
          </NavLink>
        )}
      </nav>

      {/* User footer */}
      <div className="px-3 py-3 border-t border-gray-100">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center text-brand-700 text-xs font-semibold flex-shrink-0">
            {getInitials(user?.displayName || 'U')}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.displayName}</p>
            <p className="text-xs text-gray-500 truncate">{activeCareCircle?.role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
