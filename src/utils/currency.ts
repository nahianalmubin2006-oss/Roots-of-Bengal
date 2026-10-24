import { DeliveryZoneCode, MarketCode, Product } from '../types/heritage';

export function formatMarketPrice(priceBDT: number, priceINR: number, market: MarketCode): string {
  if (market === 'IN') {
    return `₹${priceINR.toLocaleString('en-IN')}`;
  }
  return `৳${priceBDT.toLocaleString('en-US')}`;
}

export function getUnitPriceForMarket(product: Product, market: MarketCode, variantId?: string): number {
  if (variantId && product.variants) {
    const matched = product.variants.find((v) => v.id === variantId);
    if (matched && typeof matched.priceBDT === 'number' && market !== 'IN') {
      return matched.priceBDT;
    }
  }
  return market === 'IN' ? product.priceINR : product.priceBDT;
}

export function getCurrencySymbol(market: MarketCode): string {
  return market === 'IN' ? '₹' : '৳';
}

export function getFreeShippingThreshold(market: MarketCode): number {
  return market === 'IN' ? 2500 : 3000;
}

export function getStandardShippingFee(market: MarketCode): number {
  if (market === 'INTL') return 0;
  return market === 'IN' ? 150 : 80;
}

/**
 * Integer minor unit (poisha) helpers: 1 BDT = 100 poisha.
 * Prevents floating-point rounding discrepancies in Firestore & Cloud Functions.
 */
export function bdtToPoisha(bdtAmount: number): number {
  return Math.round(bdtAmount) * 100;
}

export function poishaToBdt(poishaAmount: number): number {
  return Math.floor(poishaAmount / 100);
}

export function getBangladeshDeliveryFeeBdt(zone: DeliveryZoneCode): number {
  return zone === 'dhaka_metro' ? 80 : 150;
}

export function isValidBangladeshPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s-]/g, '');
  return /^(\+?880|0)1[3-9][0-9]{8}$/.test(cleaned);
}
