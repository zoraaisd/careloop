import axios from 'axios';
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Building2, CreditCard, Smartphone, ArrowLeft, ShieldCheck, Lock, ScanLine, ChevronRight, CheckCircle2, Users } from 'lucide-react';
import api from '@/services/api';

type Plan = {
  id: string;
  name: string;
  description: string;
  price: number;
  billingCycle?: string;
  features: string[];
};

type PlansResponse = {
  plans: Plan[];
};

type PaymentMethod = 'upi' | 'cards' | 'netbanking';

const SampleQr: React.FC = () => {
  const cells = Array.from({ length: 100 }, (_, idx) => idx);
  return (
    <div className="mx-auto h-[160px] w-[160px] rounded-xl bg-[#d8efe5] p-2">
      <div className="grid h-full w-full grid-cols-10 gap-1">
        {cells.map((idx) => (
          <div
            className={idx % 2 === 0 || idx % 7 === 0 ? 'rounded-sm bg-[#0f6e51]' : 'rounded-sm bg-transparent'}
            key={idx}
          />
        ))}
      </div>
    </div>
  );
};

const SubscriptionCheckout: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const planId = searchParams.get('planId') ?? '';

  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [method, setMethod] = useState<PaymentMethod>('upi');
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState('');
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  const [selectedUpiApp, setSelectedUpiApp] = useState<'gpay' | 'phonepe' | 'paytm' | ''>('');
  const [cardForm, setCardForm] = useState({
    name: '',
    number: '',
    expiry: '',
    cvv: '',
  });
  const [netbankForm, setNetbankForm] = useState({
    bank: '',
    accountHolder: '',
  });

  useEffect(() => {
    if (!showSuccessScreen) {
      return;
    }

    const timer = window.setTimeout(() => {
      navigate('/subscription');
    }, 2000);

    return () => window.clearTimeout(timer);
  }, [showSuccessScreen, navigate]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const response = await api.get<PlansResponse>('/doctor/subscription/plans');
        setPlans(response.data?.plans ?? []);
      } catch (error) {
        console.error('Failed to load plans', error);
        setPlans([]);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const selectedPlan = useMemo(() => plans.find((item) => item.id === planId) ?? null, [planId, plans]);

  const completePayment = async () => {
    if (!selectedPlan) return;
    setProcessing(true);
    setMessage('');
    try {
      await api.post('/doctor/subscribe', { planId: selectedPlan.id });
      setShowSuccessScreen(true);
    } catch (error) {
      if (axios.isAxiosError<{ message?: string }>(error)) {
        setMessage(error.response?.data?.message ?? 'Payment failed. Please try again.');
      } else {
        setMessage('Payment failed. Please try again.');
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleMethodChange = (nextMethod: PaymentMethod) => {
    setMethod(nextMethod);
    setMessage('');
  };

  const handlePayViaCard = async () => {
    if (!cardForm.name.trim() || !/^\d{16}$/.test(cardForm.number) || !cardForm.expiry.trim() || !/^\d{3}$/.test(cardForm.cvv)) {
      setMessage('Enter valid card details (16-digit number and 3-digit CVV).');
      return;
    }
    await completePayment();
  };

  const handlePayViaNetbanking = async () => {
    if (!netbankForm.bank || !netbankForm.accountHolder.trim()) {
      setMessage('Select bank and enter account holder name.');
      return;
    }
    await completePayment();
  };

  if (loading) {
    return <div className="py-10 text-center text-[#6d847b] text-sm">Loading checkout...</div>;
  }

  if (!selectedPlan) {
    return (
      <div className="rounded-xl border border-[#bfd0c8] bg-white p-6">
        <p className="text-sm text-[#6d847b]">Plan not found.</p>
        <button
          className="mt-4 rounded-lg border border-[#c8d7d1] px-4 py-2 text-sm font-semibold text-[#23453a]"
          onClick={() => navigate('/subscription')}
          type="button"
        >
          Back to Plans
        </button>
      </div>
    );
  }

  if (showSuccessScreen) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(15,23,42,0.48)] p-4">
        <div className="w-full max-w-[900px] rounded-[30px] bg-white px-6 py-16 text-center shadow-2xl md:px-12">
          <div className="mx-auto mb-8 flex h-[112px] w-[112px] items-center justify-center rounded-full bg-[#d9f5e8] shadow-[0_0_0_10px_rgba(217,245,232,0.55)]">
            <CheckCircle2 className="h-14 w-14 text-[#0f9468]" />
          </div>
          <h2 className="text-[46px] font-extrabold leading-none text-[#0f172a]">Payment Successful!</h2>
          <p className="mt-5 text-[34px] font-semibold text-[#64748b]">
            Your plan has been upgraded to <span className="text-[#0f9468]">{selectedPlan.name}</span>
          </p>
          <p className="mt-10 text-[24px] font-semibold text-[#0f9468]">Activating features...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#f4f7f6] p-3 sm:p-4">
      <div className="flex max-h-[95dvh] w-full max-w-[1080px] flex-col overflow-hidden rounded-2xl border border-[#bfd0c8] bg-white shadow-2xl">
      <div className="flex flex-col gap-3 border-b border-[#d6e1dc] px-4 py-4 sm:px-6 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <button
          className="flex items-center gap-2 rounded-lg border border-[#c8d7d1] bg-white px-4 py-2 text-sm font-semibold text-[#23453a] hover:bg-[#f5faf7]"
          onClick={() => navigate('/subscription')}
          type="button"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <h2 className="text-[20px] font-bold text-[#112a22] sm:text-[22px]">Select Payment Method</h2>
        <div className="flex items-center gap-1.5 text-sm font-semibold text-[#1c7f4c]">
          <ShieldCheck className="h-5 w-5" />
          100% Secure Payments
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 overflow-y-auto p-4 sm:p-5 lg:grid-cols-[320px_220px_1fr]">
        {/* Left Column - Green Card */}
        <div className="rounded-2xl bg-gradient-to-b from-[#0f9468] to-[#127b5a] p-5 text-white flex flex-col justify-between">
          <div>
            <div className="rounded-xl bg-white/10 border border-white/20 p-4 flex items-center gap-3">
              <div className="h-11 w-11 rounded-lg bg-white text-[#15784f] flex items-center justify-center font-bold text-[24px]">
                C
              </div>
              <div>
                <div className="text-xs text-white/80 font-medium">CareLoop Health</div>
                <div className="text-[20px] font-bold leading-none mt-0.5">{selectedPlan.name}</div>
              </div>
            </div>

            <div className="mt-5 rounded-2xl bg-white p-5 text-[#112a22] shadow-sm">
              <div className="text-[11px] font-bold tracking-[0.12em] text-[#6f857d] uppercase">Order Summary</div>
              <div className="mt-2 text-[42px] leading-none font-bold tracking-tight">{`\u20b9${selectedPlan.price.toLocaleString()}`}</div>
              <div className="text-[#6f857d] font-medium mt-1">/mo</div>
              <div className="mt-3 text-[#1c7f4c] font-bold">{selectedPlan.name}</div>
              <div className="mt-4 border-t border-[#d6e1dc] pt-4 space-y-3">
                {selectedPlan.features.slice(0, 3).map((feature) => (
                  <div className="flex items-start gap-2 text-[13px] text-[#34564b] font-medium" key={feature}>
                    <CheckCircle2 className="w-4 h-4 text-[#1faa62] mt-0.5 shrink-0" />
                    {feature}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-xl bg-black/10 p-4 border border-white/10 flex items-start gap-3">
            <Lock className="w-5 h-5 text-white/80 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-bold text-white">Secure • Encrypted • Trusted</div>
              <div className="text-[11px] text-white/70 mt-1 leading-relaxed">Your payment information is safe with us.</div>
            </div>
          </div>
        </div>

        {/* Middle Column - Methods */}
          <div className="space-y-3 pt-2">
          <p className="text-[11px] font-bold tracking-[0.14em] text-[#1faa62] uppercase px-1">Recommended</p>
          <button
            className={`relative w-full rounded-xl border px-4 py-3.5 text-left text-sm font-bold transition-colors ${
              method === 'upi' ? 'border-[#8dd6b0] bg-[#ecfaf2] text-[#117749]' : 'border-[#d6e1dc] bg-white text-[#27493f] hover:bg-[#f8fbfa]'
            }`}
            onClick={() => handleMethodChange('upi')}
            type="button"
          >
            <span className="inline-flex items-center gap-3">
              <Smartphone className="h-5 w-5" />
              UPI
            </span>
            {method === 'upi' && <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#1faa62]" />}
          </button>
          
          <div className="h-4" /> {/* Spacer */}

          <button
            className={`relative w-full rounded-xl border px-4 py-3.5 text-left text-sm font-bold transition-colors ${
              method === 'cards' ? 'border-[#8dd6b0] bg-[#ecfaf2] text-[#117749]' : 'border-[#d6e1dc] bg-white text-[#27493f] hover:bg-[#f8fbfa]'
            }`}
            onClick={() => handleMethodChange('cards')}
            type="button"
          >
            <span className="inline-flex items-center gap-3">
              <CreditCard className="h-5 w-5" />
              Cards
            </span>
            {method === 'cards' && <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#1faa62]" />}
          </button>
          <button
            className={`relative w-full rounded-xl border px-4 py-3.5 text-left text-sm font-bold transition-colors ${
              method === 'netbanking' ? 'border-[#8dd6b0] bg-[#ecfaf2] text-[#117749]' : 'border-[#d6e1dc] bg-white text-[#27493f] hover:bg-[#f8fbfa]'
            }`}
            onClick={() => handleMethodChange('netbanking')}
            type="button"
          >
            <span className="inline-flex items-center gap-3">
              <Building2 className="h-5 w-5" />
              Netbanking
            </span>
            {method === 'netbanking' && <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#1faa62]" />}
          </button>
        </div>

        {/* Right Column - Payment Details */}
          <div className="flex flex-col rounded-2xl border border-[#e8f0ec] bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 shrink-0 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full border border-[#e8f0ec] bg-white flex items-center justify-center shadow-sm">
                {method === 'upi' ? (
                   <div className="w-6 h-6 flex">
                      <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[16px] border-b-[#f37021] rotate-[30deg]"></div>
                      <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[16px] border-b-[#008a38] -ml-2 -mt-1 -rotate-[30deg]"></div>
                   </div>
                ) : method === 'cards' ? (
                  <CreditCard className="w-6 h-6 text-[#1faa62]" />
                ) : (
                  <Building2 className="w-6 h-6 text-[#1faa62]" />
                )}
              </div>
              <div>
                <h3 className="text-[22px] font-bold text-[#122c24]">
                  {method === 'upi' ? 'Pay via UPI' : method === 'cards' ? 'Pay via Cards' : 'Pay via Netbanking'}
                </h3>
                <p className="mt-1 text-[13px] text-[#698178] font-medium">
                  {method === 'upi' ? 'Scan QR code or select an app to pay securely.' : 'Fill details and complete payment securely.'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-[#ecfaf2] px-3 py-1.5 text-xs font-bold text-[#1c7f4c] border border-[#8dd6b0]">
              <ShieldCheck className="w-4 h-4" /> Instant & Secure
            </div>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 mt-6 pt-2 pb-6 px-1">
            <div className="mx-auto max-w-[360px]">
              {method === 'upi' ? (
                <>
                  <div className="rounded-2xl border border-[#e8f0ec] p-6 flex justify-center bg-white shadow-sm">
                    <SampleQr />
                  </div>
                  <button
                    className="mt-6 w-full rounded-xl bg-[#0f9468] px-5 py-4 text-sm font-bold text-white hover:bg-[#0c7c56] disabled:opacity-70 flex items-center justify-between transition-colors shadow-sm"
                    disabled={processing}
                    onClick={completePayment}
                    type="button"
                  >
                    <div className="flex items-center gap-2">
                      <ScanLine className="w-5 h-5" /> Click to Simulate
                    </div>
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  
                  <div className="my-6 flex items-center gap-3">
                    <div className="h-px flex-1 bg-[#e8f0ec]" />
                    <span className="text-[11px] font-bold text-[#879c94] uppercase tracking-wider">OR USE APP</span>
                    <div className="h-px flex-1 bg-[#e8f0ec]" />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { name: 'GPay', key: 'gpay', image: '/upi-gpay.svg' },
                      { name: 'PhonePe', key: 'phonepe', image: '/upi-phonepe.svg' },
                      { name: 'Paytm', key: 'paytm', image: '/upi-paytm.svg' },
                    ].map((app) => (
                      <button
                        className={`flex flex-col items-center justify-center rounded-xl border p-3 hover:bg-[#f4f8f6] transition-colors ${
                          selectedUpiApp === app.key ? 'border-[#88d0ab] bg-[#edf9f2] shadow-sm' : 'border-[#d6e1dc] bg-white'
                        }`}
                        key={app.name}
                        onClick={() => {
                          setSelectedUpiApp(app.key as 'gpay' | 'phonepe' | 'paytm');
                          setMessage('');
                        }}
                        type="button"
                        disabled={processing}
                      >
                        <div className="h-8 flex items-center justify-center mb-1">
                          {/* Fallback styling for images in case they don't load smoothly */}
                          <img alt={app.name} className="max-h-full max-w-full object-contain" src={app.image} onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            const span = document.createElement('span');
                            span.className = 'text-[10px] font-bold text-[#112a22]';
                            span.innerText = app.name;
                            (e.target as HTMLImageElement).parentElement?.appendChild(span);
                          }} />
                        </div>
                        <span className="text-[11px] font-semibold text-[#34564b]">{app.name}</span>
                      </button>
                    ))}
                  </div>
                  
                  <button
                    className="mt-6 w-full rounded-xl bg-[#ecfaf2] px-5 py-4 text-sm font-bold text-[#117749] hover:bg-[#d8f4e5] border border-[#a6e0c2] disabled:opacity-70 flex items-center justify-center gap-2 transition-colors shadow-sm"
                    disabled={processing || !selectedUpiApp}
                    onClick={completePayment}
                    type="button"
                  >
                    <ShieldCheck className="w-5 h-5" />
                    {processing ? 'Processing...' : 'Pay with Selected UPI App'}
                  </button>
                </>
              ) : null}

              {method === 'cards' ? (
                <div className="space-y-4">
                  <input
                    className="w-full rounded-xl border border-[#c8d7d1] px-4 py-3.5 text-sm font-medium outline-none focus:ring-2 focus:ring-[#8dd6b0] focus:border-[#8dd6b0] transition-shadow placeholder:text-[#879c94]"
                    onChange={(event) => setCardForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Card Holder Name"
                    value={cardForm.name}
                  />
                  <input
                    className="w-full rounded-xl border border-[#c8d7d1] px-4 py-3.5 text-sm font-medium outline-none focus:ring-2 focus:ring-[#8dd6b0] focus:border-[#8dd6b0] transition-shadow placeholder:text-[#879c94]"
                    maxLength={16}
                    onChange={(event) => setCardForm((current) => ({ ...current, number: event.target.value.replace(/\D/g, '') }))}
                    placeholder="Card Number (16 digits)"
                    value={cardForm.number}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      className="w-full rounded-xl border border-[#c8d7d1] px-4 py-3.5 text-sm font-medium outline-none focus:ring-2 focus:ring-[#8dd6b0] focus:border-[#8dd6b0] transition-shadow placeholder:text-[#879c94]"
                      onChange={(event) => setCardForm((current) => ({ ...current, expiry: event.target.value }))}
                      placeholder="MM/YY"
                      value={cardForm.expiry}
                    />
                    <input
                      className="w-full rounded-xl border border-[#c8d7d1] px-4 py-3.5 text-sm font-medium outline-none focus:ring-2 focus:ring-[#8dd6b0] focus:border-[#8dd6b0] transition-shadow placeholder:text-[#879c94]"
                      maxLength={3}
                      onChange={(event) => setCardForm((current) => ({ ...current, cvv: event.target.value.replace(/\D/g, '') }))}
                      placeholder="CVV"
                      type="password"
                      value={cardForm.cvv}
                    />
                  </div>
                  <button
                    className="mt-6 w-full rounded-xl bg-[#0f9468] px-5 py-4 text-sm font-bold text-white hover:bg-[#0c7c56] disabled:opacity-70 flex items-center justify-between transition-colors shadow-sm"
                    disabled={processing}
                    onClick={handlePayViaCard}
                    type="button"
                  >
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5" /> Pay with Card
                    </div>
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              ) : null}

              {method === 'netbanking' ? (
                <div className="space-y-4">
                  <select
                    className="w-full rounded-xl border border-[#c8d7d1] px-4 py-3.5 text-sm font-medium outline-none focus:ring-2 focus:ring-[#8dd6b0] focus:border-[#8dd6b0] transition-shadow bg-white text-[#112a22]"
                    onChange={(event) => setNetbankForm((current) => ({ ...current, bank: event.target.value }))}
                    value={netbankForm.bank}
                  >
                    <option value="" disabled className="text-[#879c94]">Select Bank</option>
                    <option value="HDFC">HDFC Bank</option>
                    <option value="ICICI">ICICI Bank</option>
                    <option value="SBI">State Bank of India</option>
                    <option value="Axis">Axis Bank</option>
                  </select>
                  <input
                    className="w-full rounded-xl border border-[#c8d7d1] px-4 py-3.5 text-sm font-medium outline-none focus:ring-2 focus:ring-[#8dd6b0] focus:border-[#8dd6b0] transition-shadow placeholder:text-[#879c94]"
                    onChange={(event) => setNetbankForm((current) => ({ ...current, accountHolder: event.target.value }))}
                    placeholder="Account Holder Name"
                    value={netbankForm.accountHolder}
                  />
                  <button
                    className="mt-6 w-full rounded-xl bg-[#0f9468] px-5 py-4 text-sm font-bold text-white hover:bg-[#0c7c56] disabled:opacity-70 flex items-center justify-between transition-colors shadow-sm"
                    disabled={processing}
                    onClick={handlePayViaNetbanking}
                    type="button"
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className="w-5 h-5" /> Pay with Netbanking
                    </div>
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              ) : null}

              {message ? (
                <div
                  className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm font-bold text-red-700"
                >
                  {message}
                </div>
              ) : null}
            </div>
          </div>
          
          <div className="mt-4 grid grid-cols-1 gap-3 border-t border-[#e8f0ec] pt-6 shrink-0 sm:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-[#ecfaf2] p-2 text-[#1faa62]"><ShieldCheck className="w-5 h-5" /></div>
              <div>
                <div className="text-[11px] font-bold text-[#112a22]">PCI DSS Compliant</div>
                <div className="text-[10px] text-[#698178] mt-0.5">Industry standard security</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-[#ecfaf2] p-2 text-[#1faa62]"><Lock className="w-5 h-5" /></div>
              <div>
                <div className="text-[11px] font-bold text-[#112a22]">Bank Grade Security</div>
                <div className="text-[10px] text-[#698178] mt-0.5">256-bit encryption</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-[#ecfaf2] p-2 text-[#1faa62]"><Users className="w-5 h-5" /></div>
              <div>
                <div className="text-[11px] font-bold text-[#112a22]">Trusted by 10,000+</div>
                <div className="text-[10px] text-[#698178] mt-0.5">Businesses across India</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default SubscriptionCheckout;
