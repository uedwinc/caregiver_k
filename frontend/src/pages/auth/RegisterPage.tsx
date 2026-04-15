import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Heart, Eye, EyeOff } from 'lucide-react';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

interface FormData {
  displayName: string;
  email: string;
  phone?: string;
  password: string;
  confirmPassword: string;
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const { register, handleSubmit, watch, formState: { isSubmitting, errors } } = useForm<FormData>();
  const password = watch('password');

  const onSubmit = async (data: FormData) => {
    try {
      setError('');
      const res = await api.post('/auth/register', {
        displayName: data.displayName,
        email: data.email,
        phone: data.phone,
        password: data.password,
      });
      setAuth(res.data.user, res.data.token);
      navigate('/onboarding');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-600 rounded-2xl mb-4 shadow-lg">
            <Heart className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
          <p className="text-gray-500 mt-1 text-sm">Start coordinating care today</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
                {error}
              </div>
            )}

            <div>
              <label className="label">Your name</label>
              <input
                {...register('displayName', { required: 'Name is required' })}
                type="text"
                className="input"
                placeholder="Jane Smith"
                autoComplete="name"
              />
              {errors.displayName && <p className="mt-1 text-xs text-red-500">{errors.displayName.message}</p>}
            </div>

            <div>
              <label className="label">Email</label>
              <input
                {...register('email', { required: 'Email is required', pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email' } })}
                type="email"
                className="input"
                placeholder="you@example.com"
                autoComplete="email"
              />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div>
              <label className="label">Phone <span className="text-gray-400 font-normal">(optional)</span></label>
              <input
                {...register('phone')}
                type="tel"
                className="input"
                placeholder="+1 (555) 000-0000"
                autoComplete="tel"
              />
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  {...register('password', { required: 'Password is required', minLength: { value: 8, message: 'At least 8 characters' } })}
                  type={showPassword ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="Min. 8 characters"
                  autoComplete="new-password"
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

            <div>
              <label className="label">Confirm password</label>
              <input
                {...register('confirmPassword', {
                  required: 'Please confirm your password',
                  validate: v => v === password || 'Passwords do not match',
                })}
                type="password"
                className="input"
                placeholder="••••••••"
                autoComplete="new-password"
              />
              {errors.confirmPassword && <p className="mt-1 text-xs text-red-500">{errors.confirmPassword.message}</p>}
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-600 font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
