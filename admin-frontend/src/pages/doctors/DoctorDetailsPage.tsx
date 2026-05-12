import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { formatCurrency, getDoctorById, updateDoctor, getBilling, type DoctorRequest, type SubscriptionPlan } from '@/services/admin';
import { Check, ChevronRight, CreditCard, Landmark, Smartphone, Wallet, X } from 'lucide-react';

type ClinicMediaItem = {
  type: 'image' | 'video' | 'external-video';
  url: string;
};

const isVideoData = (url: string) =>
  url.startsWith('data:video/') || /\.(mp4|webm|ogg)(?:[?#].*)?$/i.test(url);

const PlayBadge = () => (
  <span className="absolute inset-0 flex items-center justify-center bg-slate-950/20">
    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 shadow-sm">
      <span className="ml-1 h-0 w-0 border-y-[9px] border-l-[14px] border-y-transparent border-l-emerald-700" />
    </span>
  </span>
);

const DoctorDetails = () => {
  const navigate = useNavigate();
  const { doctorId = '' } = useParams();
  const [doctor, setDoctor] = useState<DoctorRequest | null>(null);
  const [loadError, setLoadError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<DoctorRequest>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeStep, setUpgradeStep] = useState<'plans' | 'payment' | 'success'>('plans');
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'netbanking' | 'wallet'>('upi');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const loadDoctor = async () => {
    setLoadError('');
    try {
      const data = await getDoctorById(doctorId);
      setDoctor(data);
      setFormData(data);
      setActiveMediaIndex(0);
    } catch (error) {
      console.error('Error loading doctor:', error);
      setLoadError('Unable to load doctor details for this record.');
    }
  };

  useEffect(() => {
    loadDoctor();
    const fetchPlans = async () => {
      try {
        const billingData = await getBilling();
        setPlans(billingData.plans);
      } catch (error) {
        console.error('Error fetching plans:', error);
      }
    };
    fetchPlans();
  }, [doctorId]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateDoctor(doctorId, formData);
      setIsEditing(false);
      await loadDoctor();
    } catch (error) {
      alert('Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpgradePlan = async () => {
    if (!selectedPlan) return;
    setIsProcessingPayment(true);
    try {
      await updateDoctor(doctorId, { subscribedPlanId: selectedPlan.id });
      setUpgradeStep('success');
      setTimeout(async () => {
        setIsUpgradeModalOpen(false);
        setUpgradeStep('plans');
        setSelectedPlan(null);
        await loadDoctor();
      }, 2000);
    } catch (error) {
      console.error('Upgrade plan error:', error);
      alert('Payment failed. Please check the console for details.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const clinicMediaItems = useMemo<ClinicMediaItem[]>(() => {
    if (!doctor) return [];

    const imageUrls = doctor.clinicImageUrls?.length
      ? doctor.clinicImageUrls
      : doctor.clinicImageUrl
        ? [doctor.clinicImageUrl]
        : [];

    return [
      ...imageUrls.map((url) => ({ type: 'image' as const, url })),
      ...(doctor.clinicVideoUrls ?? []).map((url) => ({
        type: isVideoData(url) ? 'video' as const : 'external-video' as const,
        url,
      })),
    ];
  }, [doctor]);

  if (!doctor) {
    return (
      <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
        <p className={`text-sm ${loadError ? 'text-rose-600' : 'text-slate-500'}`}>
          {loadError || 'Loading doctor details...'}
        </p>
      </div>
    );
  }

  const Label = ({ children }: { children: React.ReactNode }) => (
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{children}</p>
  );
  const activeMediaItem = clinicMediaItems[activeMediaIndex] ?? clinicMediaItems[0] ?? null;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-950">{doctor.name}</h2>
            <p className="mt-2 text-sm text-slate-500">{doctor.clinicName}</p>
          </div>
          <div className="flex gap-3">
            {!isEditing ? (
              <button
                className="rounded-xl bg-[#16A34A] px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                onClick={() => setIsEditing(true)}
                type="button"
              >
                Edit Profile
              </button>
            ) : (
              <>
                <button
                  className="rounded-xl border border-slate-200 bg-white px-6 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  onClick={() => {
                    setIsEditing(false);
                    setFormData(doctor);
                  }}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="rounded-xl bg-[#16A34A] px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
                  disabled={isSaving}
                  onClick={handleSave}
                  type="button"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            )}
            <button
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50"
              onClick={() => navigate('/admin/doctors')}
              type="button"
            >
              Back
            </button>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
          <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
            {[
              { label: 'Doctor Name', key: 'name' },
              { label: 'Phone Number', key: 'phone' },
              { label: 'Email', key: 'email' },
              { label: 'Clinic Name', key: 'clinicName' },
              { label: 'Clinic Address', key: 'clinicAddress', fullWidth: true },
              { label: 'City', key: 'city' },
              { label: 'Specialization', key: 'specialization' },
              { label: 'Qualification', key: 'qualification' },
              { label: 'Experience (Years)', key: 'experience', type: 'number' },
              { label: 'Consultation Fees', key: 'consultationFees', type: 'number' },
            ].map((field) => (
              <div key={field.key} className={field.fullWidth ? 'md:col-span-2' : ''}>
                <Label>{field.label}</Label>
                {isEditing ? (
                  <input
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50"
                    onChange={(e) => setFormData({ ...formData, [field.key]: field.type === 'number' ? Number(e.target.value) : e.target.value })}
                    type={field.type || 'text'}
                    value={(formData as any)[field.key] || ''}
                  />
                ) : (
                  <p className="mt-1 text-sm text-slate-800">
                    {field.key === 'consultationFees'
                      ? formatCurrency(doctor.consultationFees)
                      : (doctor as any)[field.key]}
                  </p>
                )}
              </div>
            ))}

            <div className="md:col-span-2">
              <Label>About Doctor</Label>
              {isEditing ? (
                <textarea
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50"
                  onChange={(e) => setFormData({ ...formData, aboutDoctor: e.target.value })}
                  rows={4}
                  value={formData.aboutDoctor || ''}
                />
              ) : (
                <p className="mt-1 text-sm leading-relaxed text-slate-800">{doctor.aboutDoctor || 'No description provided.'}</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">Subscription & Plan</h3>
            <p className="mt-1 text-sm text-slate-500">Manage the doctor's access plan and subscription status</p>
          </div>
          <button
            className="rounded-xl bg-emerald-50 px-6 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
            onClick={() => setIsUpgradeModalOpen(true)}
            type="button"
          >
            Upgrade Plan
          </button>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
          <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
            <div>
              <Label>Current Plan</Label>
              <p className="mt-1 text-sm font-medium text-emerald-700">
                {plans.find((p) => p.id === doctor.subscribedPlanId)?.name || doctor.subscribedPlanId || 'No active plan'}
              </p>
            </div>
            <div>
              <Label>Subscription Status</Label>
              <p className="mt-1">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${
                    doctor.subscriptionStatus === 'active'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {doctor.subscriptionStatus}
                </span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Upgrade Plan Modal */}
      {isUpgradeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            {upgradeStep === 'plans' ? (
              <div className="flex max-h-[90vh] flex-col">
                <div className="flex items-center justify-between border-b p-6">
                  <h2 className="text-2xl font-bold text-slate-950">Choose a Plan</h2>
                  <button className="rounded-full p-2 text-slate-400 hover:bg-slate-100" onClick={() => setIsUpgradeModalOpen(false)}>
                    <X size={24} />
                  </button>
                </div>
                
                <div className="overflow-y-auto p-8">
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {plans.map((plan) => (
                      <div
                        key={plan.id}
                        className={`relative flex flex-col rounded-2xl border p-6 transition hover:shadow-lg ${
                          selectedPlan?.id === plan.id ? 'border-emerald-500 ring-2 ring-emerald-100' : 'border-slate-200'
                        }`}
                      >
                        <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                        <p className="mt-1 text-sm text-slate-500">{plan.description}</p>
                        <p className="mt-4 text-2xl font-bold text-slate-950">
                          {formatCurrency(plan.price, plan.currency)}
                          <span className="text-sm font-normal text-slate-500">/{plan.billingCycle}</span>
                        </p>
                        <ul className="mt-6 space-y-3">
                          <li className="flex items-center gap-2 text-sm text-slate-600">
                            <Check className="text-emerald-500" size={16} /> {plan.doctorsLimit} Doctors
                          </li>
                          <li className="flex items-center gap-2 text-sm text-slate-600">
                            <Check className="text-emerald-500" size={16} /> {plan.patientsLimit.toLocaleString()} Patients
                          </li>
                          <li className="flex items-center gap-2 text-sm text-slate-600">
                            <Check className="text-emerald-500" size={16} /> WhatsApp Support
                          </li>
                        </ul>
                        <button
                          className={`mt-8 w-full rounded-xl py-3 text-sm font-bold transition ${
                            selectedPlan?.id === plan.id ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                          onClick={() => setSelectedPlan(plan)}
                        >
                          Select Plan
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end border-t bg-slate-50 p-6">
                  <button
                    disabled={!selectedPlan}
                    className="rounded-2xl bg-slate-950 px-10 py-4 font-bold text-white shadow-lg transition hover:bg-slate-800 disabled:opacity-50"
                    onClick={() => setUpgradeStep('payment')}
                  >
                    Continue to Payment
                  </button>
                </div>
              </div>
            ) : upgradeStep === 'payment' ? (
              /* CareLoop Branded Checkout UI */
              <div className="flex max-h-[85vh] flex-col overflow-hidden bg-slate-50 lg:flex-row">
                {/* Left Panel - Order Summary */}
                <div className="flex w-full flex-col bg-[#16A34A] p-6 text-white lg:w-[320px]">
                  <div className="flex items-center gap-3 rounded-xl bg-white/10 p-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-[#16A34A]">
                      <span className="text-xl font-black">C</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium opacity-80">CareLoop Health</p>
                      <h4 className="text-lg font-bold leading-none">{selectedPlan?.name}</h4>
                    </div>
                  </div>

                  <div className="mt-6 rounded-2xl bg-white p-5 text-slate-900 shadow-xl">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Order Summary</p>
                    <div className="mt-3">
                      <p className="text-3xl font-black text-slate-950">
                        {formatCurrency(selectedPlan?.price || 0, selectedPlan?.currency)}
                        <span className="text-sm font-normal text-slate-500">/mo</span>
                      </p>
                    </div>

                    <div className="mt-6 space-y-3 border-t pt-5">
                      <div className="flex items-center gap-2 text-[11px] font-medium text-slate-600">
                        <div className="flex h-4 w-4 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-600">
                          <Check size={10} />
                        </div>
                        <span>Doctors: {selectedPlan?.doctorsLimit}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] font-medium text-slate-600">
                        <div className="flex h-4 w-4 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-600">
                          <Check size={10} />
                        </div>
                        <span>Patients: {selectedPlan?.patientsLimit.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] font-medium text-slate-600">
                        <div className="flex h-4 w-4 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-600">
                          <Check size={10} />
                        </div>
                        <span>WhatsApp: {selectedPlan?.whatsappLimit.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto pt-6">
                    <div className="flex items-center gap-2 rounded-xl bg-black/10 p-3 text-[11px] font-medium backdrop-blur-sm">
                      <div className="rounded-md bg-white/20 p-1">
                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>
                      </div>
                      <span>Secure • Encrypted • Trusted</span>
                    </div>
                    <p className="mt-2 text-center text-[9px] opacity-60">Your payment information is safe.</p>
                  </div>
                </div>

                {/* Right Panel - Payment Methods */}
                <div className="flex flex-1 flex-col overflow-hidden p-6 lg:p-8">
                  <div className="flex items-center justify-between">
                    <button onClick={() => setUpgradeStep('plans')} className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800">
                      <X size={16} /> Back
                    </button>
                    <h3 className="text-lg font-black text-slate-800">Select Payment Method</h3>
                    <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-600">
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                      SECURE
                    </div>
                  </div>

                  <div className="mt-6 flex flex-1 gap-6 overflow-hidden">
                    {/* Method List */}
                    <div className="w-[140px] space-y-3">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Recommended</p>
                      {[
                        { id: 'upi', label: 'UPI', icon: Smartphone },
                        { id: 'card', label: 'Cards', icon: CreditCard },
                        { id: 'netbanking', label: 'Netbanking', icon: Landmark },
                      ].map((item) => (
                        <button
                          key={item.id}
                          className={`flex w-full items-center justify-between rounded-xl border p-4 transition ${
                            paymentMethod === item.id ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-50' : 'border-slate-200 bg-white hover:border-emerald-200'
                          }`}
                          onClick={() => setPaymentMethod(item.id as any)}
                        >
                          <div className="flex items-center gap-3">
                            <item.icon size={16} className={paymentMethod === item.id ? 'text-emerald-600' : 'text-slate-400'} />
                            <span className={`text-xs font-bold ${paymentMethod === item.id ? 'text-slate-900' : 'text-slate-500'}`}>{item.label}</span>
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Method Detail */}
                    <div className="flex flex-1 flex-col overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-400">
                            {paymentMethod === 'upi' ? <Smartphone size={20} /> : paymentMethod === 'card' ? <CreditCard size={20} /> : <Landmark size={20} />}
                          </div>
                          <div>
                            <h4 className="text-md font-black text-slate-900">Pay via {paymentMethod === 'upi' ? 'UPI' : paymentMethod === 'card' ? 'Cards' : 'Netbanking'}</h4>
                            <p className="text-[10px] font-medium text-slate-400">Secure payment gateway.</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 rounded-xl bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-600">
                          INSTANT
                        </div>
                      </div>

                      <div className="mt-6 flex-1">
                        {paymentMethod === 'upi' && (
                          <div className="space-y-6">
                            <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-3xl border-2 border-slate-100 bg-white p-4">
                              <div className="grid h-full w-full grid-cols-5 grid-rows-5 gap-1 opacity-20">
                                {Array.from({ length: 25 }).map((_, i) => (
                                  <div key={i} className={`rounded-sm ${i % 3 === 0 ? 'bg-emerald-800' : 'bg-slate-300'}`} />
                                ))}
                              </div>
                            </div>
                            <button 
                                onClick={handleUpgradePlan}
                                className="flex w-full items-center justify-between rounded-2xl bg-emerald-600 p-5 text-white shadow-lg transition hover:bg-emerald-700"
                            >
                              <div className="flex items-center gap-3">
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg>
                                <span className="font-bold">Click to Simulate</span>
                              </div>
                              <ChevronRight size={20} />
                            </button>
                            <div className="border-t pt-6">
                                <p className="text-center text-[10px] font-black uppercase tracking-widest text-slate-300">Or use app</p>
                                <div className="mt-4 flex justify-center gap-4">
                                    {['GPay', 'PhonePe', 'Paytm'].map(app => (
                                        <button key={app} onClick={handleUpgradePlan} className="flex h-12 w-24 items-center justify-center rounded-xl border border-slate-200 bg-white text-[10px] font-bold text-slate-400 hover:border-emerald-200 hover:text-emerald-600">
                                            {app}
                                        </button>
                                    ))}
                                </div>
                            </div>
                          </div>
                        )}

                        {paymentMethod === 'card' && (
                          <div className="space-y-4">
                            <input className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm outline-none focus:border-emerald-500 focus:bg-white" placeholder="Card Holder Name" />
                            <input className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm outline-none focus:border-emerald-500 focus:bg-white" placeholder="Card Number (16 digits)" />
                            <div className="flex gap-4">
                                <input className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm outline-none focus:border-emerald-500 focus:bg-white" placeholder="MM/YY" />
                                <input className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm outline-none focus:border-emerald-500 focus:bg-white" placeholder="CVV" />
                            </div>
                            <button 
                                onClick={handleUpgradePlan}
                                className="mt-4 flex w-full items-center justify-between rounded-2xl bg-emerald-600 p-5 text-white shadow-lg transition hover:bg-emerald-700"
                            >
                                <div className="flex items-center gap-3">
                                    <CreditCard size={20} />
                                    <span className="font-bold">Pay with Card</span>
                                </div>
                                <ChevronRight size={20} />
                            </button>
                          </div>
                        )}

                        {paymentMethod === 'netbanking' && (
                          <div className="space-y-4">
                            <select className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm outline-none focus:border-emerald-500 focus:bg-white">
                                <option>Select Bank</option>
                                <option>HDFC Bank</option>
                                <option>ICICI Bank</option>
                                <option>SBI</option>
                                <option>Axis Bank</option>
                            </select>
                            <input className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm outline-none focus:border-emerald-500 focus:bg-white" placeholder="Account Holder Name" />
                            <button 
                                onClick={handleUpgradePlan}
                                className="mt-4 flex w-full items-center justify-between rounded-2xl bg-emerald-600 p-5 text-white shadow-lg transition hover:bg-emerald-700"
                            >
                                <div className="flex items-center gap-3">
                                    <Landmark size={20} />
                                    <span className="font-bold">Pay with Netbanking</span>
                                </div>
                                <ChevronRight size={20} />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="mt-auto grid grid-cols-3 gap-4 pt-8">
                        {[
                            { label: 'PCI DSS Compliant', sub: 'Industry security' },
                            { label: 'Bank Grade Security', sub: '256-bit encryption' },
                            { label: 'Trusted by 10,000+', sub: 'Businesses across India' },
                        ].map((badge, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <div className="rounded-lg bg-emerald-50 p-1.5 text-emerald-600">
                                    <Check size={12} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-800">{badge.label}</p>
                                    <p className="text-[8px] text-slate-400">{badge.sub}</p>
                                </div>
                            </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Success UI */
              <div className="flex h-[500px] flex-col items-center justify-center p-12 text-center">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-lg ring-8 ring-emerald-50">
                  <Check size={48} strokeWidth={3} />
                </div>
                <h2 className="mt-8 text-3xl font-black text-slate-900">Payment Successful!</h2>
                <p className="mt-4 text-lg font-medium text-slate-500">
                  Your plan has been upgraded to <span className="font-bold text-emerald-600">{selectedPlan?.name}</span>
                </p>
                <div className="mt-10 flex items-center gap-2 text-sm font-bold text-emerald-600">
                  <div className="h-2 w-2 animate-ping rounded-full bg-emerald-600" />
                  Activating features...
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <section className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">Clinic Photos</h3>
            <p className="mt-1 text-sm text-slate-500">{doctor.clinicName}</p>
          </div>
        </div>

        {activeMediaItem ? (
          <div className="mt-5 space-y-4">
            <div className="relative overflow-hidden rounded-xl bg-slate-100">
              {activeMediaItem.type === 'image' ? (
                <img
                  alt={`${doctor.clinicName} clinic ${activeMediaIndex + 1}`}
                  className="h-80 w-full object-cover"
                  src={activeMediaItem.url}
                />
              ) : activeMediaItem.type === 'video' ? (
                <video
                  className="h-80 w-full object-cover"
                  controls
                  playsInline
                  src={activeMediaItem.url}
                />
              ) : (
                <a
                  aria-label={`Open clinic media ${activeMediaIndex + 1}`}
                  className="relative flex h-80 items-center justify-center bg-slate-900 text-white transition hover:bg-slate-800"
                  href={activeMediaItem.url}
                  rel="noreferrer"
                  target="_blank"
                >
                  <PlayBadge />
                </a>
              )}
            </div>

            {clinicMediaItems.length > 1 ? (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-6">
                {clinicMediaItems.map((item, index) => (
                  <button
                    aria-label={`Show clinic media ${index + 1}`}
                    className={[
                      'relative h-20 overflow-hidden rounded-lg border bg-slate-100 transition',
                      activeMediaIndex === index ? 'border-emerald-500 ring-2 ring-emerald-100' : 'border-slate-200 hover:border-emerald-300',
                    ].join(' ')}
                    key={`${item.url}-${index}`}
                    onClick={() => setActiveMediaIndex(index)}
                    type="button"
                  >
                    {item.type === 'image' ? (
                      <img alt="" className="h-full w-full object-cover" src={item.url} />
                    ) : item.type === 'video' ? (
                      <video className="h-full w-full object-cover" muted src={item.url} />
                    ) : (
                      <span className="block h-full w-full bg-slate-900" />
                    )}
                    {item.type !== 'image' ? <PlayBadge /> : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <p className="mt-5 text-sm text-slate-600">Clinic photo is not available yet.</p>
        )}
      </section>
    </div>
  );
};

export { DoctorDetails };
