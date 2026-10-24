import { CartItem, DeliveryZoneCode, Product } from '../types/heritage';
import { bdtToPoisha, getBangladeshDeliveryFeeBdt, poishaToBdt } from '../utils/currency';

export interface CartValidationIssue {
  productId: number;
  variantId: string;
  reasonCode: 'PRODUCT_NOT_FOUND' | 'VARIANT_NOT_FOUND' | 'OUT_OF_STOCK' | 'INSUFFICIENT_STOCK' | 'DEMO_PRODUCT';
  messageEn: string;
  messageBn: string;
  availableStock: number;
}

export interface CartValidationResult {
  isValidForLiveOrder: boolean;
  isValidForDemoPreview: boolean;
  issues: CartValidationIssue[];
  subtotalBdt: number;
  subtotalMinorUnits: number;
  shippingBdt: number;
  shippingMinorUnits: number;
  totalBdt: number;
  totalMinorUnits: number;
  totalItemCount: number;
}

/**
 * Validates adding or updating an item in the shopping bag against variant stock limits.
 */
export function validateCartItemAddition(
  product: Product,
  variantId: string,
  requestedQuantity: number
): { allowed: boolean; clampedQuantity: number; reasonEn?: string; reasonBn?: string } {
  const variant = product.variants.find((v) => v.id === variantId) || product.variants[0];
  if (!variant) {
    return {
      allowed: false,
      clampedQuantity: 0,
      reasonEn: 'Selected craft variant is unavailable.',
      reasonBn: 'নির্বাচিত ধরনটি বর্তমানে পাওয়া যাচ্ছে না।',
    };
  }

  const maxStock = typeof variant.stockCount === 'number' ? variant.stockCount : variant.inStock ? 10 : 0;
  if (!variant.inStock || maxStock <= 0) {
    return {
      allowed: false,
      clampedQuantity: 0,
      reasonEn: `"${product.name.en} (${variant.label.en})" is currently out of stock.`,
      reasonBn: `"${product.name.bn} (${variant.label.bn})" বর্তমানে স্টকে নেই।`,
    };
  }

  const hardLimit = Math.min(maxStock, 20);
  if (requestedQuantity > hardLimit) {
    return {
      allowed: true,
      clampedQuantity: hardLimit,
      reasonEn: `Only ${hardLimit} handcrafted piece(s) available in this batch.`,
      reasonBn: `এই ব্যাচে কেবল ${hardLimit}টি শিল্পকর্ম অবশিষ্ট আছে।`,
    };
  }

  return {
    allowed: true,
    clampedQuantity: Math.max(1, requestedQuantity),
  };
}

/**
 * Validates the entire cart against the current catalog state and computes
 * integer poisha and BDT totals.
 */
export function validateCartAgainstCatalog(
  cart: CartItem[],
  products: Product[],
  deliveryZone: DeliveryZoneCode = 'dhaka_metro'
): CartValidationResult {
  const issues: CartValidationIssue[] = [];
  let subtotalMinorUnits = 0;
  let totalItemCount = 0;
  let hasDemoProduct = false;
  let hasFatalStockIssue = false;

  for (const item of cart) {
    const product = products.find((p) => p.id === item.productId);
    if (!product) {
      hasFatalStockIssue = true;
      issues.push({
        productId: item.productId,
        variantId: item.variantId,
        reasonCode: 'PRODUCT_NOT_FOUND',
        messageEn: 'A product in your bag is no longer in the catalog.',
        messageBn: 'আপনার ব্যাগের একটি পণ্য ক্যাটালগে আর নেই।',
        availableStock: 0,
      });
      continue;
    }

    const variant = product.variants.find((v) => v.id === item.variantId) || product.variants[0];
    if (!variant) {
      hasFatalStockIssue = true;
      issues.push({
        productId: item.productId,
        variantId: item.variantId,
        reasonCode: 'VARIANT_NOT_FOUND',
        messageEn: `Variant for "${product.name.en}" was not found.`,
        messageBn: `"${product.name.bn}" এর নির্বাচিত ধরনটি পাওয়া যায়নি।`,
        availableStock: 0,
      });
      continue;
    }

    const availableStock =
      typeof variant.stockCount === 'number' ? variant.stockCount : variant.inStock ? 10 : 0;

    if (!variant.inStock || availableStock <= 0) {
      hasFatalStockIssue = true;
      issues.push({
        productId: item.productId,
        variantId: variant.id,
        reasonCode: 'OUT_OF_STOCK',
        messageEn: `"${product.name.en} (${variant.label.en})" is out of stock.`,
        messageBn: `"${product.name.bn} (${variant.label.bn})" স্টকে নেই।`,
        availableStock: 0,
      });
    } else if (item.quantity > availableStock) {
      hasFatalStockIssue = true;
      issues.push({
        productId: item.productId,
        variantId: variant.id,
        reasonCode: 'INSUFFICIENT_STOCK',
        messageEn: `Only ${availableStock} unit(s) of "${product.name.en} (${variant.label.en})" remain in stock.`,
        messageBn: `"${product.name.bn} (${variant.label.bn})" কেবল ${availableStock}টি স্টকে আছে।`,
        availableStock,
      });
    }

    if (product.isDemoData || !product.isPublished || product.verificationStatus !== 'verified') {
      hasDemoProduct = true;
      issues.push({
        productId: item.productId,
        variantId: variant.id,
        reasonCode: 'DEMO_PRODUCT',
        messageEn: `"${product.name.en}" is currently marked as a Demonstration Preview item and requires Admin Firestore verification before live COD purchase.`,
        messageBn: `"${product.name.bn}" বর্তমানে ডেমো প্রিভিউ পণ্য হিসেবে চিহ্নিত; লাইভ অর্ডারের জন্য অ্যাডমিন ভেরিফিকেশন প্রয়োজন।`,
        availableStock,
      });
    }

    const unitBdt = variant.priceBDT ?? product.priceBDT;
    const unitPoisha = bdtToPoisha(unitBdt);
    subtotalMinorUnits += unitPoisha * item.quantity;
    totalItemCount += item.quantity;
  }

  const shippingBdt = cart.length > 0 ? getBangladeshDeliveryFeeBdt(deliveryZone) : 0;
  const shippingMinorUnits = bdtToPoisha(shippingBdt);
  const totalMinorUnits = subtotalMinorUnits + shippingMinorUnits;

  return {
    isValidForLiveOrder: cart.length > 0 && !hasFatalStockIssue && !hasDemoProduct,
    isValidForDemoPreview: cart.length > 0 && !hasFatalStockIssue,
    issues,
    subtotalBdt: poishaToBdt(subtotalMinorUnits),
    subtotalMinorUnits,
    shippingBdt,
    shippingMinorUnits,
    totalBdt: poishaToBdt(totalMinorUnits),
    totalMinorUnits,
    totalItemCount,
  };
}
