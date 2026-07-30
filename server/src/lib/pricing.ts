// Effective publication price.
//
// KZT is the base currency: the tenge amount is what Halyk ePay actually charges and
// what the site shows as the headline price. The USD figure is derived from the stored
// exchange rate and is informational (it is only charged to non-residents).
//
// The price lives in the `pricing-setting` single type so admins can change it without a
// redeploy. Until an admin saves it once, the .env defaults apply (see lib/config.ts).

import { config } from './config';
import { fail } from './domain';
import { logger } from './logger';

const uid = 'api::pricing-setting.pricing-setting' as const;

const MIN_KZT = 1;
const MAX_KZT = 100_000_000;
const MIN_RATE = 1;
const MAX_RATE = 10_000;

export type Pricing = {
  residentKztAmount: number;
  usdToKztRate: number;
  residentCurrency: 'KZT';
  nonResidentAmount: number;
  nonResidentCurrency: 'USD';
  publicationFeeUsd: number;
};

export type EffectivePricing = Pricing & {
  source: 'db' | 'env';
  updatedAt: string | null;
  updatedBy: string;
};

function derive(residentKztAmount: number, usdToKztRate: number): Pricing {
  const kzt = Math.round(residentKztAmount);
  const usd = Math.round((kzt / usdToKztRate) * 100) / 100;
  return {
    residentKztAmount: kzt,
    usdToKztRate,
    residentCurrency: 'KZT',
    nonResidentAmount: usd,
    nonResidentCurrency: 'USD',
    publicationFeeUsd: usd,
  };
}

export function defaultPricing(): Pricing {
  return derive(config.pricingDefaults.residentKztAmount, config.pricingDefaults.usdToKztRate);
}

function envPricing(): EffectivePricing {
  return { ...defaultPricing(), source: 'env', updatedAt: null, updatedBy: '' };
}

export function validatePricingInput(input: Record<string, any>) {
  const residentKztAmount = Number(input.residentKztAmount);
  const usdToKztRate = Number(input.usdToKztRate);
  if (!Number.isFinite(residentKztAmount) || residentKztAmount < MIN_KZT || residentKztAmount > MAX_KZT) {
    throw fail(`Publication fee in KZT must be a number between ${MIN_KZT} and ${MAX_KZT}.`);
  }
  if (!Number.isFinite(usdToKztRate) || usdToKztRate < MIN_RATE || usdToKztRate > MAX_RATE) {
    throw fail(`USD to KZT rate must be a number between ${MIN_RATE} and ${MAX_RATE}.`);
  }
  return derive(residentKztAmount, Math.round(usdToKztRate * 100) / 100);
}

export async function readPricing(): Promise<EffectivePricing> {
  try {
    const [row] = await strapi.db.query(uid).findMany({ limit: 1 });
    const kzt = Number(row?.residentKztAmount);
    const rate = Number(row?.usdToKztRate);
    if (Number.isFinite(kzt) && kzt > 0 && Number.isFinite(rate) && rate > 0) {
      return {
        ...derive(kzt, rate),
        source: 'db',
        updatedAt: row.pricingUpdatedAt ? new Date(row.pricingUpdatedAt).toISOString() : null,
        updatedBy: row.updatedByAdmin || '',
      };
    }
  } catch (error) {
    logger.error('Could not read pricing setting, falling back to env defaults', { error: String(error) });
  }
  return envPricing();
}

export async function savePricing(input: Record<string, any>, actor: string): Promise<EffectivePricing> {
  const pricing = validatePricingInput(input);
  const updatedAt = new Date().toISOString();
  const data = {
    residentKztAmount: pricing.residentKztAmount,
    usdToKztRate: pricing.usdToKztRate,
    updatedByAdmin: actor,
    pricingUpdatedAt: updatedAt,
  };
  const query = strapi.db.query(uid);
  const [existing] = await query.findMany({ limit: 1 });
  if (existing) {
    await query.update({ where: { id: existing.id }, data });
  } else {
    await query.create({ data });
  }
  return { ...pricing, source: 'db', updatedAt, updatedBy: actor };
}
