import axios from 'axios';
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Building2, CreditCard, Smartphone } from 'lucide-react';
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
      setMessage('Payment successful. Subscription activated.');
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

  return (
    <div className="fixed inset-0 z-50 bg-black/25 p-2">
      <div className="h-[100dvh] w-[100vw] rounded-none border border-[#bfd0c8] bg-white overflow-hidden shadow-2xl">
      <div className="flex items-center justify-between border-b border-[#d6e1dc] px-6 py-4">
        <button
          className="rounded-lg border border-[#c8d7d1] bg-white px-4 py-2 text-sm font-semibold text-[#23453a] hover:bg-[#f5faf7]"
          onClick={() => navigate('/subscription')}
          type="button"
        >
          Back
        </button>
        <h2 className="text-[22px] font-bold text-[#112a22]">Select Payment Method</h2>
        <div className="w-[74px]" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_190px_1fr] h-[calc(100%-72px)]">
        <div className="bg-gradient-to-b from-[#0f9468] to-[#127b5a] p-4 text-white overflow-y-auto">
          <div className="rounded-2xl bg-white/12 border border-white/20 p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-white text-[#15784f] flex items-center justify-center font-bold text-[22px]">
              C
            </div>
            <div>
              <div className="text-xs text-white/80">CareLoop Health</div>
              <div className="text-[18px] font-bold leading-none">{selectedPlan.name}</div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-white p-4 text-[#112a22]">
            <div className="text-xs font-semibold tracking-[0.12em] text-[#6f857d] uppercase">Order Summary</div>
            <div className="mt-2 text-[42px] leading-none font-bold">{`\u20b9${selectedPlan.price.toLocaleString()}`}</div>
            <div className="text-[#6f857d]">/mo</div>
            <div className="mt-2 text-[#1c7f4c] font-semibold">{selectedPlan.name}</div>
            <div className="mt-3 border-t border-[#d6e1dc] pt-3 space-y-1.5">
              {selectedPlan.features.slice(0, 3).map((feature) => (
                <div className="text-[13px] text-[#34564b]" key={feature}>- {feature}</div>
              ))}
            </div>
          </div>
        </div>

        <div className="border-r border-[#d6e1dc] bg-[#f8fbfa] p-4 space-y-2.5">
          <p className="text-xs font-semibold tracking-[0.14em] text-[#849990] uppercase px-1">Recommended</p>
          <button
            className={`w-full rounded-xl border px-3 py-2.5 text-left text-sm font-semibold ${
              method === 'upi' ? 'border-[#8dd6b0] bg-[#ecfaf2] text-[#117749]' : 'border-[#d6e1dc] bg-white text-[#27493f]'
            }`}
            onClick={() => handleMethodChange('upi')}
            type="button"
          >
            <span className="inline-flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              UPI
            </span>
          </button>
          <button
            className={`w-full rounded-xl border px-3 py-2.5 text-left text-sm font-semibold ${
              method === 'cards' ? 'border-[#8dd6b0] bg-[#ecfaf2] text-[#117749]' : 'border-[#d6e1dc] bg-white text-[#27493f]'
            }`}
            onClick={() => handleMethodChange('cards')}
            type="button"
          >
            <span className="inline-flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Cards
            </span>
          </button>
          <button
            className={`w-full rounded-xl border px-3 py-2.5 text-left text-sm font-semibold ${
              method === 'netbanking' ? 'border-[#8dd6b0] bg-[#ecfaf2] text-[#117749]' : 'border-[#d6e1dc] bg-white text-[#27493f]'
            }`}
            onClick={() => handleMethodChange('netbanking')}
            type="button"
          >
            <span className="inline-flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Netbanking
            </span>
          </button>
        </div>

        <div className="bg-[#f9fbfa] p-5 overflow-y-auto">
          <h3 className="text-[24px] font-semibold text-[#122c24]">
            {method === 'upi' ? 'Pay via UPI' : method === 'cards' ? 'Pay via Cards' : 'Pay via Netbanking'}
          </h3>
          <p className="mt-1 text-[13px] text-[#698178]">
            {method === 'upi' ? 'Scan QR code or select an app to pay securely.' : 'Fill details and complete payment securely.'}
          </p>

          {method === 'upi' ? (
            <div className="mt-4 max-w-[420px] rounded-2xl border border-[#d8e3de] bg-white p-4">
              <SampleQr />
              <button
                className="mt-3 w-full rounded-lg bg-[#1faa62] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#179353] disabled:opacity-70"
                disabled={processing}
                onClick={completePayment}
                type="button"
              >
                {processing ? 'Processing...' : 'Click to Simulate'}
              </button>
              <div className="mt-3 text-[11px] text-[#879c94] text-center tracking-[0.12em]">OR USE APP</div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {[
                  { name: 'GPay', key: 'gpay', image: '/upi-gpay.svg' },
                  { name: 'PhonePe', key: 'phonepe', image: '/upi-phonepe.svg' },
                  { name: 'Paytm', key: 'paytm', image: '/upi-paytm.svg' },
                ].map((app) => (
                  <button
                    className={`flex items-center justify-center rounded-lg border py-2 text-sm hover:bg-[#f4f8f6] min-h-[48px] ${
                      selectedUpiApp === app.key ? 'border-[#88d0ab] bg-[#edf9f2]' : 'border-[#d6e1dc] bg-white'
                    }`}
                    key={app.name}
                    onClick={() => {
                      setSelectedUpiApp(app.key as 'gpay' | 'phonepe' | 'paytm');
                      setMessage('');
                    }}
                    type="button"
                    disabled={processing}
                  >
                    <img alt={app.name} className="h-6 w-auto" src={app.image} />
                  </button>
                ))}
              </div>
              <button
                className="mt-2 w-full rounded-lg bg-[#1faa62] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#179353] disabled:opacity-70"
                disabled={processing || !selectedUpiApp}
                onClick={completePayment}
                type="button"
              >
                {processing ? 'Processing...' : 'Pay with Selected UPI App'}
              </button>
            </div>
          ) : null}

          {method === 'cards' ? (
            <div className="mt-4 max-w-[420px] rounded-2xl border border-[#d8e3de] bg-white p-4 space-y-2.5">
              <input
                className="w-full rounded-lg border border-[#c8d7d1] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-100"
                onChange={(event) => setCardForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Card Holder Name"
                value={cardForm.name}
              />
              <input
                className="w-full rounded-lg border border-[#c8d7d1] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-100"
                maxLength={16}
                onChange={(event) => setCardForm((current) => ({ ...current, number: event.target.value.replace(/\D/g, '') }))}
                placeholder="Card Number (16 digits)"
                value={cardForm.number}
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  className="w-full rounded-lg border border-[#c8d7d1] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-100"
                  onChange={(event) => setCardForm((current) => ({ ...current, expiry: event.target.value }))}
                  placeholder="MM/YY"
                  value={cardForm.expiry}
                />
                <input
                  className="w-full rounded-lg border border-[#c8d7d1] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-100"
                  maxLength={3}
                  onChange={(event) => setCardForm((current) => ({ ...current, cvv: event.target.value.replace(/\D/g, '') }))}
                  placeholder="CVV"
                  value={cardForm.cvv}
                />
              </div>
              <button
                className="w-full rounded-lg bg-[#1faa62] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#179353] disabled:opacity-70"
                disabled={processing}
                onClick={handlePayViaCard}
                type="button"
              >
                {processing ? 'Processing...' : 'Pay with Card'}
              </button>
            </div>
          ) : null}

          {method === 'netbanking' ? (
            <div className="mt-4 max-w-[420px] rounded-2xl border border-[#d8e3de] bg-white p-4 space-y-2.5">
              <select
                className="w-full rounded-lg border border-[#c8d7d1] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-100 bg-white"
                onChange={(event) => setNetbankForm((current) => ({ ...current, bank: event.target.value }))}
                value={netbankForm.bank}
              >
                <option value="">Select Bank</option>
                <option value="HDFC">HDFC Bank</option>
                <option value="ICICI">ICICI Bank</option>
                <option value="SBI">State Bank of India</option>
                <option value="Axis">Axis Bank</option>
              </select>
              <input
                className="w-full rounded-lg border border-[#c8d7d1] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-100"
                onChange={(event) => setNetbankForm((current) => ({ ...current, accountHolder: event.target.value }))}
                placeholder="Account Holder Name"
                value={netbankForm.accountHolder}
              />
              <button
                className="w-full rounded-lg bg-[#1faa62] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#179353] disabled:opacity-70"
                disabled={processing}
                onClick={handlePayViaNetbanking}
                type="button"
              >
                {processing ? 'Processing...' : 'Pay with Netbanking'}
              </button>
            </div>
          ) : null}

          {message ? (
            <div
              className={`mt-4 rounded-xl px-4 py-3 text-sm font-semibold ${
                message.toLowerCase().includes('successful') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}
            >
              {message}
            </div>
          ) : null}
        </div>
      </div>
      </div>
    </div>
  );
};

export default SubscriptionCheckout;
