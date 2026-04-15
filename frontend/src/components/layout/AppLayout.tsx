import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import TopBar from './TopBar';

export default function AppLayout() {
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:z-50">
        <Sidebar />
      </aside>

      {/* Main content */}
      <div className="flex flex-col flex-1 lg:pl-64 min-h-screen">
        <TopBar />
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-6">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50">
        <BottomNav />
      </nav>
    </div>
  );
}
