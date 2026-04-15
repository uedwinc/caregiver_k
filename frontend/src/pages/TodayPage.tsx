import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Pill, Calendar, CheckSquare, Plus, RefreshCw, Car } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAppStore } from '../store/appStore';
import { formatTime, formatRelative, priorityColor } from '../lib/utils';
import { format } from 'date-fns';

function SkeletonCard() {
  return (
    <div className="card space-y-3">
      <div className="skeleton h-4 w-32" />
      <div className="skeleton h-12 w-full" />
      <div className="skeleton h-12 w-3/4" />
    </div>
  );
}

export default function TodayPage() {
  const { activeCareCircle, activeCareRecipient } = useAppStore();
  const navigate = useNavigate();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['today', activeCareRecipient?.id],
    queryFn: () => api.get(`/care-recipients/${activeCareRecipient?.id}/today?careCircleId=${activeCareCircle?.id}`).then(r => r.data),
    enabled: !!activeCareRecipient?.id,
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  const { medications = [], appointments = [], tasks = [], urgentTasks = [], refillAlerts = [] } = data || {};
  const hasAlerts = urgentTasks.length > 0 || refillAlerts.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {activeCareRecipient?.nickname || activeCareRecipient?.fullName}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{format(new Date(), 'EEEE, MMMM d')}</p>
        </div>
        <button onClick={() => refetch()} className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Critical alerts */}
      {hasAlerts && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-red-700 font-semibold text-sm">
            <AlertTriangle size={16} />
            Needs attention
          </div>
          {urgentTasks.map((t: any) => (
            <div key={t.id} className="flex items-center gap-2 text-sm text-red-600">
              <CheckSquare size={14} />
              <span className="font-medium">Urgent task:</span> {t.title}
            </div>
          ))}
          {refillAlerts.map((m: any) => (
            <div key={m.id} className="flex items-center gap-2 text-sm text-red-600">
              <Pill size={14} />
              <span className="font-medium">Refill needed:</span> {m.name} — {m.currentSupply} {m.supplyUnit} remaining
            </div>
          ))}
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Add Task', icon: CheckSquare, to: '/plan', color: 'bg-blue-50 text-blue-600' },
          { label: 'Add Med', icon: Pill, to: '/meds', color: 'bg-green-50 text-green-600' },
          { label: 'Add Appt', icon: Calendar, to: '/calendar', color: 'bg-purple-50 text-purple-600' },
          { label: 'Emergency', icon: AlertTriangle, to: '/emergency', color: 'bg-red-50 text-red-600' },
        ].map(({ label, icon: Icon, to, color }) => (
          <Link
            key={label}
            to={to}
            className="card-hover flex flex-col items-center gap-2 py-4 text-center"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
              <Icon size={18} />
            </div>
            <span className="text-xs font-medium text-gray-700">{label}</span>
          </Link>
        ))}
      </div>

      {/* Upcoming appointments */}
      {appointments.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-title">Upcoming appointments</h2>
            <Link to="/calendar" className="text-sm text-brand-600 font-medium">See all</Link>
          </div>
          <div className="space-y-3">
            {appointments.map((appt: any) => (
              <div key={appt.id} className="card">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Calendar size={18} className="text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{appt.title}</p>
                    {appt.providerName && <p className="text-sm text-gray-500">{appt.providerName}</p>}
                    <p className="text-sm text-brand-600 font-medium mt-0.5">{formatRelative(appt.startDateTime)}</p>
                    {appt.ridePlan && (
                      <div className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-500">
                        <Car size={12} />
                        Driver: {appt.ridePlan.driver?.displayName} · Pickup {formatTime(appt.ridePlan.pickupTime)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tasks due today */}
      {tasks.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-title">Tasks due soon</h2>
            <Link to="/plan" className="text-sm text-brand-600 font-medium">See all</Link>
          </div>
          <div className="space-y-2">
            {tasks.map((task: any) => (
              <div key={task.id} className="card flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-gray-300 rounded-md flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{task.title}</p>
                  {task.dueDateTime && (
                    <p className="text-xs text-gray-500 mt-0.5">{formatRelative(task.dueDateTime)}</p>
                  )}
                </div>
                <span className={`badge ${priorityColor(task.priority)}`}>{task.priority}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Medications today */}
      {medications.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-title">Medications</h2>
            <Link to="/meds" className="text-sm text-brand-600 font-medium">Manage</Link>
          </div>
          <div className="space-y-2">
            {medications.slice(0, 5).map((med: any) => (
              <div key={med.id} className="card flex items-center gap-3">
                <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Pill size={16} className="text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{med.name}</p>
                  {med.dosageText && <p className="text-xs text-gray-500">{med.dosageText}</p>}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => api.post(`/medications/${med.id}/log?careCircleId=${activeCareCircle?.id}`, { action: 'taken' })}
                    className="text-xs px-2.5 py-1 bg-green-50 text-green-700 rounded-lg font-medium hover:bg-green-100 transition-colors"
                  >
                    Taken
                  </button>
                  <button
                    onClick={() => api.post(`/medications/${med.id}/log?careCircleId=${activeCareCircle?.id}`, { action: 'skipped' })}
                    className="text-xs px-2.5 py-1 bg-gray-50 text-gray-600 rounded-lg font-medium hover:bg-gray-100 transition-colors"
                  >
                    Skip
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {!hasAlerts && appointments.length === 0 && tasks.length === 0 && medications.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckSquare size={28} className="text-brand-400" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">All clear today</h3>
          <p className="text-sm text-gray-500 mb-6">No tasks, appointments, or alerts for the next 24 hours.</p>
          <button onClick={() => navigate('/plan')} className="btn-primary">
            <Plus size={16} /> Add a task
          </button>
        </div>
      )}
    </div>
  );
}
