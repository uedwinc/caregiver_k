import { Bell, Menu, AlertTriangle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import RecipientSwitcher from './RecipientSwitcher';
import { useState } from 'react';
import MobileMenu from './MobileMenu';

export default function TopBar() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const { data: notifData } = useQuery({
    queryKey: ['notifications-count'],
    queryFn: () => api.get('/notifications/unread-count').then(r => r.data),
    refetchInterval: 30000,
  });

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="flex items-center justify-between px-4 h-14">
          {/* Mobile: logo + menu */}
          <div className="flex items-center gap-3 lg:hidden">
            <button
              onClick={() => setMenuOpen(true)}
              className="p-2 -ml-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <span className="font-semibold text-gray-900">Caregiver Hub</span>
          </div>

          {/* Desktop: recipient switcher */}
          <div className="hidden lg:block">
            <RecipientSwitcher compact />
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <Link
              to="/emergency"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors"
            >
              <AlertTriangle size={14} />
              Emergency
            </Link>

            <button
              onClick={() => navigate('/settings')}
              className="relative p-2 text-gray-500 hover:text-gray-700 rounded-xl hover:bg-gray-100 transition-colors"
              aria-label="Notifications"
            >
              <Bell size={20} />
              {notifData?.count > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                  {notifData.count > 9 ? '9+' : notifData.count}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {menuOpen && <MobileMenu onClose={() => setMenuOpen(false)} />}
    </>
  );
}
