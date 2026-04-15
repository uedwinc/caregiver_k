import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, BookOpen, Tag } from 'lucide-react';
import api from '../lib/api';
import { useAppStore } from '../store/appStore';
import { timeAgo, logTypeLabel, logTypeColor } from '../lib/utils';
import Modal from '../components/ui/Modal';
import { useForm } from 'react-hook-form';

const logTypes = ['note', 'symptom', 'vitals', 'med_change', 'incident', 'appointment_summary', 'insurance'];

export default function CareLogPage() {
  const { activeCareCircle, activeCareRecipient } = useAppStore();
  const [showAdd, setShowAdd] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');
  const qc = useQueryClient();

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['care-logs', activeCareRecipient?.id, typeFilter],
    queryFn: () => api.get(`/care-logs?careCircleId=${activeCareCircle?.id}&careRecipientId=${activeCareRecipient?.id}${typeFilter ? `&type=${typeFilter}` : ''}`).then(r => r.data),
    enabled: !!activeCareRecipient?.id,
  });

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<{
    type: string; title: string; body: string; tags: string;
  }>();

  const onSubmit = async (data: any) => {
    await api.post('/care-logs', {
      ...data,
      tags: data.tags ? data.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
      careCircleId: activeCareCircle?.id,
      careRecipientId: activeCareRecipient?.id,
    });
    reset();
    setShowAdd(false);
    qc.invalidateQueries({ queryKey: ['care-logs'] });
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Care Log</h1>
          <p className="text-sm text-gray-500 mt-0.5">{entries.length} entries</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary">
          <Plus size={16} /> Add entry
        </button>
      </div>

      {/* Type filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setTypeFilter('')}
          className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
            !typeFilter ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          All
        </button>
        {logTypes.map(t => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
              typeFilter === t ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {logTypeLabel(t)}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="skeleton h-24 rounded-2xl" />)}</div>
      )}

      {!isLoading && entries.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BookOpen size={28} className="text-blue-400" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">No log entries yet</h3>
          <p className="text-sm text-gray-500 mb-6">Track symptoms, vitals, notes, and more.</p>
          <button onClick={() => setShowAdd(true)} className="btn-primary">
            <Plus size={16} /> Add first entry
          </button>
        </div>
      )}

      <div className="space-y-3">
        {entries.map((entry: any) => (
          <div key={entry.id} className="card">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`badge ${logTypeColor(entry.type)}`}>{logTypeLabel(entry.type)}</span>
                  <span className="text-xs text-gray-400">{timeAgo(entry.createdAt)}</span>
                </div>
                <p className="font-semibold text-gray-900">{entry.title}</p>
                {entry.body && <p className="text-sm text-gray-600 mt-1 line-clamp-3">{entry.body}</p>}
                {Array.isArray(entry.tags) && entry.tags.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <Tag size={11} className="text-gray-400" />
                    {entry.tags.map((tag: string) => (
                      <span key={tag} className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add log entry">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Type</label>
            <select {...register('type', { required: true })} className="input">
              {logTypes.map(t => <option key={t} value={t}>{logTypeLabel(t)}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Title</label>
            <input {...register('title', { required: true })} className="input" placeholder="Brief summary..." />
          </div>
          <div>
            <label className="label">Details <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea {...register('body')} className="input min-h-[100px] resize-none" placeholder="More details..." />
          </div>
          <div>
            <label className="label">Tags <span className="text-gray-400 font-normal">(comma-separated)</span></label>
            <input {...register('tags')} className="input" placeholder="pain, morning, medication" />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
              {isSubmitting ? 'Saving...' : 'Add entry'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
