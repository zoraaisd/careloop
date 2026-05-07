import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { apiClient } from '@/services/api';

type SubscriptionPlan = {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  billingCycle: 'week' | 'month' | 'year';
};

const formatCurrency = (amount: number, currency = 'INR') => {
  if (currency === 'INR') return `Rs. ${amount.toLocaleString('en-IN')}`;
  return `$${amount.toLocaleString('en-US')}`;
};

export const SubscriptionCheckoutPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const paymentPlan = location.state?.paymentPlan as SubscriptionPlan | undefined;

  const [activeTab, setActiveTab] = useState<'upi' | 'cards' | 'netbanking'>('upi');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!paymentPlan) navigate('/dashboard');
  }, [paymentPlan, navigate]);

  if (!paymentPlan) return null;

  const handleSimulatePayment = async () => {
    setIsProcessing(true);
    setError('');
    try {
      await apiClient.post('/doctor/subscribe', { planId: paymentPlan.id });
      setPaymentSuccess(true);
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.message
        : 'Payment failed. Please try again.';
      setError(msg || 'Payment failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-dvh bg-white flex flex-col md:flex-row font-sans overflow-hidden">
      <div className="w-full md:w-[390px] h-full bg-gradient-to-br from-emerald-600 to-teal-800 p-6 md:p-8 text-white border-r border-emerald-500/30 flex flex-col">
        <div className="flex items-center gap-3 mb-6 bg-white/10 p-4 rounded-2xl border border-white/15 shadow-sm backdrop-blur-sm">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-emerald-700 font-bold text-2xl">
            C
          </div>
          <div>
            <h2 className="font-bold text-lg leading-tight tracking-tight">CareLoop Health</h2>
            <p className="text-sm text-emerald-100 font-medium">Doctor Workspace</p>
          </div>
        </div>

        <div className="bg-white text-slate-900 rounded-2xl p-5 shadow-sm border border-slate-200">
          <p className="text-sm text-slate-500 font-semibold mb-2 uppercase tracking-wider">Order Summary</p>
          <div className="flex items-baseline gap-1 mb-1">
            <span className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
              {formatCurrency(paymentPlan.price, paymentPlan.currency)}
            </span>
            <span className="text-sm font-medium text-slate-400">
              /{paymentPlan.billingCycle === 'month' ? 'mo' : paymentPlan.billingCycle}
            </span>
          </div>
          <p className="text-sm text-emerald-600 font-bold mb-5">{paymentPlan.name} Plan</p>

          <div className="space-y-2.5 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-xs font-bold">OK</div>
              <span className="text-sm text-slate-600 font-medium">Unlimited Appointments</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-xs font-bold">OK</div>
              <span className="text-sm text-slate-600 font-medium">Advanced Patient CRM</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-xs font-bold">OK</div>
              <span className="text-sm text-slate-600 font-medium">Priority Support</span>
            </div>
          </div>
        </div>

        <div className="mt-auto pt-6 flex items-center justify-center gap-2 text-xs text-emerald-100 font-medium uppercase tracking-widest">
          <span className="w-2.5 h-2.5 block bg-emerald-300 rounded-full"></span>
          Secured Checkout
        </div>
      </div>

      <div className="flex-1 bg-white flex flex-col h-full relative">
        <div className="flex justify-between items-center px-6 md:px-8 py-5 border-b border-slate-200 bg-white z-10">
          <h3 className="text-xl font-bold text-slate-800 tracking-tight">Select Payment Method</h3>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all duration-300 text-sm font-semibold"
          >
            <span aria-hidden="true">←</span>
            Back
          </button>
        </div>

        {paymentSuccess ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-lg text-white text-3xl font-bold">OK</div>
            <h2 className="text-3xl font-extrabold text-slate-900 mb-3 tracking-tight">Payment Successful!</h2>
            <p className="text-slate-500 text-lg mb-8 max-w-sm">
              Your subscription to the <span className="font-bold text-slate-800">{paymentPlan.name}</span> plan is now active.
            </p>
          </div>
        ) : (
          <div className="flex flex-1 min-h-0">
            <div className="w-[210px] border-r border-slate-200 bg-slate-50/40">
              <div className="px-5 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Recommended</div>
              <div className="space-y-2 px-3 pb-3">
                {[
                  { id: 'upi' as const, label: 'UPI', icon: 'U' },
                  { id: 'cards' as const, label: 'Cards', icon: 'C' },
                  { id: 'netbanking' as const, label: 'Netbanking', icon: 'N' }
                ].map(method => (
                  <button
                    key={method.id}
                    onClick={() => setActiveTab(method.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all duration-300 ${
                      activeTab === method.id
                        ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-200'
                        : 'text-slate-600 hover:bg-white hover:shadow-sm hover:-translate-y-0.5'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${activeTab === method.id ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                      {method.icon}
                    </div>
                    {method.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 p-5 md:p-6 relative bg-white overflow-hidden">
              {isProcessing && (
                <div className="absolute inset-0 bg-white/80 z-20 flex flex-col items-center justify-center">
                  <div className="w-14 h-14 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin mb-4"></div>
                  <p className="text-emerald-800 font-bold text-lg">Processing Payment...</p>
                </div>
              )}

              {error && (
                <div className="mb-8 p-4 bg-rose-50 text-rose-700 rounded-xl text-sm font-medium border border-rose-200 flex items-center gap-3">
                  <span className="text-rose-500 text-xl leading-none">!</span>
                  {error}
                </div>
              )}

              {activeTab === 'upi' && (
                <div>
                  <h4 className="text-xl font-bold text-slate-800 mb-2">Pay via UPI</h4>
                  <p className="text-sm text-slate-500 mb-5 font-medium">Scan the QR code or select an app to pay securely.</p>

                  <div className="flex flex-col items-center">
                    <div className="bg-white p-4 rounded-[1.6rem] border border-slate-200 mb-5 shadow-sm hover:shadow-md transition-all duration-300">
                      <div
                        className="w-48 h-48 md:w-52 md:h-52 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-200 cursor-pointer hover:border-emerald-300 transition-colors duration-300"
                        onClick={handleSimulatePayment}
                      >
                        <div className="grid grid-cols-7 gap-1 w-40 h-40 md:w-44 md:h-44">
                          {Array.from({ length: 49 }).map((_, i) => (
                            <div key={i} className={`${i % 2 === 0 || i % 5 === 0 ? 'bg-slate-700' : 'bg-slate-200'} rounded-[3px]`} />
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 w-full max-w-sm mb-5">
                      <div className="flex-1 h-px bg-slate-200"></div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Or Use App</span>
                      <div className="flex-1 h-px bg-slate-200"></div>
                    </div>

                    <div className="flex gap-4 md:gap-5">
                      {[
                        { name: 'GPay', icon: 'https://upload.wikimedia.org/wikipedia/commons/f/f2/Google_Pay_Logo.svg' },
                        { name: 'PhonePe', icon: 'https://download.logo.wine/logo/PhonePe/PhonePe-Logo.wine.png' },
                        { name: 'Paytm', icon: '/paytm-logo.svg' }
                      ].map(app => (
                        <button
                          key={app.name}
                          onClick={handleSimulatePayment}
                          className="w-20 h-20 md:w-24 md:h-24 bg-white border border-slate-200 rounded-2xl flex items-center justify-center hover:border-emerald-400 hover:shadow-lg hover:-translate-y-1 active:translate-y-0 transition-all duration-300"
                        >
                          <img src={app.icon} alt={app.name} className="w-11 h-11 md:w-14 md:h-14 object-contain" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'cards' && (
                <div>
                  <h4 className="text-xl font-bold text-slate-800 mb-6">Enter Card Details</h4>
                  <div className="space-y-4 max-w-md">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">Card Number</label>
                      <input type="text" placeholder="0000 0000 0000 0000" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-colors" />
                    </div>
                    <div className="flex gap-5">
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">Expiry</label>
                        <input type="text" placeholder="MM/YY" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-colors" />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">CVV</label>
                        <input type="password" placeholder="***" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-colors" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">Cardholder Name</label>
                      <input type="text" placeholder="Name on card" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-colors" />
                    </div>
                    <div className="pt-6">
                      <button onClick={handleSimulatePayment} className="w-full bg-emerald-600 text-white font-bold rounded-xl py-3.5 hover:bg-emerald-700 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 text-sm">
                        Pay Securely {formatCurrency(paymentPlan.price, paymentPlan.currency)}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'netbanking' && (
                <div>
                  <h4 className="text-xl font-bold text-slate-800 mb-6">Select Your Bank</h4>
                  <div className="grid grid-cols-2 gap-3 mb-6 max-w-xl">
                    {['HDFC', 'SBI', 'ICICI', 'Axis'].map(bank => (
                      <button
                        key={bank}
                        onClick={handleSimulatePayment}
                        className="border border-slate-200 rounded-xl p-4 text-sm font-bold text-slate-600 hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 h-14 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
                      >
                        {bank} Bank
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
