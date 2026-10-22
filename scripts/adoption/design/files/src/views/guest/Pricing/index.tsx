import { useNavigate } from 'react-router-dom';

import { Button } from 'components/Button';
import { RadioGroup } from 'components/Form/RadioGroup';
import { LinkBase } from 'components/LinkBase';
import { Text } from 'components/Text';
import { appConfig } from 'config';
import { LayoutHeader } from 'containers/Layouts/common/LayoutHeader';
import { MainLayout } from 'containers/Layouts/MainLayout';
import { paths } from 'globals/paths';
import { useI18n } from 'i18n/provider';

import { usePricing, type BillingPeriod } from './logic';
import {
  _PricingBadge,
  _PricingBilling,
  _PricingBrand,
  _PricingCard,
  _PricingCheck,
  _PricingContent,
  _PricingFeatures,
  _PricingHero,
  _PricingMark,
  _PricingPlans,
  _PricingPrice,
} from './styles';

const SALES_EMAIL = 'mailto:sales@ledgerly.example';

/**
 * Public pricing page (paths.pricing): three plans and the billing period.
 * MainLayout owns the page's `main` landmark and scrolling.
 */
export function Pricing() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const pricing = usePricing();

  return (
    <MainLayout
      showFooter={false}
      header={
        <LayoutHeader
          Left={
            <_PricingBrand>
              <_PricingMark aria-hidden="true" />
              <Text variant="headingXsBold">{appConfig.appName}</Text>
            </_PricingBrand>
          }
          Right={
            <LinkBase to={paths.signIn}>{t('guest.pricing.signIn')}</LinkBase>
          }
        />
      }
    >
      <_PricingContent>
        <_PricingHero>
          <Text as="h1" variant="headingXl" align="center">
            {t('guest.pricing.title')}
          </Text>
          <Text as="p" color="secondary" align="center">
            {t('guest.pricing.intro')}
          </Text>
        </_PricingHero>

        <_PricingBilling>
          <RadioGroup<BillingPeriod>
            legend={t('guest.pricing.billing.legend')}
            name="billing-period"
            value={pricing.period}
            onChange={pricing.setPeriod}
            options={[
              { value: 'monthly', label: t('guest.pricing.billing.monthly') },
              {
                value: 'yearly',
                label: t('guest.pricing.billing.yearly'),
                description: t('guest.pricing.billing.yearlyHint'),
              },
            ]}
          />
        </_PricingBilling>

        <_PricingPlans aria-label={t('guest.pricing.plans.label')}>
          {pricing.plans.map((plan) => {
            const headingId = `plan-${plan.id}`;
            return (
              <li key={plan.id}>
                <article aria-labelledby={headingId}>
                  <_PricingCard
                    $popular={plan.popular}
                    backgroundColor="raised"
                    borderRadius="md"
                    px="lg"
                    py="lg"
                  >
                    {plan.popular ? (
                      <_PricingBadge as="p" variant="captionMdBold">
                        {t('guest.pricing.plans.popular')}
                      </_PricingBadge>
                    ) : null}
                    <Text as="h2" id={headingId} variant="headingSm">
                      {t(`guest.pricing.plans.${plan.id}.name`)}
                    </Text>
                    <Text as="p" color="secondary">
                      {t(`guest.pricing.plans.${plan.id}.description`)}
                    </Text>
                    <_PricingPrice>
                      <Text as="span" variant="headingXl" numeric="tabular">
                        {plan.price}
                      </Text>
                      <Text as="span" color="secondary">
                        {plan.isFree
                          ? t('guest.pricing.plans.perMonth')
                          : t('guest.pricing.plans.perUserMonth')}
                      </Text>
                    </_PricingPrice>
                    <Text as="p" variant="captionMd" color="secondary">
                      {plan.isFree
                        ? t('guest.pricing.plans.free')
                        : pricing.period === 'yearly'
                          ? t('guest.pricing.plans.billedYearly', {
                              total: plan.yearlyTotal,
                            })
                          : t('guest.pricing.plans.billedMonthly')}
                    </Text>
                    {plan.id === 'business' ? (
                      <LinkBase href={SALES_EMAIL}>
                        {t('guest.pricing.plans.business.cta')}
                      </LinkBase>
                    ) : (
                      <Button
                        isFullWidth
                        variant={plan.popular ? 'primary' : 'secondary'}
                        label={t(`guest.pricing.plans.${plan.id}.cta`)}
                        onClick={() => {
                          navigate(paths.signIn);
                        }}
                      />
                    )}
                    <_PricingFeatures>
                      {plan.features.map((feature) => (
                        <li key={feature}>
                          <_PricingCheck aria-hidden="true">✓</_PricingCheck>
                          <Text>{t(feature)}</Text>
                        </li>
                      ))}
                    </_PricingFeatures>
                  </_PricingCard>
                </article>
              </li>
            );
          })}
        </_PricingPlans>

        <Text as="p" variant="captionMd" color="tertiary" align="center">
          {t('guest.pricing.footnote')}
        </Text>
      </_PricingContent>
    </MainLayout>
  );
}
