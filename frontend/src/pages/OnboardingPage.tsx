import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Heart, Users, User, FileText, Pill, Calendar, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/appStore';

const steps = [
  { id: 1, title: 'Create Care Circle', icon: Users, description: 'Name your family care team' },
  { id: 2, title: 'Add Care Recipient', icon: User, description: 'Who are you caring for?' },
  { id: 3, title: 'Emergency Card', icon: FileText, description: 'Key medical information' },
  { id: 4, title: 'First Medication', icon: Pill, description: 'Add a medication (optional)' },
  { id: 5, title: 'First Appointment', icon: Calendar, description: 'Add an appointment (optional)' },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [circleId, setCircleId] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [memberId, setMemberId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { setActiveCareCircle, setActiveCareRecipient } = useAppStore();

  const circleForm = useForm<{ name: string }>();
  const recipientForm = useForm<{ fullName: string; nickname: string; dob: string; address: string }>();
  const emergencyForm = useForm<{
    conditions: string; allergies: string;
    primaryDoctorName: string; primaryDoctorPhone: string;
    preferredHospital: string; insuranceProvider: string; insuranceMemberId: string;
  }>();
  const medForm = useForm<{ name: string; dosageText: string; scheduleType: string }>();
  const apptForm = useForm<{ title: string; providerName: string; startDateTime: string }>();

  const handleCircle = async (data: { name: string }) => {
    try {
      setLoading(true); setError('');
      const res = await api.post('/care-circles', { name: data.name });
      setCircleId(res.data.id);

      // Get member ID
      const circles = await api.get('/care-circles');
      const circle = circles.data.find((m: any) => m.careCircle.id === res.data.id);
      if (circle) setMemberId(circle.id);

      setStep(2);
    } catch { setError('Failed to create care circle'); }
    finally { setLoading(false); }
  };

  const handleRecipient = async (data: any) => {
    try {
      setLoading(true); setError('');
      const res = await api.post('/care-recipients', { ...data, careCircleId: circleId });
      setRecipientId(res.data.id);
      setActiveCareCircle({ id: circleId, name: circleForm.getValues('name'), role: 'owner', memberId });
      setActiveCareRecipient({ id: res.data.id, fullName: res.data.fullName, nickname: res.data.nickname, careCircleId: circleId });
      setStep(3);
    } catch { setError('Failed to create care recipient'); }
    finally { setLoading(false); }
  };

  const handleEmergency = async (data: any) => {
    try {
      setLoading(true); setError('');
      await api.put(`/emergency/${circleId}/${recipientId}`, data);
      setStep(4);
    } catch { setError('Failed to save emergency card'); }
    finally { setLoading(false); }
  };

  const handleMed = async (data: any) => {
    if (!data.name) { setStep(5); return; }
    try {
      setLoading(true); setError('');
      await api.post('/medications', { ...data, careCircleId: circleId, careRecipientId: recipientId });
      setStep(5);
    } catch { setError('Failed to add medication'); }
    finally { setLoading(false); }
  };

  const handleAppt = async (data: any) => {
    if (!data.title) { navigate('/today'); return; }
    try {
      setLoading(true); setError('');
      await api.post('/appointments', { ...data, careCircleId: circleId, careRecipientId: recipientId });
      navigate('/today');
    } catch { setError('Failed to add appointment'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-brand-600 rounded-2xl mb-3 shadow-lg">
            <Heart className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Set up Caregiver Hub</h1>
          <p className="text-gray-500 text-sm mt-1">Welcome, {user?.displayName}. Let's get started.</p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-between mb-8 px-2">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                step > s.id ? 'bg-green-500 text-white' :
                step === s.id ? 'bg-brand-600 text-white' :
                'bg-gray-200 text-gray-500'
              }`}>
                {step > s.id ? <CheckCircle size={14} /> : s.id}
              </div>
              {i < steps.length - 1 && (
                <div className={`h-0.5 w-8 mx-1 transition-colors ${step > s.id ? 'bg-green-400' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="card">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">{error}</div>
          )}

          {step === 1 && (
            <form onSubmit={circleForm.handleSubmit(handleCircle)} className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Name your Care Circle</h2>
                <p className="text-sm text-gray-500 mb-4">This is your family's shared care team name.</p>
                <label className="label">Care Circle name</label>
                <input
                  {...circleForm.register('name', { required: true })}
                  className="input"
                  placeholder="e.g. The Johnson Family"
                  autoFocus
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? 'Creating...' : 'Continue'} <ArrowRight size={16} />
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={recipientForm.handleSubmit(handleRecipient)} className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Add care recipient</h2>
                <p className="text-sm text-gray-500 mb-4">Who is this care circle for?</p>
              </div>
              <div>
                <label className="label">Full name</label>
                <input {...recipientForm.register('fullName', { required: true })} className="input" placeholder="Margaret Johnson" />
              </div>
              <div>
                <label className="label">Nickname <span className="text-gray-400 font-normal">(optional)</span></label>
                <input {...recipientForm.register('nickname')} className="input" placeholder="Mom, Grandma..." />
              </div>
              <div>
                <label className="label">Date of birth <span className="text-gray-400 font-normal">(optional)</span></label>
                <input {...recipientForm.register('dob')} type="date" className="input" />
              </div>
              <div>
                <label className="label">Address <span className="text-gray-400 font-normal">(optional)</span></label>
                <input {...recipientForm.register('address')} className="input" placeholder="123 Main St, City, State" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1">
                  <ArrowLeft size={16} /> Back
                </button>
                <button type="submit" disabled={loading} className="btn-primary flex-1">
                  {loading ? 'Saving...' : 'Continue'} <ArrowRight size={16} />
                </button>
              </div>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={emergencyForm.handleSubmit(handleEmergency)} className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Emergency card</h2>
                <p className="text-sm text-gray-500 mb-4">Critical info for emergencies. You can update this anytime.</p>
              </div>
              <div>
                <label className="label">Medical conditions</label>
                <textarea {...emergencyForm.register('conditions')} className="input min-h-[80px] resize-none" placeholder="Diabetes Type 2, Hypertension..." />
              </div>
              <div>
                <label className="label">Allergies</label>
                <input {...emergencyForm.register('allergies')} className="input" placeholder="Penicillin, Shellfish..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Primary doctor</label>
                  <input {...emergencyForm.register('primaryDoctorName')} className="input" placeholder="Dr. Smith" />
                </div>
                <div>
                  <label className="label">Doctor phone</label>
                  <input {...emergencyForm.register('primaryDoctorPhone')} className="input" placeholder="(555) 000-0000" />
                </div>
              </div>
              <div>
                <label className="label">Preferred hospital</label>
                <input {...emergencyForm.register('preferredHospital')} className="input" placeholder="City General Hospital" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Insurance provider</label>
                  <input {...emergencyForm.register('insuranceProvider')} className="input" placeholder="Blue Cross" />
                </div>
                <div>
                  <label className="label">Member ID</label>
                  <input {...emergencyForm.register('insuranceMemberId')} className="input" placeholder="XYZ123456" />
                </div>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(2)} className="btn-secondary flex-1">
                  <ArrowLeft size={16} /> Back
                </button>
                <button type="submit" disabled={loading} className="btn-primary flex-1">
                  {loading ? 'Saving...' : 'Continue'} <ArrowRight size={16} />
                </button>
              </div>
            </form>
          )}

          {step === 4 && (
            <form onSubmit={medForm.handleSubmit(handleMed)} className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Add a medication</h2>
                <p className="text-sm text-gray-500 mb-4">Optional — you can add more later.</p>
              </div>
              <div>
                <label className="label">Medication name</label>
                <input {...medForm.register('name')} className="input" placeholder="Metformin" />
              </div>
              <div>
                <label className="label">Dosage</label>
                <input {...medForm.register('dosageText')} className="input" placeholder="500mg twice daily" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(3)} className="btn-secondary flex-1">
                  <ArrowLeft size={16} /> Back
                </button>
                <button type="submit" disabled={loading} className="btn-primary flex-1">
                  {loading ? 'Saving...' : 'Continue'} <ArrowRight size={16} />
                </button>
              </div>
              <button type="button" onClick={() => setStep(5)} className="btn-ghost w-full text-sm">
                Skip for now
              </button>
            </form>
          )}

          {step === 5 && (
            <form onSubmit={apptForm.handleSubmit(handleAppt)} className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Add an appointment</h2>
                <p className="text-sm text-gray-500 mb-4">Optional — you can add more later.</p>
              </div>
              <div>
                <label className="label">Appointment title</label>
                <input {...apptForm.register('title')} className="input" placeholder="Cardiology follow-up" />
              </div>
              <div>
                <label className="label">Provider name</label>
                <input {...apptForm.register('providerName')} className="input" placeholder="Dr. Johnson" />
              </div>
              <div>
                <label className="label">Date & time</label>
                <input {...apptForm.register('startDateTime')} type="datetime-local" className="input" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(4)} className="btn-secondary flex-1">
                  <ArrowLeft size={16} /> Back
                </button>
                <button type="submit" disabled={loading} className="btn-primary flex-1">
                  {loading ? 'Saving...' : 'Finish setup'} <CheckCircle size={16} />
                </button>
              </div>
              <button type="button" onClick={() => navigate('/today')} className="btn-ghost w-full text-sm">
                Skip — go to Today
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
