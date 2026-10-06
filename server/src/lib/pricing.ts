// Effective publication price.
//
// The admin sets the fee in one base currency (KZT or USD); the other currency is derived
// from the USD/KZT rate. The rate is either the official National Bank of Kazakhstan rate
// (refreshed automatically, see lib/exchange-rate.ts) or a manual value.
// Residents are charged the tenge amount through Halyk ePay, non-residents the USD amount.
//
// The price lives in the `pricing-setting` single type so admins can change it without a
// redeploy. Until an admin saves it once, the .env defaults apply (see lib/config.ts).

import { config } from './config';
import { fail } from './domain';
import { fetchOfficialUsdRate } from './exchange-rate';
import { logger } from './logger';

const uid = 'api::pricing-setting.pricing-setting' as const;

const LIMITS = {
  KZT: { min: 1, max: 100_000_000 },
  USD: { min: 1, max: 200_000 },
};
const MIN_RATE = 1;
const MAX_RATE = 10_000;

export type BaseCurrency = 'KZT' | 'USD';
export type RateMode = 'auto' | 'manual';

export type Pricing = {
  baseCurrency: BaseCurrency;
  baseAmount: number;
  rateMode: RateMode;
  rateDate: string | null;
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

const roundUsd = (value: number) => Math.round(value * 100) / 100;

function derive(baseCurrency: BaseCurrency, baseAmount: number, usdToKztRate: number, rateMode: RateMode, rateDate: string | null): Pricing {
  const kzt = baseCurrency === 'KZT' ? Math.round(baseAmount) : Math.round(baseAmount * usdToKztRate);
  const usd = baseCurrency === 'USD' ? roundUsd(baseAmount) : roundUsd(kzt / usdToKztRate);
  return {
    baseCurrency,
    baseAmount: baseCurrency === 'KZT' ? kzt : usd,
    rateMode,
    rateDate,
    residentKztAmount: kzt,
    usdToKztRate,
    residentCurrency: 'KZT',
    nonResidentAmount: usd,
    nonResidentCurrency: 'USD',
    publicationFeeUsd: usd,
  };
}

export function defaultPricing(): Pricing {
  return derive('KZT', config.pricingDefaults.residentKztAmount, config.pricingDefaults.usdToKztRate, 'manual', null);
}

function envPricing(): EffectivePricing {
  return { ...defaultPricing(), source: 'env', updatedAt: null, updatedBy: '' };
}

function dateOnly(value: unknown) {
  if (!value) return null;
  const text = value instanceof Date ? value.toISOString() : String(value);
  return /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10) : null;
}

// Rows saved before base currency / rate mode existed are KZT-based with a manual rate.
function rowToPricing(row: Record<string, any> | null | undefined): Pricing | null {
  if (!row) return null;
  const rate = Number(row.usdToKztRate);
  const baseCurrency: BaseCurrency = row.baseCurrency === 'USD' ? 'USD' : 'KZT';
  const baseAmount = Number(row.baseAmount ?? (baseCurrency === 'KZT' ? row.residentKztAmount : NaN));
  if (!Number.isFinite(rate) || rate <= 0 || !Number.isFinite(baseAmount) || baseAmount <= 0) return null;
  return derive(baseCurrency, baseAmount, rate, row.rateMode === 'auto' ? 'auto' : 'manual', dateOnly(row.rateDate));
}

function assertRange(value: number, currency: BaseCurrency, message: string) {
  const { min, max } = LIMITS[currency];
  if (!Number.isFinite(value) || value < min || value > max) throw fail(message);
}

