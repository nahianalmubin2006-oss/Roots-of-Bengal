import { MarketCode, Product } from '../types/heritage';

export function formatMarketPrice(priceBDT: number, priceINR: number, market: MarketCode): string {
  if (market === 'IN') {
    return `₹${priceINR.toLocaleString('en-IN')}`;
  }
  // Default to BDT for BD and INTL (with INTL showing BDT reference)
  return `৳${priceBDT.toLocaleString('en-US')}`;
}

export function getUnitPriceForMarket(product: Product, market: MarketCode): number {
  return market === 'IN' ? product.priceINR : product.priceBDT;
}

export function getCurrencySymbol(market: MarketCode): string {
  return market === 'IN' ? '₹' : '৳';
}

export function getFreeShippingThreshold(market: MarketCode): number {
  return market === 'IN' ? 2500 : 3000;
}

export function getStandardShippingFee(market: MarketCode): number {
  if (market === 'INTL') return 0; // Calculated upon customs inquiry
  return market === 'IN' ? 150 : 120;
}
