import React, { useState, useEffect } from 'react';
import { X, FileText, Upload, Trash2, Download, Loader2, AlertCircle } from 'lucide-react';
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
          <div className="relative">
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
                <>
                  <Loader2 className="w-8 h-8 text-[#1faa62] animate-spin mb-2" />
                  <span className="text-sm font-bold text-[#1faa62]">Uploading document...</span>
                </>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-[#1faa62] mb-2" />
                  <span className="text-sm font-bold text-[#142e26]">Click to upload or drag & drop</span>
                  <span className="text-[10px] text-[#607d74] mt-1 uppercase font-black">PDF, Images (Max 10MB)</span>
                </>
              )}
            </label>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-sm font-medium">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}
          {successMessage && (
            <div className="px-1 text-sm font-semibold text-emerald-600">
              {successMessage}
            </div>
          )}

          {/* Documents List */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-black text-[#607d74] uppercase tracking-[0.2em]">Recent Documents</h4>
            {loading ? (
              <div className="py-12 flex flex-col items-center gap-3 opacity-20">
                <Loader2 className="w-8 h-8 animate-spin" />
                <span className="text-sm italic">Loading files...</span>
              </div>
            ) : documents.length === 0 ? (
              <div className="py-12 text-center text-gray-400 italic text-sm border border-dashed border-gray-100 rounded-2xl">
                No documents uploaded yet.
              </div>
            ) : (
              <div className="grid gap-3">
                {documents.map((doc) => (
                  <button
                    key={doc.id}
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
                        className="p-2 hover:bg-[#f8fbf9] text-[#1faa62] rounded-lg transition-colors"
                        title="Download"
                        type="button"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDelete(doc.id);
                        }}
                        className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                        title="Delete"
                        type="button"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </button>
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
