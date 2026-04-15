import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, CheckSquare, Check, Clock, AlertTriangle } from 'lucide-react';
import api from '../lib/api';
import { useAppStore } from '../store/appStore';
import { formatRelative, priorityColor } from '../lib/utils';
import Modal from '../components/ui/Modal';
import TaskForm from '../components/forms/TaskForm';

const statusTabs = [
  { value: '', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
];

export default function PlanPage() {
  const { activeCareCircle, activeCareRecipient } = useAppStore();
  const [statusFilter, setStatusFilter] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const qc = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', activeCareRecipient?.id, statusFilter],
    queryFn: () => api.get(`/tasks?careCircleId=${activeCareCircle?.id}&careRecipientId=${activeCareRecipient?.id}${statusFilter ? `&status=${statusFilter}` : ''}`).then(r => r.data),
    enabled: !!activeCareRecipient?.id,
  });

  const completeTask = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      api.put(`/tasks/${id}?careCircleId=${activeCareCircle?.id}`, { status: 'done', completionNote: note }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const priorityIcon = (p: string) => {
    if (p === 'urgent') return <AlertTriangle size={14} className="text-red-500" />;
    if (p === 'high') return <AlertTriangle size={14} className="text-yellow-500" />;
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plan</h1>
          <p className="text-sm text-gray-500 mt-0.5">Tasks & routines</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary">
          <Plus size={16} /> Add task
        </button>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {statusTabs.map(tab => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
              statusFilter === tab.value
                ? 'bg-brand-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-20 rounded-2xl" />)}
        </div>
      )}

      {!isLoading && tasks.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckSquare size={28} className="text-blue-400" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">No tasks yet</h3>
          <p className="text-sm text-gray-500 mb-6">Create tasks and routines to stay organized.</p>
          <button onClick={() => setShowAdd(true)} className="btn-primary">
            <Plus size={16} /> Add first task
          </button>
        </div>
      )}

      <div className="space-y-2">
        {tasks.map((task: any) => (
          <div
            key={task.id}
            className={`card cursor-pointer hover:shadow-card-hover transition-shadow ${task.status === 'done' ? 'opacity-60' : ''}`}
            onClick={() => setSelected(task)}
          >
            <div className="flex items-start gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (task.status !== 'done') completeTask.mutate({ id: task.id });
                }}
                className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  task.status === 'done'
                    ? 'bg-green-500 border-green-500'
                    : 'border-gray-300 hover:border-brand-500'
                }`}
              >
                {task.status === 'done' && <Check size={12} className="text-white" />}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {priorityIcon(task.priority)}
                  <p className={`font-medium text-gray-900 ${task.status === 'done' ? 'line-through text-gray-400' : ''}`}>
                    {task.title}
                  </p>
                </div>
                {task.description && (
                  <p className="text-sm text-gray-500 mt-0.5 truncate">{task.description}</p>
                )}
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  {task.dueDateTime && (
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock size={11} />
                      {formatRelative(task.dueDateTime)}
                    </span>
                  )}
                  {task.owner && (
                    <span className="text-xs text-gray-500">→ {task.owner.displayName}</span>
                  )}
                  <span className={`badge ${priorityColor(task.priority)}`}>{task.priority}</span>
                  {task.recurrenceRule !== 'none' && (
                    <span className="badge badge-gray capitalize">{task.recurrenceRule}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add task">
        <TaskForm
          careCircleId={activeCareCircle?.id || ''}
          careRecipientId={activeCareRecipient?.id || ''}
          onSuccess={() => {
            setShowAdd(false);
            qc.invalidateQueries({ queryKey: ['tasks'] });
          }}
        />
      </Modal>

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Edit task">
        {selected && (
          <TaskForm
            careCircleId={activeCareCircle?.id || ''}
            careRecipientId={activeCareRecipient?.id || ''}
            existing={selected}
            onSuccess={() => {
              setSelected(null);
              qc.invalidateQueries({ queryKey: ['tasks'] });
            }}
          />
        )}
      </Modal>
    </div>
  );
}
