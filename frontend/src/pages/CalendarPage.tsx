import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Calendar, MapPin, Car, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, isSameDay, parseISO } from 'date-fns';
import api from '../lib/api';
import { useAppStore } from '../store/appStore';
import { formatTime } from '../lib/utils';
import Modal from '../components/ui/Modal';
import AppointmentForm from '../components/forms/AppointmentForm';

export default function CalendarPage() {
  const { activeCareCircle, activeCareRecipient } = useAppStore();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const qc = useQueryClient();

  const from = startOfMonth(currentMonth).toISOString();
  const to = endOfMonth(currentMonth).toISOString();

  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments', activeCareRecipient?.id, from, to],
    queryFn: () => api.get(`/appointments?careCircleId=${activeCareCircle?.id}&careRecipientId=${activeCareRecipient?.id}&from=${from}&to=${to}`).then(r => r.data),
    enabled: !!activeCareRecipient?.id,
  });

  const daysInMonth = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = [];
    const startDay = start.getDay();

    for (let i = 0; i < startDay; i++) days.push(null);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }
    return days;
  };

  const apptsByDate = (date: Date) =>
    appointments.filter((a: any) => isSameDay(parseISO(a.startDateTime), date));

  const selectedAppts = apptsByDate(selectedDate);

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
          <p className="text-sm text-gray-500 mt-0.5">Appointments & transportation</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary">
          <Plus size={16} /> Add appointment
        </button>
      </div>

      {/* Month calendar */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-gray-100 rounded-xl">
            <ChevronLeft size={18} />
          </button>
          <h2 className="font-semibold text-gray-900">{format(currentMonth, 'MMMM yyyy')}</h2>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-gray-100 rounded-xl">
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
            <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {daysInMonth().map((day, i) => {
            if (!day) return <div key={i} />;
            const hasAppts = apptsByDate(day).length > 0;
            const isSelected = isSameDay(day, selectedDate);
            const isToday = isSameDay(day, new Date());

            return (
              <button
                key={i}
                onClick={() => setSelectedDate(day)}
                className={`relative aspect-square flex flex-col items-center justify-center rounded-xl text-sm font-medium transition-colors ${
                  isSelected ? 'bg-brand-600 text-white' :
                  isToday ? 'bg-brand-50 text-brand-700' :
                  'hover:bg-gray-50 text-gray-700'
                }`}
              >
                {format(day, 'd')}
                {hasAppts && (
                  <span className={`absolute bottom-1 w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-brand-500'}`} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day appointments */}
      <div>
        <h2 className="section-title mb-3">{format(selectedDate, 'EEEE, MMMM d')}</h2>

        {selectedAppts.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <Calendar size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No appointments this day</p>
          </div>
        ) : (
          <div className="space-y-3">
            {selectedAppts.map((appt: any) => (
              <div key={appt.id} className="card cursor-pointer hover:shadow-card-hover" onClick={() => setSelected(appt)}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Calendar size={18} className="text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{appt.title}</p>
                    {appt.providerName && <p className="text-sm text-gray-500">{appt.providerName}</p>}
                    <p className="text-sm text-brand-600 font-medium mt-0.5">{formatTime(appt.startDateTime)}</p>
                    {appt.locationName && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                        <MapPin size={11} />
                        {appt.locationName}
                      </div>
                    )}
                    {appt.ridePlan && (
                      <div className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-500">
                        <Car size={12} />
                        Driver: {appt.ridePlan.driver?.displayName}
                      </div>
                    )}
                    <span className={`badge mt-2 ${
                      appt.status === 'scheduled' ? 'badge-blue' :
                      appt.status === 'completed' ? 'badge-green' : 'badge-gray'
                    }`}>{appt.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add appointment">
        <AppointmentForm
          careCircleId={activeCareCircle?.id || ''}
          careRecipientId={activeCareRecipient?.id || ''}
          onSuccess={() => {
            setShowAdd(false);
            qc.invalidateQueries({ queryKey: ['appointments'] });
          }}
        />
      </Modal>

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Edit appointment">
        {selected && (
          <AppointmentForm
            careCircleId={activeCareCircle?.id || ''}
            careRecipientId={activeCareRecipient?.id || ''}
            existing={selected}
            onSuccess={() => {
              setSelected(null);
              qc.invalidateQueries({ queryKey: ['appointments'] });
            }}
          />
        )}
      </Modal>
    </div>
  );
}
