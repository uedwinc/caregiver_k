import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Heart, Eye, EyeOff } from 'lucide-react';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';

interface FormData {
  email: string;
  password: string;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const { setActiveCareCircle, setActiveCareRecipient } = useAppStore();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const { register, handleSubmit, formState: { isSubmitting, errors } } = useForm<FormData>();

  const onSubmit = async (data: FormData) => {
    try {
      setError('');
      const res = await api.post('/auth/login', data);
      setAuth(res.data.user, res.data.token);

      // Load circles and auto-select first
      const circles = await api.get('/care-circles');
      const memberships = circles.data;

      if (memberships.length > 0) {
        const first = memberships[0];
        setActiveCareCircle({
          id: first.careCircle.id,
          name: first.careCircle.name,
          role: first.role,
          memberId: first.id,
        });

        if (first.careCircle.careRecipients.length > 0) {
          const r = first.careCircle.careRecipients[0];
          setActiveCareRecipient({ id: r.id, fullName: r.fullName, nickname: r.nickname, careCircleId: first.careCircle.id });
          navigate('/today');
        } else {
          navigate('/onboarding');
        }
      } else {
        navigate('/onboarding');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-600 rounded-2xl mb-4 shadow-lg">
            <Heart className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
          <p className="text-gray-500 mt-1 text-sm">Sign in to Caregiver Hub</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
                {error}
              </div>
            )}

            <div>
              <label className="label">Email</label>
              <input
                {...register('email', { required: 'Email is required' })}
                type="email"
                className="input"
                placeholder="you@example.com"
                autoComplete="email"
              />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  {...register('password', { required: 'Password is required' })}
                  type={showPassword ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full"
            >
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-brand-600 font-medium hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
