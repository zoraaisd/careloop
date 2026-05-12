import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getDoctorById, getBilling, updateDoctor, type DoctorRequest, type SubscriptionPlan, formatCurrency } from '@/services/admin';
import { Check, ChevronLeft, CreditCard, Landmark, ShieldCheck, Smartphone } from 'lucide-react';

const PaymentCheckoutPage = () => {
  const navigate = useNavigate();
  const { doctorId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const planIdFromQuery = searchParams.get('planId');

  const [doctor, setDoctor] = useState<DoctorRequest | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [step, setStep] = useState<'plans' | 'payment' | 'success'>('plans');
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [docData, billingData] = await Promise.all([
          getDoctorById(doctorId),
          getBilling()
        ]);
        setDoctor(docData);
        setPlans(billingData.plans);
        
        if (planIdFromQuery) {
          const plan = billingData.plans.find((p: any) => p.id === planIdFromQuery);
          if (plan) {
            setSelectedPlan(plan);
            setStep('payment');
          }
        }
      } catch (error) {
        console.error('Error fetching checkout data:', error);
      }
    };
    fetchData();
  }, [doctorId, planIdFromQuery]);

  const [processingStatus, setProcessingStatus] = useState<string>('');

  const handleProcessPayment = async () => {
    if (!selectedPlan) return;
    setIsProcessing(true);
    try {
      // Stage 1: Initial Processing
      setProcessingStatus('Processing Payment...');
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Stage 2: Verification
      setProcessingStatus('Verifying with Bank...');
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Stage 3: Finalize Update
      setProcessingStatus('Finalizing Subscription...');
      await updateDoctor(doctorId, { subscribedPlanId: selectedPlan.id });
      
      setStep('success');
      setTimeout(() => navigate(`/admin/doctors/${doctorId}`), 2500);
    } catch (error) {
      alert('Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  if (!doctor) return <div className="p-8 text-center text-slate-500 font-medium">Connecting to secure gateway...</div>;

  return (
    <div className="min-h-screen bg-[#f4f7f6] p-4 lg:p-8 font-sans">
      <div className="mx-auto max-w-6xl">
        <button 
          onClick={() => navigate(`/admin/doctors/${doctorId}`)}
          className="mb-8 flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-[#3399cc] transition"
        >
          <ChevronLeft size={18} /> Back
        </button>

        {step === 'plans' ? (
          <div className="space-y-12">
            <div className="text-center">
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">Select a Plan</h1>
              <p className="mt-3 text-slate-500 font-medium">Choose a subscription to upgrade {doctor.name}</p>
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className="relative flex flex-col rounded-[40px] bg-white p-10 border-[1.5px] border-slate-100 transition-all hover:shadow-2xl"
                >
                  <div className="flex justify-start mb-6">
                    <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-4 py-1.5 text-[10px] font-black text-emerald-600">
                      ACTIVE
                    </div>
                  </div>

                  <h3 className="text-3xl font-black text-slate-900">{plan.name}</h3>
                  <p className="mt-3 text-sm font-medium text-slate-400 min-h-[40px]">{plan.description}</p>

                  <div className="my-10">
                    <span className="text-5xl font-black text-slate-900">₹{plan.price.toLocaleString()}</span>
                    <span className="text-lg font-bold text-slate-400">/mo</span>
                  </div>
                  
                  <div className="space-y-6 mb-12">
                    <div className="flex items-center gap-4 text-sm font-bold text-slate-600">
                      <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center"><Check size={16} /></div>
                      {plan.doctorsLimit} Doctors
                    </div>
                    <div className="flex items-center gap-4 text-sm font-bold text-slate-600">
                      <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center"><Check size={16} /></div>
                      {plan.patientsLimit.toLocaleString()} Patients
                    </div>
                  </div>

                  <button
                    className="mt-auto w-full rounded-[24px] bg-[#121b28] py-6 text-[15px] font-black text-white hover:bg-slate-800 transition"
                    onClick={() => {
                      setSelectedPlan(plan);
                      setStep('payment');
                    }}
                  >
                    Active Plan
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : step === 'payment' ? (
          <div className="flex items-center justify-center py-10">
            {/* RAZORPAY STYLE MODAL */}
            <div className="w-full max-w-[400px] overflow-hidden rounded-2xl bg-white shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-slate-100">
              {/* Razorpay Header */}
              <div className="bg-[#3399cc] p-6 text-white flex justify-between items-start">
                <div className="flex gap-3">
                  <div className="h-10 w-10 bg-white rounded-lg flex items-center justify-center text-[#3399cc] font-black text-xl">C</div>
                  <div>
                    <h4 className="font-bold text-sm">CareLoop</h4>
                    <p className="text-[10px] opacity-80">Subscription Upgrade</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] opacity-80 uppercase font-bold">Amount</p>
                  <p className="text-xl font-bold">₹{(selectedPlan?.price || 0).toLocaleString()}</p>
                </div>
              </div>

              {/* Contact Info Bar */}
              <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex justify-between items-center text-[11px] text-slate-500 font-bold">
                <span>{doctor.phone}</span>
                <span>{doctor.email}</span>
              </div>

              {/* Methods Area */}
              <div className="p-6 space-y-6">
                <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Cards, UPI & More</h5>
                
                <div className="space-y-2">
                  {[
                    { id: 'card', label: 'Card', sub: 'Visa, MasterCard, RuPay', icon: CreditCard },
                    { id: 'upi', label: 'UPI', sub: 'Google Pay, PhonePe, Any UPI App', icon: Smartphone },
                    { id: 'netbanking', label: 'Netbanking', sub: 'All Indian Banks', icon: Landmark },
                  ].map(method => (
                    <button
                      key={method.id}
                      onClick={() => setPaymentMethod(method.id as any)}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition ${
                        paymentMethod === method.id ? 'border-[#3399cc] bg-blue-50/30' : 'border-slate-50 hover:border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${paymentMethod === method.id ? 'text-[#3399cc]' : 'text-slate-400'}`}>
                          <method.icon size={20} />
                        </div>
                        <div className="text-left">
                          <p className="text-[13px] font-bold text-slate-800 leading-none">{method.label}</p>
                          <p className="text-[10px] text-slate-400 font-medium mt-1">{method.sub}</p>
                        </div>
                      </div>
                      {paymentMethod === method.id && <div className="h-2 w-2 rounded-full bg-[#3399cc]" />}
                    </button>
                  ))}
                </div>

                <div className="pt-4">
                  <button
                    disabled={isProcessing}
                    onClick={handleProcessPayment}
                    className="w-full bg-[#3399cc] hover:bg-[#287da8] text-white font-bold py-4 rounded-lg shadow-lg shadow-blue-500/20 transition disabled:opacity-50 flex items-center justify-center gap-3"
                  >
                    {isProcessing ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>{processingStatus}</span>
                      </div>
                    ) : (
                      `Pay ₹${(selectedPlan?.price || 0).toLocaleString()}`
                    )}
                  </button>
                </div>
              </div>

              {/* Razorpay Footer */}
              <div className="bg-slate-50 p-4 border-t border-slate-100 flex flex-col items-center gap-2">
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                  <ShieldCheck size={14} className="text-[#3399cc]" />
                  SECURED BY RAZORPAY
                </div>
                <p className="text-[8px] text-slate-300 font-bold tracking-widest">TRUSTED BY 50L+ BUSINESSES</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[500px] text-center animate-in fade-in duration-700">
            <div className="h-24 w-24 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-2xl mb-8 ring-8 ring-emerald-50">
              <Check size={48} strokeWidth={3} />
            </div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">Payment Successful!</h2>
            <p className="text-lg font-medium text-slate-500 mt-4">
              {doctor.name}'s plan has been upgraded to <span className="text-emerald-600 font-bold">{selectedPlan?.name}</span>.
            </p>
            <div className="mt-8 flex items-center gap-2 text-sm font-bold text-[#3399cc]">
               <div className="h-2 w-2 bg-[#3399cc] rounded-full animate-ping" />
               Closing gateway...
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentCheckoutPage;
