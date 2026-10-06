// Official USD/KZT rate of the National Bank of Kazakhstan (НБ РК).
//
// The public feed needs no key and returns every currency for a given date as XML:
//   https://nationalbank.kz/rss/get_rates.cfm?fdate=DD.MM.YYYY
// The rate is cached in memory for a short time; the last fetched value is also persisted
// in the pricing setting (see lib/pricing.ts) so an outage never leaves the site without a price.

import { config } from './config';
import { logger } from './logger';

export type OfficialRate = {
  rate: number;
  date: string; // YYYY-MM-DD, the date the National Bank set the rate for
  source: 'nbk';
};

const CACHE_TTL_MS = 30 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 8000;

let cached: { value: OfficialRate; fetchedAt: number } | null = null;

// Kazakhstan has a single UTC+5 time zone; the National Bank publishes rates by local date.
function almatyDate(now = new Date()) {
  const local = new Date(now.getTime() + 5 * 60 * 60 * 1000);
  return {
    iso: local.toISOString().slice(0, 10),
    nbk: `${String(local.getUTCDate()).padStart(2, '0')}.${String(local.getUTCMonth() + 1).padStart(2, '0')}.${local.getUTCFullYear()}`,
  };
}

export function parseNbkUsdRate(xml: string) {
  const items = String(xml || '').match(/<item>[\s\S]*?<\/item>/g) || [];
  for (const item of items) {
    const code = item.match(/<title>\s*([A-Z]{3})\s*<\/title>/)?.[1];
    if (code !== 'USD') continue;
    const value = Number(item.match(/<description>\s*([\d.,]+)\s*<\/description>/)?.[1]?.replace(',', '.'));
    const quant = Number(item.match(/<quant>\s*(\d+)\s*<\/quant>/)?.[1] || 1);
    if (Number.isFinite(value) && value > 0 && quant > 0) return Math.round((value / quant) * 100) / 100;
  }
  return null;
}

export async function fetchOfficialUsdRate({ force = false } = {}): Promise<OfficialRate> {
  const day = almatyDate();
  // A cached rate is only reused on the same local day, so midnight never serves yesterday's rate.
  if (!force && cached && cached.value.date === day.iso && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached.value;

  const url = `${config.exchangeRate.nbkUrl}?fdate=${day.nbk}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const rate = parseNbkUsdRate(await response.text());
    if (!rate) throw new Error('USD rate is missing in the National Bank response');
    const value: OfficialRate = { rate, date: day.iso, source: 'nbk' };
    cached = { value, fetchedAt: Date.now() };
    return value;
  } catch (error) {
    logger.warn('National Bank exchange rate request failed', { url, error: String(error) });
    throw new Error('Could not load the National Bank exchange rate.');
  } finally {
    clearTimeout(timer);
  }
}
