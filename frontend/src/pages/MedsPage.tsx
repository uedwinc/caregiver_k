import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pill, ChevronRight, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import api from '../lib/api';
import { useAppStore } from '../store/appStore';
import Modal from '../components/ui/Modal';
import MedForm from '../components/forms/MedForm';

export default function MedsPage() {
  const { activeCareCircle, activeCareRecipient } = useAppStore();
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const qc = useQueryClient();

  const { data: meds = [], isLoading } = useQuery({
    queryKey: ['medications', activeCareRecipient?.id],
    queryFn: () => api.get(`/medications?careCircleId=${activeCareCircle?.id}&careRecipientId=${activeCareRecipient?.id}`).then(r => r.data),
    enabled: !!activeCareRecipient?.id,
  });

  const logMed = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) =>
      api.post(`/medications/${id}/log?careCircleId=${activeCareCircle?.id}`, { action }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['medications'] }),
  });

  const activeMeds = meds.filter((m: any) => m.status === 'active');
  const inactiveMeds = meds.filter((m: any) => m.status === 'inactive');

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <div key={i} className="skeleton h-20 rounded-2xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Medications</h1>
          <p className="text-sm text-gray-500 mt-0.5">{activeMeds.length} active</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary">
          <Plus size={16} /> Add med
        </button>
      </div>

      {activeMeds.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Pill size={28} className="text-green-400" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">No medications yet</h3>
          <p className="text-sm text-gray-500 mb-6">Add medications to track schedules and refills.</p>
          <button onClick={() => setShowAdd(true)} className="btn-primary">
            <Plus size={16} /> Add first medication
          </button>
        </div>
      )}

      {activeMeds.length > 0 && (
        <div className="space-y-3">
          {activeMeds.map((med: any) => (
            <div key={med.id} className="card">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Pill size={18} className="text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900">{med.name}</p>
                      {med.dosageText && <p className="text-sm text-gray-500">{med.dosageText}</p>}
                      {med.instructions && <p className="text-xs text-gray-400 mt-0.5">{med.instructions}</p>}
                    </div>
                    <button onClick={() => setSelected(med)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
                      <ChevronRight size={16} />
                    </button>
                  </div>

                  {/* Schedule */}
                  <div className="flex items-center gap-3 mt-2">
                    <span className="badge badge-blue capitalize">{med.scheduleType.replace('_', ' ')}</span>
                    {med.times?.length > 0 && (
                      <span className="text-xs text-gray-500">{med.times.join(', ')}</span>
                    )}
                  </div>

                  {/* Supply */}
                  {med.currentSupply !== null && (
                    <div className="flex items-center gap-1.5 mt-2">
                      {parseFloat(med.refillThreshold) >= med.currentSupply ? (
                        <AlertCircle size={13} className="text-red-500" />
                      ) : (
                        <CheckCircle size={13} className="text-green-500" />
                      )}
                      <span className="text-xs text-gray-500">
                        {med.currentSupply} {med.supplyUnit} remaining
                        {med.refillThreshold && ` · Refill at ${med.refillThreshold}`}
                      </span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => logMed.mutate({ id: med.id, action: 'taken' })}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-green-50 text-green-700 rounded-lg font-medium hover:bg-green-100 transition-colors"
                    >
                      <CheckCircle size={12} /> Mark taken
                    </button>
                    <button
                      onClick={() => logMed.mutate({ id: med.id, action: 'skipped' })}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-gray-50 text-gray-600 rounded-lg font-medium hover:bg-gray-100 transition-colors"
                    >
                      <XCircle size={12} /> Skip
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {inactiveMeds.length > 0 && (
        <section>
          <h2 className="section-title text-gray-400 mb-3">Inactive</h2>
          <div className="space-y-2">
            {inactiveMeds.map((med: any) => (
              <div key={med.id} className="card opacity-60">
                <div className="flex items-center gap-3">
                  <Pill size={16} className="text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">{med.name}</p>
                    {med.dosageText && <p className="text-xs text-gray-400">{med.dosageText}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add medication">
        <MedForm
          careCircleId={activeCareCircle?.id || ''}
          careRecipientId={activeCareRecipient?.id || ''}
          onSuccess={() => {
            setShowAdd(false);
            qc.invalidateQueries({ queryKey: ['medications'] });
          }}
        />
      </Modal>

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Edit medication">
        {selected && (
          <MedForm
            careCircleId={activeCareCircle?.id || ''}
            careRecipientId={activeCareRecipient?.id || ''}
            existing={selected}
            onSuccess={() => {
              setSelected(null);
              qc.invalidateQueries({ queryKey: ['medications'] });
            }}
          />
        )}
      </Modal>
    </div>
  );
}
