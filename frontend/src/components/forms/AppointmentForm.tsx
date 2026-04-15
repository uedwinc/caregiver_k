import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';

interface Props {
  careCircleId: string;
  careRecipientId: string;
  existing?: any;
  onSuccess: () => void;
}

export default function AppointmentForm({ careCircleId, careRecipientId, existing, onSuccess }: Props) {
  const [showRide, setShowRide] = useState(existing?.transportationNeeded || false);

  const { register, handleSubmit, watch, formState: { isSubmitting } } = useForm({
    defaultValues: existing || {
      title: '', providerName: '', locationName: '', address: '',
      startDateTime: '', endDateTime: '', notes: '', transportationNeeded: false,
    },
  });

  const rideForm = useForm({
    defaultValues: existing?.ridePlan || {
      driverMemberId: '', pickupTime: '', pickupLocation: '', dropoffLocation: '',
      instructions: '', backupDriverMemberId: '',
    },
  });

  const { data: circle } = useQuery({
    queryKey: ['circle-detail', careCircleId],
    queryFn: () => api.get(`/care-circles/${careCircleId}`).then(r => r.data),
    enabled: !!careCircleId,
  });

  const members = circle?.members || [];
  const transportationNeeded = watch('transportationNeeded');

  const onSubmit = async (data: any) => {
    const payload = { ...data, careCircleId, careRecipientId };
    let apptId = existing?.id;

    if (existing) {
      await api.put(`/appointments/${existing.id}?careCircleId=${careCircleId}`, payload);
    } else {
      const res = await api.post('/appointments', payload);
      apptId = res.data.id;
    }

    if (transportationNeeded && apptId) {
      const rideData = rideForm.getValues();
      if (rideData.driverMemberId) {
        await api.post(`/appointments/${apptId}/ride-plan?careCircleId=${careCircleId}`, rideData);
      }
    }

    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="label">Title *</label>
        <input {...register('title', { required: true })} className="input" placeholder="Cardiology follow-up" />
      </div>
      <div>
        <label className="label">Provider name</label>
        <input {...register('providerName')} className="input" placeholder="Dr. Johnson" />
      </div>
      <div>
        <label className="label">Location</label>
        <input {...register('locationName')} className="input" placeholder="City Medical Center" />
      </div>
      <div>
        <label className="label">Address</label>
        <input {...register('address')} className="input" placeholder="123 Medical Dr, Suite 200" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Start *</label>
          <input {...register('startDateTime', { required: true })} type="datetime-local" className="input" />
        </div>
        <div>
          <label className="label">End</label>
          <input {...register('endDateTime')} type="datetime-local" className="input" />
        </div>
      </div>
      <div>
        <label className="label">Notes</label>
        <textarea {...register('notes')} className="input min-h-[80px] resize-none" placeholder="Bring insurance card, fast for 12 hours..." />
      </div>

      <label className="flex items-center gap-3 cursor-pointer">
        <input {...register('transportationNeeded')} type="checkbox" className="w-4 h-4 rounded text-brand-600" />
        <span className="text-sm font-medium text-gray-700">Transportation needed</span>
      </label>

      {transportationNeeded && (
        <div className="bg-blue-50 rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium text-blue-800">Ride Plan</p>
          <div>
            <label className="label">Driver</label>
            <select {...rideForm.register('driverMemberId')} className="input">
              <option value="">Select driver</option>
              {members.map((m: any) => (
                <option key={m.id} value={m.id}>{m.displayName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Pickup time</label>
            <input {...rideForm.register('pickupTime')} type="datetime-local" className="input" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Pickup location</label>
              <input {...rideForm.register('pickupLocation')} className="input" placeholder="Home address" />
            </div>
            <div>
              <label className="label">Dropoff</label>
              <input {...rideForm.register('dropoffLocation')} className="input" placeholder="Clinic address" />
            </div>
          </div>
          <div>
            <label className="label">Backup driver</label>
            <select {...rideForm.register('backupDriverMemberId')} className="input">
              <option value="">None</option>
              {members.map((m: any) => (
                <option key={m.id} value={m.id}>{m.displayName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Instructions</label>
            <input {...rideForm.register('instructions')} className="input" placeholder="Use wheelchair entrance" />
          </div>
        </div>
      )}

      {existing && (
        <div>
          <label className="label">Status</label>
          <select {...register('status')} className="input">
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="canceled">Canceled</option>
          </select>
        </div>
      )}

      <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
        {isSubmitting ? 'Saving...' : existing ? 'Save changes' : 'Add appointment'}
      </button>
    </form>
  );
}
