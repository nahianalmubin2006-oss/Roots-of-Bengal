import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { PRODUCTS_DATA } from '../data/catalogData';
import {
  buildSkuForVariant,
  filterAndSortProducts,
  FirestoreProductDoc,
  FirestoreVariantDoc,
  getCanonicalFirestoreProductId,
  mergeLiveAndCatalogProducts,
} from '../lib/firebaseProducts';
import {
  validateCartAgainstCatalog,
  validateCartItemAddition,
} from '../lib/firebaseCart';
import {
  bdtToPoisha,
  getBangladeshDeliveryFeeBdt,
  isValidBangladeshPhone,
  poishaToBdt,
} from '../utils/currency';

describe('Roots of Bengal — Catalog Search, Filtering & Sorting', () => {
  const enrichedCatalog = mergeLiveAndCatalogProducts(PRODUCTS_DATA, new Map());

  it('finds products by English name and description', () => {
    const results = filterAndSortProducts(enrichedCatalog, {
      searchQuery: 'Jamdani',
    });
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((p) => p.slug === 'rupganj-dhakai-jamdani-saree')).toBe(true);
  });

  it('finds products by Bangla name and description (নকশিকাঁথা / জামদানি)', () => {
    const kanthaResults = filterAndSortProducts(enrichedCatalog, {
      searchQuery: 'নকশিকাঁথা',
    });
    expect(kanthaResults.length).toBeGreaterThanOrEqual(1);
    expect(kanthaResults[0].category).toBe('Nakshi Kantha');

    const jamdaniResults = filterAndSortProducts(enrichedCatalog, {
      searchQuery: 'জামদানি',
    });
    expect(jamdaniResults.length).toBeGreaterThanOrEqual(1);
    expect(jamdaniResults.some((p) => p.category === 'Jamdani & Weaving')).toBe(true);
  });

  it('filters accurately by category, region, and artisanId', () => {
    const byCategory = filterAndSortProducts(enrichedCatalog, {
      category: 'Pottery & Terracotta',
    });
    expect(byCategory.every((p) => p.category === 'Pottery & Terracotta')).toBe(true);

    const byRegion = filterAndSortProducts(enrichedCatalog, {
      region: 'Rangamati, Chittagong Hill Tracts',
    });
    expect(byRegion.length).toBeGreaterThanOrEqual(1);
    expect(byRegion.every((p) => p.regionTag === 'Rangamati, Chittagong Hill Tracts')).toBe(true);

    const byArtisan = filterAndSortProducts(enrichedCatalog, {
      artisanId: 'rahima-begum',
    });
    expect(byArtisan.length).toBeGreaterThanOrEqual(1);
    expect(byArtisan.every((p) => p.artisanId === 'rahima-begum')).toBe(true);
  });

  it('sorts products by price ascending and descending in BDT', () => {
    const asc = filterAndSortProducts(enrichedCatalog, { sortBy: 'price-asc' });
    for (let i = 1; i < asc.length; i++) {
      expect(asc[i].priceBDT).toBeGreaterThanOrEqual(asc[i - 1].priceBDT);
    }

    const desc = filterAndSortProducts(enrichedCatalog, { sortBy: 'price-desc' });
    for (let i = 1; i < desc.length; i++) {
      expect(desc[i].priceBDT).toBeLessThanOrEqual(desc[i - 1].priceBDT);
    }
  });
});

