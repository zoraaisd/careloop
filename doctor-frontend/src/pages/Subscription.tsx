import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';

type Plan = {
  id: string;
  name: string;
  description: string;
  price: number;
  billingCycle?: string;
  features: string[];
};

type CurrentSubscription = {
  planId: string;
  planName: string;
  status: string;
  endDate: string | null;
  amount: number;
  paymentId: string;
} | null;

type PlansResponse = {
  plans: Plan[];
  currentSubscription: CurrentSubscription;
};

const Subscription: React.FC = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<CurrentSubscription>(null);
  const [loading, setLoading] = useState(true);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const response = await api.get<PlansResponse>('/doctor/subscription/plans');
      setPlans(response.data?.plans ?? []);
      setCurrentSubscription(response.data?.currentSubscription ?? null);
    } catch (error) {
      console.error('Failed to fetch plans', error);
      setPlans([]);
      setCurrentSubscription(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchPlans();
  }, []);

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-[#bfd0c8] bg-white p-5">
        <h2 className="text-[26px] font-bold text-[#122c24]">Subscription Plans</h2>
        <p className="mt-1 text-sm text-[#6d847b]">Choose a plan and continue to payment.</p>
        <div className="mt-3 text-sm text-[#36574d]">
          Current Plan: <span className="font-semibold">{currentSubscription?.planName ?? 'No active subscription'}</span>
        </div>
      </div>

      {loading ? (
        <div className="py-10 text-center text-[#6d847b] text-sm">Loading plans...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <button
              className="text-left rounded-2xl border border-[#c7d7d1] bg-white p-5 hover:border-[#2ea56e] transition-colors"
              key={plan.id}
              onClick={() => navigate(`/subscription/checkout?planId=${encodeURIComponent(plan.id)}`)}
              type="button"
            >
              <div className="flex items-start justify-between">
                <span className="rounded-full bg-[#e9f8ef] px-2.5 py-1 text-xs font-semibold text-[#1b7f4d]">Plan</span>
                <div className="text-right">
                  <div className="text-[28px] font-bold text-[#10271f]">{`\u20b9${plan.price.toLocaleString()}`}</div>
                  <div className="text-xs text-[#70877e]">/ {plan.billingCycle ?? 'month'}</div>
                </div>
              </div>
              <h3 className="mt-4 text-[22px] font-semibold text-[#15362d]">{plan.name}</h3>
              <p className="mt-1 text-sm text-[#6f857d]">{plan.description}</p>
              <ul className="mt-4 space-y-2">
                {plan.features.map((feature) => (
                  <li className="text-sm text-[#36574d]" key={`${plan.id}-${feature}`}>
                    - {feature}
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Subscription;
