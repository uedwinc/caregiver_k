import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';

interface Props {
  careCircleId: string;
  careRecipientId: string;
  existing?: any;
  onSuccess: () => void;
}

export default function TaskForm({ careCircleId, careRecipientId, existing, onSuccess }: Props) {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: existing || {
      title: '', description: '', dueDateTime: '', recurrenceRule: 'none',
      priority: 'medium', ownerMemberId: '', backupMemberId: '',
    },
  });

  const { data: circle } = useQuery({
    queryKey: ['circle-detail', careCircleId],
    queryFn: () => api.get(`/care-circles/${careCircleId}`).then(r => r.data),
    enabled: !!careCircleId,
  });

  const members = circle?.members || [];

  const onSubmit = async (data: any) => {
    const payload = { ...data, careCircleId, careRecipientId };
    if (existing) {
      await api.put(`/tasks/${existing.id}?careCircleId=${careCircleId}`, payload);
    } else {
      await api.post('/tasks', payload);
    }
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="label">Task title *</label>
        <input {...register('title', { required: true })} className="input" placeholder="Pick up prescription" />
      </div>
      <div>
        <label className="label">Description</label>
        <textarea {...register('description')} className="input min-h-[80px] resize-none" placeholder="Additional details..." />
      </div>
      <div>
        <label className="label">Due date & time</label>
        <input {...register('dueDateTime')} type="datetime-local" className="input" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Priority</label>
          <select {...register('priority')} className="input">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
        <div>
          <label className="label">Recurrence</label>
          <select {...register('recurrenceRule')} className="input">
            <option value="none">None</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
      </div>
      <div>
        <label className="label">Assign to</label>
        <select {...register('ownerMemberId')} className="input">
          <option value="">Unassigned</option>
          {members.map((m: any) => (
            <option key={m.id} value={m.id}>{m.displayName}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Backup assignee</label>
        <select {...register('backupMemberId')} className="input">
          <option value="">None</option>
          {members.map((m: any) => (
            <option key={m.id} value={m.id}>{m.displayName}</option>
          ))}
        </select>
      </div>
      {existing && (
        <>
          <div>
            <label className="label">Status</label>
            <select {...register('status')} className="input">
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
            </select>
          </div>
          <div>
            <label className="label">Completion note</label>
            <input {...register('completionNote')} className="input" placeholder="e.g. Refill called in at 2:15pm" />
          </div>
        </>
      )}
      <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
        {isSubmitting ? 'Saving...' : existing ? 'Save changes' : 'Add task'}
      </button>
    </form>
  );
}
