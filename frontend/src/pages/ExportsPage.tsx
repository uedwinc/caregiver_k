import { useState } from 'react';
import { Download, FileText, Table } from 'lucide-react';
import { useAppStore } from '../store/appStore';

export default function ExportsPage() {
  const { activeCareCircle, activeCareRecipient } = useAppStore();
  const [days, setDays] = useState(30);

  const baseUrl = `/api/exports/${activeCareCircle?.id}/${activeCareRecipient?.id}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Exports</h1>
        <p className="text-sm text-gray-500 mt-0.5">Download care records as PDF or CSV</p>
      </div>

      <div className="card">
        <label className="label">Time period</label>
        <select value={days} onChange={e => setDays(Number(e.target.value))} className="input w-auto">
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
          <option value={180}>Last 6 months</option>
          <option value={365}>Last year</option>
        </select>
      </div>

      <div className="space-y-3">
        <div className="card flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
              <FileText size={18} className="text-red-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Care Log PDF</p>
              <p className="text-sm text-gray-500">Log entries, completed tasks, med changes</p>
            </div>
          </div>
          <a
            href={`${baseUrl}/care-log/pdf?days=${days}`}
            className="btn-secondary"
            download
          >
            <Download size={16} /> PDF
          </a>
        </div>

        <div className="card flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
              <Table size={18} className="text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Care Log CSV</p>
              <p className="text-sm text-gray-500">Spreadsheet-ready log data</p>
            </div>
          </div>
          <a
            href={`${baseUrl}/care-log/csv?days=${days}`}
            className="btn-secondary"
            download
          >
            <Download size={16} /> CSV
          </a>
        </div>
      </div>

      <div className="bg-brand-50 border border-brand-100 rounded-2xl p-4">
        <p className="text-sm text-brand-700 font-medium mb-1">Premium feature</p>
        <p className="text-sm text-brand-600">Exports are available on the Premium plan. Upgrade to unlock full export capabilities.</p>
      </div>
    </div>
  );
}
