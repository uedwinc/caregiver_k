import { useForm } from 'react-hook-form';
import api from '../../lib/api';

interface Props {
  careCircleId: string;
  careRecipientId: string;
  existing?: any;
  onSuccess: () => void;
}

export default function MedForm({ careCircleId, careRecipientId, existing, onSuccess }: Props) {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: existing || {
      name: '', dosageText: '', instructions: '', scheduleType: 'daily',
      timesPerDay: '', pharmacyName: '', pharmacyPhone: '',
      refillThreshold: '', currentSupply: '', supplyUnit: 'pills',
    },
  });

  const onSubmit = async (data: any) => {
    const payload = {
      ...data,
      careCircleId,
      careRecipientId,
      timesPerDay: data.timesPerDay ? Number(data.timesPerDay) : undefined,
      currentSupply: data.currentSupply ? Number(data.currentSupply) : undefined,
    };

    if (existing) {
      await api.put(`/medications/${existing.id}?careCircleId=${careCircleId}`, payload);
    } else {
      await api.post('/medications', payload);
    }
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="label">Medication name *</label>
        <input {...register('name', { required: true })} className="input" placeholder="Metformin" />
      </div>
      <div>
        <label className="label">Dosage</label>
        <input {...register('dosageText')} className="input" placeholder="500mg twice daily" />
      </div>
      <div>
        <label className="label">Instructions</label>
        <input {...register('instructions')} className="input" placeholder="Take with food" />
      </div>
      <div>
        <label className="label">Schedule</label>
        <select {...register('scheduleType')} className="input">
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="as_needed">As needed</option>
          <option value="custom">Custom</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Current supply</label>
          <input {...register('currentSupply')} type="number" className="input" placeholder="30" />
        </div>
        <div>
          <label className="label">Unit</label>
          <input {...register('supplyUnit')} className="input" placeholder="pills" />
        </div>
      </div>
      <div>
        <label className="label">Refill threshold</label>
        <input {...register('refillThreshold')} className="input" placeholder="7 (days) or 10 (pills)" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Pharmacy</label>
          <input {...register('pharmacyName')} className="input" placeholder="CVS Pharmacy" />
        </div>
        <div>
          <label className="label">Pharmacy phone</label>
          <input {...register('pharmacyPhone')} className="input" placeholder="(555) 000-0000" />
        </div>
      </div>
      {existing && (
        <div>
          <label className="label">Status</label>
          <select {...register('status')} className="input">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      )}
      <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
        {isSubmitting ? 'Saving...' : existing ? 'Save changes' : 'Add medication'}
      </button>
    </form>
  );
}
