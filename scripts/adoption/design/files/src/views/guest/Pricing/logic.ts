import { useState } from 'react';

import { formatCurrency, type I18nKey } from 'i18n';
import { useI18n } from 'i18n/provider';

export type BillingPeriod = 'monthly' | 'yearly';

/**
 * The plans, in euros per user and month. Yearly billing costs ten months
 * (two months free), rounded to whole euros per month. Prices are product
 * copy kept with the page until a billing API provides them.
 */
type Plan = {
  id: 'starter' | 'team' | 'business';
  /** Euros per user and month. */
  monthly: number;
  yearly: number;
  popular: boolean;
  features: readonly I18nKey[];
};

export const PLANS: readonly Plan[] = [
  {
    id: 'starter',
    monthly: 0,
    yearly: 0,
    popular: false,
    features: [
      'guest.pricing.plans.starter.feature1',
      'guest.pricing.plans.starter.feature2',
      'guest.pricing.plans.starter.feature3',
    ],
  },
  {
    id: 'team',
    monthly: 12,
    yearly: 10,
    popular: true,
    features: [
      'guest.pricing.plans.team.feature1',
      'guest.pricing.plans.team.feature2',
      'guest.pricing.plans.team.feature3',
      'guest.pricing.plans.team.feature4',
    ],
  },
  {
    id: 'business',
    monthly: 29,
    yearly: 24,
    popular: false,
    features: [
      'guest.pricing.plans.business.feature1',
      'guest.pricing.plans.business.feature2',
      'guest.pricing.plans.business.feature3',
      'guest.pricing.plans.business.feature4',
    ],
  },
];

const CURRENCY = 'EUR';

/** Billing period (local UI state) and each plan's displayed prices. */
export const usePricing = () => {
  const { lang } = useI18n();
  const [period, setPeriod] = useState<BillingPeriod>('monthly');
  const euros = (value: number) =>
    formatCurrency(value, {
      locale: lang,
      currency: CURRENCY,
      maximumFractionDigits: 0,
    });

  return {
    period,
    setPeriod,
    plans: PLANS.map((plan) => {
      const perMonth = period === 'yearly' ? plan.yearly : plan.monthly;
      return {
        ...plan,
        price: euros(perMonth),
        isFree: plan.monthly === 0,
        yearlyTotal: euros(plan.yearly * 12),
      };
    }),
  };
};
