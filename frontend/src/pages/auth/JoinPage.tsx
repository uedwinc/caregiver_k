import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Heart, Users } from 'lucide-react';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { roleLabel } from '../../lib/utils';

export default function JoinPage() {
  const { token } = useParams<{ token: string }>();
  const { isAuthenticated } = useAuthStore();

  const { data, isLoading, error } = useQuery({
    queryKey: ['invitation', token],
    queryFn: () => api.get(`/care-circles/invitations/${token}`).then(r => r.data),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Heart className="w-7 h-7 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Invitation not found</h1>
          <p className="text-gray-500 text-sm mb-6">This invitation may have expired or already been used.</p>
          <Link to="/login" className="btn-primary">Go to login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-600 rounded-2xl mb-4 shadow-lg">
          <Users className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">You're invited!</h1>
        <p className="text-gray-500 text-sm mb-6">
          Join <strong className="text-gray-900">{data.careCircleName}</strong> as a{' '}
          <strong className="text-gray-900">{roleLabel(data.role)}</strong>
        </p>

        <div className="card mb-6">
          <div className="flex items-center gap-3 p-2">
            <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-brand-600" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-gray-900">{data.careCircleName}</p>
              <p className="text-sm text-gray-500">{roleLabel(data.role)}</p>
            </div>
          </div>
        </div>

        {isAuthenticated ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">You're already signed in. Accept this invitation to join.</p>
            <button
              onClick={async () => {
                await api.post('/auth/register', { inviteToken: token });
                window.location.href = '/today';
              }}
              className="btn-primary w-full"
            >
              Accept invitation
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <Link
              to={`/register?invite=${token}`}
              className="btn-primary w-full block"
            >
              Create account & join
            </Link>
            <Link
              to={`/login?invite=${token}`}
              className="btn-secondary w-full block"
            >
              Sign in & join
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
