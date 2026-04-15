import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, FolderOpen, FileText, Upload, Lock, Pin, Download, Trash2 } from 'lucide-react';
import api from '../lib/api';
import { useAppStore } from '../store/appStore';
import { formatDate } from '../lib/utils';
import Modal from '../components/ui/Modal';

const categories = ['All', 'ID', 'Insurance', 'POA', 'Medical', 'Discharge', 'Other'];

export default function VaultPage() {
  const { activeCareCircle, activeCareRecipient } = useAppStore();
  const [category, setCategory] = useState('All');
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const [form, setForm] = useState({
    title: '',
    category: 'Medical',
    sensitivityLevel: 'normal',
    pinnedToEmergency: false,
  });

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['documents', activeCareRecipient?.id, category],
    queryFn: () => api.get(`/documents?careCircleId=${activeCareCircle?.id}&careRecipientId=${activeCareRecipient?.id}${category !== 'All' ? `&category=${category}` : ''}`).then(r => r.data),
    enabled: !!activeCareRecipient?.id,
  });

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file || !form.title) { setUploadError('Please select a file and enter a title'); return; }

    try {
      setUploading(true); setUploadError('');
      const fd = new FormData();
      fd.append('file', file);
      fd.append('title', form.title);
      fd.append('category', form.category);
      fd.append('sensitivityLevel', form.sensitivityLevel);
      fd.append('pinnedToEmergency', String(form.pinnedToEmergency));
      fd.append('careRecipientId', activeCareRecipient?.id || '');

      await api.post(`/documents/upload?careCircleId=${activeCareCircle?.id}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setShowUpload(false);
      setForm({ title: '', category: 'Medical', sensitivityLevel: 'normal', pinnedToEmergency: false });
      qc.invalidateQueries({ queryKey: ['documents'] });
    } catch (err: any) {
      setUploadError(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const deleteDoc = async (id: string) => {
    if (!confirm('Delete this document?')) return;
    await api.delete(`/documents/${id}?careCircleId=${activeCareCircle?.id}`);
    qc.invalidateQueries({ queryKey: ['documents'] });
  };

  const categoryIcon = (cat: string) => {
    const colors: Record<string, string> = {
      ID: 'bg-blue-50 text-blue-600',
      Insurance: 'bg-green-50 text-green-600',
      POA: 'bg-purple-50 text-purple-600',
      Medical: 'bg-red-50 text-red-600',
      Discharge: 'bg-yellow-50 text-yellow-600',
      Other: 'bg-gray-50 text-gray-600',
    };
    return colors[cat] || 'bg-gray-50 text-gray-600';
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Document Vault</h1>
          <p className="text-sm text-gray-500 mt-0.5">{docs.length} documents</p>
        </div>
        <button onClick={() => setShowUpload(true)} className="btn-primary">
          <Upload size={16} /> Upload
        </button>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
              category === cat ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-20 rounded-2xl" />)}
        </div>
      )}

      {!isLoading && docs.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FolderOpen size={28} className="text-gray-400" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">No documents yet</h3>
          <p className="text-sm text-gray-500 mb-6">Upload insurance cards, POA, medical records, and more.</p>
          <button onClick={() => setShowUpload(true)} className="btn-primary">
            <Upload size={16} /> Upload first document
          </button>
        </div>
      )}

      <div className="space-y-3">
        {docs.map((doc: any) => (
          <div key={doc.id} className="card">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${categoryIcon(doc.category)}`}>
                <FileText size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-900">{doc.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{doc.category} · {formatDate(doc.uploadedAt)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {doc.sensitivityLevel === 'sensitive' && (
                      <Lock size={14} className="text-yellow-500" title="Sensitive" />
                    )}
                    {doc.pinnedToEmergency && (
                      <Pin size={14} className="text-red-500" title="Pinned to Emergency" />
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-brand-50 text-brand-700 rounded-lg font-medium hover:bg-brand-100 transition-colors"
                  >
                    <Download size={12} /> View
                  </a>
                  <button
                    onClick={() => deleteDoc(doc.id)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition-colors"
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Upload modal */}
      <Modal open={showUpload} onClose={() => setShowUpload(false)} title="Upload document">
        <div className="space-y-4">
          {uploadError && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">{uploadError}</div>
          )}

          <div>
            <label className="label">Title</label>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="input"
              placeholder="Insurance Card 2024"
            />
          </div>

          <div>
            <label className="label">Category</label>
            <select
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="input"
            >
              {['ID', 'Insurance', 'POA', 'Medical', 'Discharge', 'Other'].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Sensitivity</label>
            <select
              value={form.sensitivityLevel}
              onChange={e => setForm(f => ({ ...f, sensitivityLevel: e.target.value }))}
              className="input"
            >
              <option value="normal">Normal</option>
              <option value="sensitive">Sensitive (restricted access)</option>
            </select>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.pinnedToEmergency}
              onChange={e => setForm(f => ({ ...f, pinnedToEmergency: e.target.checked }))}
              className="w-4 h-4 rounded text-brand-600"
            />
            <span className="text-sm text-gray-700">Pin to Emergency Mode</span>
          </label>

          <div>
            <label className="label">File</label>
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-brand-300 hover:bg-brand-50 transition-colors"
            >
              <Upload size={24} className="mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-500">Click to select file</p>
              <p className="text-xs text-gray-400 mt-1">PDF, images, Word docs up to 10MB</p>
            </div>
            <input ref={fileRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
          </div>

          <div className="flex gap-3">
            <button onClick={() => setShowUpload(false)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleUpload} disabled={uploading} className="btn-primary flex-1">
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