describe('Roots of Bengal — Live Firestore Catalog Merge, SKUs & Poisha Math', () => {
  it('converts BDT to integer poisha (1 BDT = 100 poisha) without floating-point drift', () => {
    expect(bdtToPoisha(4800)).toBe(480000);
    expect(bdtToPoisha(80)).toBe(8000);
    expect(bdtToPoisha(150)).toBe(15000);
    expect(poishaToBdt(480000)).toBe(4800);
  });

  it('builds deterministic heritage SKUs for variants', () => {
    const sku = buildSkuForVariant('nakshi-kantha-lotus-throw', 'terracotta');
    expect(sku).toBe('ROB-NAK-KAN-TERRAC');
  });

  it('separates unverified Demo catalog items from Verified Live Firestore products', () => {
    const defaultMerged = mergeLiveAndCatalogProducts(PRODUCTS_DATA, new Map());
    expect(defaultMerged.every((p) => p.isDemoData === true)).toBe(true);
    expect(defaultMerged.every((p) => p.verificationStatus === 'demo_only')).toBe(true);

    const liveMap = new Map<
      string,
      { product: FirestoreProductDoc; variants: FirestoreVariantDoc[] }
    >();
    const prod1Id = getCanonicalFirestoreProductId(1);
    liveMap.set(prod1Id, {
      product: {
        id: prod1Id,
        slug: 'nakshi-kantha-lotus-throw',
        nameEn: 'Nakshi Kantha Heirloom Throw',
        nameBn: 'পদ্ম-লতা নকশিকাঁথা চাদর',
        category: 'Nakshi Kantha',
        region: 'Jamalpur, Mymensingh',
        artisanId: 'rahima-begum',
        priceBdt: 4800,
        priceMinorUnits: 480000,
        currency: 'BDT',
        stockCount: 5,
        reservedStock: 0,
        isPublished: true,
        isDemoData: false,
        verificationStatus: 'verified',
      },
      variants: [
        {
          id: 'terracotta',
          productId: prod1Id,
          sku: 'ROB-NAK-KAN-TERRAC',
          labelEn: 'Terracotta Madder & Ivory',
          labelBn: 'পোড়ামাটি লাল ও কোরা সাদা',
          priceBdt: 4800,
          priceMinorUnits: 480000,
          stockCount: 5,
          reservedStock: 0,
          isAvailable: true,
        },
        {
          id: 'paddy-green',
          productId: prod1Id,
          sku: 'ROB-NAK-KAN-PADDYG',
          labelEn: 'Paddy Leaf & Earth',
          labelBn: 'ধানপাতা সবুজ ও মাটিয়া',
          priceBdt: 4800,
          priceMinorUnits: 480000,
          stockCount: 0,
          reservedStock: 0,
          isAvailable: false,
        },
      ],
    });

    const mergedWithLive = mergeLiveAndCatalogProducts(PRODUCTS_DATA, liveMap);
    const verifiedProd = mergedWithLive.find((p) => p.id === 1)!;
    expect(verifiedProd.isDemoData).toBe(false);
    expect(verifiedProd.isPublished).toBe(true);
    expect(verifiedProd.verificationStatus).toBe('verified');

    const verifiedOnlyList = filterAndSortProducts(mergedWithLive, { verifiedOnly: true });
    expect(verifiedOnlyList.length).toBe(1);
    expect(verifiedOnlyList[0].id).toBe(1);
  });
});

