import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Heart size={28} className="text-brand-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Page not found</h1>
        <p className="text-gray-500 mb-6">The page you're looking for doesn't exist.</p>
        <Link to="/today" className="btn-primary">Go to Today</Link>
      </div>
    </div>
  );
}
