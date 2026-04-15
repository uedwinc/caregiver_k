import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { User, Lock, Eye, Moon, Type, Bell } from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/appStore';

export default function SettingsPage() {
  const { user, updateUser } = useAuthStore();
  const { highContrastMode, largeTextMode, toggleHighContrast, toggleLargeText } = useAppStore();
  const [profileSaved, setProfileSaved] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);
  const [pwError, setPwError] = useState('');

  const profileForm = useForm({ defaultValues: { displayName: user?.displayName || '', phone: user?.phone || '' } });
  const pwForm = useForm<{ currentPassword: string; newPassword: string; confirmPassword: string }>();

  const saveProfile = async (data: any) => {
    await api.put('/auth/me', data);
    updateUser(data);
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  };

  const changePassword = async (data: any) => {
    try {
      setPwError('');
      if (data.newPassword !== data.confirmPassword) { setPwError('Passwords do not match'); return; }
      await api.post('/auth/change-password', { currentPassword: data.currentPassword, newPassword: data.newPassword });
      pwForm.reset();
      setPwSaved(true);
      setTimeout(() => setPwSaved(false), 2000);
    } catch (err: any) {
      setPwError(err.response?.data?.error || 'Failed to change password');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your account and preferences</p>
      </div>

      {/* Profile */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <User size={18} className="text-gray-500" />
          <h2 className="font-semibold text-gray-900">Profile</h2>
        </div>
        <form onSubmit={profileForm.handleSubmit(saveProfile)} className="space-y-4">
          <div>
            <label className="label">Display name</label>
            <input {...profileForm.register('displayName', { required: true })} className="input" />
          </div>
          <div>
            <label className="label">Phone</label>
            <input {...profileForm.register('phone')} type="tel" className="input" placeholder="+1 (555) 000-0000" />
          </div>
          <div>
            <label className="label">Email</label>
            <input value={user?.email} disabled className="input bg-gray-50 text-gray-500" />
          </div>
          <button type="submit" className="btn-primary">
            {profileSaved ? '✓ Saved' : 'Save profile'}
          </button>
        </form>
      </div>

      {/* Password */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Lock size={18} className="text-gray-500" />
          <h2 className="font-semibold text-gray-900">Change Password</h2>
        </div>
        <form onSubmit={pwForm.handleSubmit(changePassword)} className="space-y-4">
          {pwError && <div className="p-3 bg-red-50 rounded-xl text-sm text-red-600">{pwError}</div>}
          <div>
            <label className="label">Current password</label>
            <input {...pwForm.register('currentPassword', { required: true })} type="password" className="input" />
          </div>
          <div>
            <label className="label">New password</label>
            <input {...pwForm.register('newPassword', { required: true, minLength: 8 })} type="password" className="input" />
          </div>
          <div>
            <label className="label">Confirm new password</label>
            <input {...pwForm.register('confirmPassword', { required: true })} type="password" className="input" />
          </div>
          <button type="submit" className="btn-primary">
            {pwSaved ? '✓ Password changed' : 'Change password'}
          </button>
        </form>
      </div>

      {/* Accessibility */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Eye size={18} className="text-gray-500" />
          <h2 className="font-semibold text-gray-900">Accessibility</h2>
        </div>
        <div className="space-y-3">
          <label className="flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-3">
              <Moon size={16} className="text-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-900">High contrast mode</p>
                <p className="text-xs text-gray-500">Increases color contrast</p>
              </div>
            </div>
            <button
              onClick={toggleHighContrast}
              className={`relative w-11 h-6 rounded-full transition-colors ${highContrastMode ? 'bg-brand-600' : 'bg-gray-200'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${highContrastMode ? 'translate-x-5' : ''}`} />
            </button>
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-3">
              <Type size={16} className="text-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-900">Large text</p>
                <p className="text-xs text-gray-500">Increases base font size</p>
              </div>
            </div>
            <button
              onClick={toggleLargeText}
              className={`relative w-11 h-6 rounded-full transition-colors ${largeTextMode ? 'bg-brand-600' : 'bg-gray-200'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${largeTextMode ? 'translate-x-5' : ''}`} />
            </button>
          </label>
        </div>
      </div>
    </div>
  );
}
