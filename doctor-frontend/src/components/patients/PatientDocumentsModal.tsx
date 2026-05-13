import React, { useState, useEffect } from 'react';
import { X, FileText, Upload, Trash2, Download, Loader2, AlertCircle, Activity, Calendar } from 'lucide-react';
import api from '@/services/api';

type Document = {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
};

interface PatientDocumentsModalProps {
  patient: { patientId: string; name: string };
  onClose: () => void;
}

const PatientDocumentsModal: React.FC<PatientDocumentsModalProps> = ({ patient, onClose }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/doctor/documents/${patient.patientId}`);
      setDocuments(response.data);
    } catch (err) {
      console.error('Failed to fetch documents', err);
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [patient.patientId]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError('File size exceeds 10MB limit');
      setSuccessMessage('');
      return;
    }

    setUploading(true);
    setError('');
    setSuccessMessage('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('patientId', patient.patientId);

    try {
      await api.post('/doctor/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccessMessage('Document uploaded successfully.');
      fetchDocuments();
    } catch (err) {
      console.error('Upload failed', err);
      setError('Upload failed. Please try again.');
      setSuccessMessage('');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      await api.delete(`/doctor/documents/${documentId}`);
      setDocuments(documents.filter((d) => d.id !== documentId));
    } catch (err) {
      console.error('Delete failed', err);
      alert('Failed to delete document');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownload = async (event: React.MouseEvent, doc: Document) => {
    event.stopPropagation();
    try {
      const response = await fetch(getDocumentUrl(doc.fileUrl));
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = doc.fileName;
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed', err);
      window.open(getDocumentUrl(doc.fileUrl), '_blank', 'noopener,noreferrer');
    }
  };

  const getDocumentUrl = (fileUrl: string) => `${api.defaults.baseURL?.replace('/api', '')}${fileUrl}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#142e26]/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[26px] bg-white shadow-2xl animate-in zoom-in duration-200 sm:rounded-[32px]">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 bg-[#f8fbf9] p-5 sm:items-center sm:p-6 lg:p-8">
          <div className="min-w-0">
            <h3 className="text-xl font-black text-[#142e26]">Patient Documents</h3>
            <p className="text-xs text-[#607d74] font-medium">Managing files for <span className="font-bold text-[#1faa62]">{patient.name}</span></p>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 transition-colors hover:bg-white" type="button">
            <X className="w-6 h-6 text-[#607d74]" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:space-y-6 sm:p-6 lg:p-8">
          {/* Upload Area */}
          <div className="relative group">
            <input
              type="file"
              id="file-upload"
              className="hidden"
              onChange={handleFileUpload}
              disabled={uploading}
            />
            <label
              htmlFor="file-upload"
              className={`flex min-h-[8rem] w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-6 text-center transition-all ${
                uploading ? 'bg-gray-50 border-gray-200 cursor-not-allowed' : 'bg-[#f8fbf9] border-[#1faa62]/30 hover:border-[#1faa62] hover:bg-[#f1f6f3]'
              }`}
            >
              {uploading ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-[28px] bg-emerald-50 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                  </div>
                  <span className="text-sm font-black text-emerald-600 uppercase tracking-widest">Encrypting & Uploading...</span>
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-16 h-16 rounded-[28px] bg-white shadow-sm border border-slate-100 flex items-center justify-center text-emerald-600 mx-auto mb-5 group-hover:scale-110 transition-transform">
                    <Upload className="w-8 h-8" />
                  </div>
                  <span className="text-base font-black text-[#122c24] block mb-1">Secure Document Upload</span>
                  <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest">PDF, Images (Max 10MB)</span>
                </div>
              )}
            </label>
          </div>

          {(error || successMessage) && (
            <div className={`p-5 rounded-[24px] flex items-center gap-4 text-sm font-bold border animate-in slide-in-from-top-2 ${
              error ? 'bg-red-50 border-red-100 text-red-600' : 'bg-emerald-50 border-emerald-100 text-emerald-700'
            }`}>
              {error ? <AlertCircle className="w-5 h-5 flex-shrink-0" /> : <Activity className="w-5 h-5 flex-shrink-0" />}
              {error || successMessage}
            </div>
          )}

          {/* Documents List */}
          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Repository Contents</h4>
              <span className="px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-black rounded-lg">{documents.length} Files</span>
            </div>
            
            {loading ? (
              <div className="py-20 flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-[3px] border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Fetching secure vault...</p>
              </div>
            ) : documents.length === 0 ? (
              <div className="py-20 text-center bg-slate-50/50 rounded-[40px] border border-dashed border-slate-200">
                <div className="w-16 h-16 bg-white rounded-[28px] shadow-sm flex items-center justify-center text-slate-200 mx-auto mb-4">
                  <FileText className="w-8 h-8" />
                </div>
                <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">No documentation found</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="group flex items-center justify-between p-5 bg-slate-50/80 hover:bg-white border border-transparent hover:border-emerald-200 rounded-[36px] transition-all cursor-pointer hover:shadow-2xl hover:shadow-emerald-100/50"
                    onClick={() => window.open(getDocumentUrl(doc.fileUrl), '_blank', 'noopener,noreferrer')}
                    type="button"
                    className="group flex w-full flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-4 text-left transition-all hover:border-[#1faa62] hover:shadow-lg hover:shadow-green-50 sm:flex-row sm:items-center sm:gap-5"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#f8fbf9] text-[#1faa62]">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="text-sm font-bold text-[#142e26] truncate">{doc.fileName}</h5>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-medium text-[#607d74]">
                        <span>{formatFileSize(doc.fileSize)}</span>
                        <span className="w-1 h-1 bg-gray-200 rounded-full" />
                        <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 self-start transition-opacity sm:self-auto sm:opacity-0 sm:group-hover:opacity-100">
                      <button
                        onClick={(event) => void handleDownload(event, doc)}
                        className="w-12 h-12 flex items-center justify-center hover:bg-emerald-50 text-slate-300 hover:text-emerald-600 rounded-[18px] transition-all"
                        title="Download"
                        type="button"
                      >
                        <Download className="w-6 h-6" />
                      </button>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDelete(doc.id);
                        }}
                        className="w-12 h-12 flex items-center justify-center hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-[18px] transition-all"
                        title="Delete"
                        type="button"
                        type="button"
                      >
                        <Trash2 className="w-6 h-6" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientDocumentsModal;
