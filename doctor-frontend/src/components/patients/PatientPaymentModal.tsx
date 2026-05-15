import React, { useState } from 'react';
import { X, CreditCard, Banknote, QrCode, DollarSign, Loader2, CheckCircle2 } from 'lucide-react';
import api, { notifySuccess } from '@/services/api';
import { emitDashboardRefresh } from '@/services/dashboard-refresh';

interface PatientPaymentModalProps {
  patient: {
    patientId: string;
    name: string;
    hasPaidConsultation: boolean;
  };
  onClose: () => void;
}

const PatientPaymentModal: React.FC<PatientPaymentModalProps> = ({ patient, onClose }) => {
  const [patientFee, setPatientFee] = useState<string>('');
  const [consultationFee, setConsultationFee] = useState<string>(patient.hasPaidConsultation ? '0' : '');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'upi' | 'cash'>('cash');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post('/doctor/payments', {
        patientId: patient.patientId,
        patientFee: Number(patientFee) || 0,
        consultationFee: Number(consultationFee) || 0,
        paymentMethod,
        notes: notes.trim() || undefined,
      });

      setSuccess(true);
      emitDashboardRefresh('patient:payment');
      notifySuccess('Payment processed successfully.');
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Payment failed', err);
      alert('Failed to process payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = (Number(patientFee) || 0) + (Number(consultationFee) || 0);

  if (success) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#142e26]/60 p-4 backdrop-blur-sm animate-in fade-in duration-300">
        <div className="w-full max-w-md overflow-hidden rounded-[32px] bg-white p-10 text-center shadow-2xl animate-in zoom-in duration-300">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[32px] bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h3 className="text-2xl font-black text-[#122c24]">Payment Successful</h3>
          <p className="mt-2 text-sm font-bold text-slate-500">The transaction has been recorded and reflected in reports.</p>
          <div className="mt-8 flex items-center justify-center gap-2 rounded-2xl bg-emerald-50/50 py-3 text-lg font-black text-emerald-700">
            <span className="text-sm font-bold opacity-60">Amount Paid:</span>
            ₹{totalAmount.toFixed(2)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#142e26]/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl overflow-hidden rounded-[32px] bg-white shadow-2xl animate-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-slate-100 p-6 sm:p-8 shrink-0">
          <div>
            <h3 className="text-2xl font-black text-[#122c24]">Process Payment</h3>
            <p className="mt-1 text-[11px] font-black uppercase tracking-widest text-emerald-600">Patient: {patient.name}</p>
          </div>
          <button onClick={onClose} className="rounded-2xl p-2 text-slate-400 transition-colors hover:bg-slate-50" title="Close">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="px-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Treatment Fee (₹)</label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="number"
                    required
                    className="w-full rounded-[20px] border border-slate-200 bg-slate-50 px-10 py-4 text-sm font-black text-[#122c24] outline-none transition focus:border-emerald-500 focus:bg-white"
                    placeholder="0.00"
                    value={patientFee}
                    onChange={(e) => setPatientFee(e.target.value)}
                  />
                </div>
              </div>

              {!patient.hasPaidConsultation && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Consultation Fee (₹)</label>
                  </div>
                  <div className="relative">
                    <Banknote className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="number"
                      className="w-full rounded-[20px] border border-slate-200 bg-slate-50 px-10 py-4 text-sm font-black text-[#122c24] outline-none transition focus:border-emerald-500 focus:bg-white"
                      placeholder="One-time fee"
                      value={consultationFee}
                      onChange={(e) => setConsultationFee(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <label className="px-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Payment Method</label>
              <div className="grid grid-cols-3 gap-3">
                {(['cash', 'upi', 'card'] as const).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`flex flex-col items-center justify-center gap-2 rounded-2xl border p-4 transition-all ${
                      paymentMethod === method
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm'
                        : 'border-slate-100 bg-white text-slate-500 hover:border-emerald-100 hover:text-emerald-600'
                    }`}
                  >
                    {method === 'cash' && <Banknote className="h-5 w-5" />}
                    {method === 'upi' && <QrCode className="h-5 w-5" />}
                    {method === 'card' && <CreditCard className="h-5 w-5" />}
                    <span className="text-[10px] font-black uppercase tracking-widest">{method}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="px-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Internal Notes</label>
              <textarea
                className="w-full rounded-[20px] border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-semibold text-[#122c24] outline-none transition focus:border-emerald-500 focus:bg-white resize-none"
                placeholder="Optional payment remarks..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <div className="p-4 sm:p-5 bg-slate-50/50 border-t border-slate-100 shrink-0 flex flex-col items-center gap-3">
            <div className="text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-0.5">Total Payable</p>
              <p className="text-2xl font-black text-[#122c24]">₹{totalAmount.toFixed(2)}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 opacity-60">Method: {paymentMethod}</p>
            </div>

            <button
              type="submit"
              disabled={loading || totalAmount <= 0}
              className="px-10 rounded-[20px] bg-emerald-600 py-3 text-sm font-black text-white shadow-lg shadow-emerald-100 transition-all hover:bg-emerald-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : 'Confirm Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PatientPaymentModal;