export function validatePricingInput(input: Record<string, any>, officialRate?: { rate: number; date: string }) {
  // Legacy payload: { residentKztAmount, usdToKztRate }.
  const legacy = input.baseAmount === undefined && input.residentKztAmount !== undefined;
  const baseCurrency: BaseCurrency = !legacy && String(input.baseCurrency).toUpperCase() === 'USD' ? 'USD' : 'KZT';
  const baseAmount = Number(legacy ? input.residentKztAmount : input.baseAmount);
  const rateMode: RateMode = !legacy && input.rateMode === 'auto' ? 'auto' : 'manual';

  assertRange(baseAmount, baseCurrency, `Publication fee in ${baseCurrency} must be a number between ${LIMITS[baseCurrency].min} and ${LIMITS[baseCurrency].max}.`);

  let rate: number;
  let rateDate: string | null = null;
  if (rateMode === 'auto') {
    if (!officialRate) throw fail('Could not load the National Bank exchange rate.');
    rate = officialRate.rate;
    rateDate = officialRate.date;
  } else {
    rate = Math.round(Number(input.usdToKztRate) * 100) / 100;
    if (!Number.isFinite(rate) || rate < MIN_RATE || rate > MAX_RATE) {
      throw fail(`USD to KZT rate must be a number between ${MIN_RATE} and ${MAX_RATE}.`);
    }
  }

  const pricing = derive(baseCurrency, baseAmount, rate, rateMode, rateDate);
  assertRange(pricing.residentKztAmount, 'KZT', `Publication fee in KZT must be a number between ${LIMITS.KZT.min} and ${LIMITS.KZT.max}.`);
  return pricing;
}

function pricingToRow(pricing: Pricing) {
  return {
    baseCurrency: pricing.baseCurrency,
    baseAmount: pricing.baseAmount,
    rateMode: pricing.rateMode,
    rateDate: pricing.rateDate,
    // Derived values are stored too, for reports and older readers.
    residentKztAmount: pricing.residentKztAmount,
    usdToKztRate: pricing.usdToKztRate,
  };
}

async function readRow() {
  const [row] = await strapi.db.query(uid).findMany({ limit: 1 });
  return row || null;
}

function todayInKazakhstan() {
  return new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

let refreshInFlight: Promise<EffectivePricing | null> | null = null;
// After a failed refresh, page views wait before asking the National Bank again,
// so an outage does not turn every request into an outbound call.
const RETRY_AFTER_FAILURE_MS = 5 * 60 * 1000;
let lastRefreshFailureAt = 0;

// Pulls today's official rate into an auto-mode pricing row. Manual pricing is left alone.
export function refreshOfficialRate({ force = false } = {}): Promise<EffectivePricing | null> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const row = await readRow();
    const current = rowToPricing(row);
    if (!row || !current || current.rateMode !== 'auto') return null;
    if (!force && current.rateDate === todayInKazakhstan()) return null;
    const official = await fetchOfficialUsdRate({ force });
    const next = derive(current.baseCurrency, current.baseAmount, official.rate, 'auto', official.date);
    await strapi.db.query(uid).update({ where: { id: row.id }, data: pricingToRow(next) });
    if (next.usdToKztRate !== current.usdToKztRate) {
      logger.info('Publication pricing follows the new National Bank rate', {
        rate: next.usdToKztRate,
        rateDate: next.rateDate,
        residentKztAmount: next.residentKztAmount,
        nonResidentAmount: next.nonResidentAmount,
      });
    }
    return {
      ...next,
      source: 'db' as const,
      updatedAt: row.pricingUpdatedAt ? new Date(row.pricingUpdatedAt).toISOString() : null,
      updatedBy: row.updatedByAdmin || '',
    };
  })()
    .catch((error) => {
      lastRefreshFailureAt = Date.now();
      throw error;
    })
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

export async function readPricing(): Promise<EffectivePricing> {
  try {
    const row = await readRow();
    const pricing = rowToPricing(row);
    if (pricing) {
      // The hourly cron keeps the rate current; this only covers a missed run. The stored
      // rate is served meanwhile so a slow National Bank never delays a page.
      if (
        pricing.rateMode === 'auto' &&
        pricing.rateDate !== todayInKazakhstan() &&
        Date.now() - lastRefreshFailureAt > RETRY_AFTER_FAILURE_MS
      ) {
        refreshOfficialRate().catch(() => {});
      }
      return {
        ...pricing,
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
  let officialRate;
  if (input.rateMode === 'auto') {
    try {
      officialRate = await fetchOfficialUsdRate();
    } catch {
      throw fail('Could not load the National Bank exchange rate.');
    }
  }
  const pricing = validatePricingInput(input, officialRate);
  const updatedAt = new Date().toISOString();
  const data = { ...pricingToRow(pricing), updatedByAdmin: actor, pricingUpdatedAt: updatedAt };
  const query = strapi.db.query(uid);
  const existing = await readRow();
  if (existing) {
    await query.update({ where: { id: existing.id }, data });
  } else {
    await query.create({ data });
  }
  return { ...pricing, source: 'db', updatedAt, updatedBy: actor };
}
