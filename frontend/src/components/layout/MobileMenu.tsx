import { NavLink, useNavigate } from 'react-router-dom';
import { X, BookOpen, AlertTriangle, Users, Download, Settings, ShieldCheck, LogOut, Heart } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { getInitials } from '../../lib/utils';

interface Props { onClose: () => void; }

const menuItems = [
  { to: '/care-log', icon: BookOpen, label: 'Care Log' },
  { to: '/emergency', icon: AlertTriangle, label: 'Emergency Mode', danger: true },
  { to: '/members', icon: Users, label: 'Members & Roles' },
  { to: '/exports', icon: Download, label: 'Exports' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function MobileMenu({ onClose }: Props) {
  const { user, logout } = useAuthStore();
  const { activeCareCircle } = useAppStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-y-0 left-0 w-72 bg-white shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center">
              <Heart className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-gray-900">Caregiver Hub</span>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {menuItems.map(({ to, icon: Icon, label, danger }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors ${
                  danger
                    ? isActive ? 'bg-red-50 text-red-700' : 'text-red-600 hover:bg-red-50'
                    : isActive ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-50'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}

          {user?.isAdmin && (
            <NavLink
              to="/admin"
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors ${
                  isActive ? 'bg-purple-50 text-purple-700' : 'text-gray-600 hover:bg-gray-50'
                }`
              }
            >
              <ShieldCheck size={18} />
              Admin Console
            </NavLink>
          )}
        </nav>

        <div className="px-3 py-3 border-t border-gray-100">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-9 h-9 bg-brand-100 rounded-full flex items-center justify-center text-brand-700 text-sm font-semibold">
              {getInitials(user?.displayName || 'U')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.displayName}</p>
              <p className="text-xs text-gray-500">{activeCareCircle?.role}</p>
            </div>
            <button onClick={handleLogout} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