describe('Roots of Bengal — Cart Stock Validation & Demo Product Rejection', () => {
  const liveMap = new Map<
    string,
    { product: FirestoreProductDoc; variants: FirestoreVariantDoc[] }
  >();
  const prod1Id = getCanonicalFirestoreProductId(1);
  liveMap.set(prod1Id, {
    product: {
      id: prod1Id,
      slug: 'nakshi-kantha-lotus-throw',
      nameEn: 'Nakshi Kantha Heirloom Throw',
      nameBn: 'পদ্ম-লতা নকশিকাঁথা চাদর',
      category: 'Nakshi Kantha',
      region: 'Jamalpur, Mymensingh',
      artisanId: 'rahima-begum',
      priceBdt: 4800,
      priceMinorUnits: 480000,
      currency: 'BDT',
      stockCount: 2,
      reservedStock: 0,
      isPublished: true,
      isDemoData: false,
      verificationStatus: 'verified',
    },
    variants: [
      {
        id: 'terracotta',
        productId: prod1Id,
        sku: 'ROB-NAK-KAN-TERRAC',
        labelEn: 'Terracotta Madder & Ivory',
        labelBn: 'পোড়ামাটি লাল ও কোরা সাদা',
        priceBdt: 4800,
        priceMinorUnits: 480000,
        stockCount: 2,
        reservedStock: 0,
        isAvailable: true,
      },
      {
        id: 'paddy-green',
        productId: prod1Id,
        sku: 'ROB-NAK-KAN-PADDYG',
        labelEn: 'Paddy Leaf & Earth',
        labelBn: 'ধানপাতা সবুজ ও মাটিয়া',
        priceBdt: 4800,
        priceMinorUnits: 480000,
        stockCount: 0,
        reservedStock: 0,
        isAvailable: false,
      },
    ],
  });

  const catalog = mergeLiveAndCatalogProducts(PRODUCTS_DATA, liveMap);
  const verifiedProd1 = catalog.find((p) => p.id === 1)!;

  it('rejects adding an out-of-stock variant to the bag', () => {
    const check = validateCartItemAddition(verifiedProd1, 'paddy-green', 1);
    expect(check.allowed).toBe(false);
    expect(check.clampedQuantity).toBe(0);
  });

  it('clamps requested quantity to available variant stock', () => {
    const check = validateCartItemAddition(verifiedProd1, 'terracotta', 5);
    expect(check.allowed).toBe(true);
    expect(check.clampedQuantity).toBe(2);
  });

  it('blocks live COD checkout when cart contains an unverified Demo product', () => {
    const result = validateCartAgainstCatalog(
      [
        { productId: 1, variantId: 'terracotta', quantity: 1 },
        { productId: 2, variantId: 'kora-terracotta', quantity: 1 }, // Product 2 is still Demo
      ],
      catalog,
      'dhaka_metro'
    );
    expect(result.isValidForLiveOrder).toBe(false);
    expect(result.issues.some((i) => i.reasonCode === 'DEMO_PRODUCT')).toBe(true);
  });

  it('approves live COD checkout and computes exact poisha totals when all items are verified and in stock', () => {
    const result = validateCartAgainstCatalog(
      [{ productId: 1, variantId: 'terracotta', quantity: 2 }],
      catalog,
      'outside_dhaka'
    );
    expect(result.isValidForLiveOrder).toBe(true);
    expect(result.subtotalBdt).toBe(9600);
    expect(result.subtotalMinorUnits).toBe(960000);
    expect(result.shippingBdt).toBe(150);
    expect(result.shippingMinorUnits).toBe(15000);
    expect(result.totalBdt).toBe(9750);
    expect(result.totalMinorUnits).toBe(975000);
  });
});

describe('Roots of Bengal — Bangladesh Phone & Security Rules Verification', () => {
  it('validates Bangladesh mobile phone numbers accurately', () => {
    expect(isValidBangladeshPhone('01712345678')).toBe(true);
    expect(isValidBangladeshPhone('+8801812345678')).toBe(true);
    expect(isValidBangladeshPhone('8801912345678')).toBe(true);
    expect(isValidBangladeshPhone('01112345678')).toBe(false); // 011 operator prefix invalid
    expect(isValidBangladeshPhone('12345')).toBe(false);
  });

  it('computes Bangladesh delivery fees accurately by zone', () => {
    expect(getBangladeshDeliveryFeeBdt('dhaka_metro')).toBe(80);
    expect(getBangladeshDeliveryFeeBdt('outside_dhaka')).toBe(150);
  });

  it('verifies Zero-Trust invariants in firestore.rules and storage.rules', () => {
    const firestoreRules = fs.readFileSync(
      path.resolve(process.cwd(), 'firestore.rules'),
      'utf-8'
    );
    // Verify COD order invariants in rules
    expect(firestoreRules).toContain("data.paymentMethod == 'COD'");
    expect(firestoreRules).toContain("data.paymentStatus == 'unpaid_cod'");
    expect(firestoreRules).toContain("data.orderStatus == 'pending_verification'");
    // Verify server-side price match in order item creation rule
    expect(firestoreRules).toContain('data.unitPriceBdt == variantDoc.data.priceBdt');
    expect(firestoreRules).toContain('data.unitPriceMinorUnits == variantDoc.data.priceMinorUnits');
    // Verify non-negative stock invariant
    expect(firestoreRules).toContain('request.resource.data.stockCount >= 0');
    // Verify customer can only cancel when pending_verification
    expect(firestoreRules).toContain("resource.data.orderStatus == 'pending_verification'");

    const storageRules = fs.readFileSync(
      path.resolve(process.cwd(), 'storage.rules'),
      'utf-8'
    );
    expect(storageRules).toContain("request.resource.contentType.matches('image/(jpeg|png|webp|avif)')");
    expect(storageRules).toContain('allow read, write: if false;');
  });
});
