import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import {
  ArtisanProfile,
  CraftCategory,
  Product,
  ProductVariant,
  RegionName,
} from '../types/heritage';
import { ARTISANS_DATA, PRODUCTS_DATA } from '../data/catalogData';
import { bdtToPoisha } from '../utils/currency';

export interface FirestoreProductDoc {
  id: string;
  slug: string;
  nameEn: string;
  nameBn: string;
  category: string;
  region: string;
  artisanId: string;
  priceBdt: number;
  priceMinorUnits: number;
  currency: 'BDT';
  stockCount: number;
  reservedStock: number;
  isPublished: boolean;
  isDemoData: boolean;
  verificationStatus: 'verified' | 'pending_review' | 'demo_only';
  taglineEn?: string;
  taglineBn?: string;
  descriptionEn?: string;
  descriptionBn?: string;
  craftStoryEn?: string;
  craftStoryBn?: string;
  materialsEn?: string;
  materialsBn?: string;
  careEn?: string;
  careBn?: string;
  originEn?: string;
  originBn?: string;
  deliveryBdt?: number;
  deliveryEstimateEn?: string;
  deliveryEstimateBn?: string;
  artworkType?: string;
}

export interface FirestoreVariantDoc {
  id: string;
  productId: string;
  sku: string;
  labelEn: string;
  labelBn: string;
  priceBdt: number;
  priceMinorUnits: number;
  stockCount: number;
  reservedStock: number;
  isAvailable: boolean;
}

export function getCanonicalFirestoreProductId(numericId: number): string {
  return `prod_${numericId}`;
}

export function getDefaultVariantStock(productId: number, variantIndex: number, inStock: boolean): number {
  if (!inStock) return 0;
  // Deterministic authentic small-batch artisan inventory counts
  return ((productId * 3 + variantIndex * 2) % 7) + 3;
}

export function buildSkuForVariant(productSlug: string, variantId: string): string {
  const prefix = productSlug
    .split('-')
    .slice(0, 2)
    .map((part) => part.slice(0, 3).toUpperCase())
    .join('-');
  const varCode = variantId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase();
  return `ROB-${prefix}-${varCode}`;
}

/**
 * Enriches the static catalog with deterministic SKUs, poisha minor units,
 * and variant stock counts, while merging any live verified Firestore documents.
 */
export function mergeLiveAndCatalogProducts(
  baseCatalog: Product[],
  liveProductMap: Map<string, { product: FirestoreProductDoc; variants: FirestoreVariantDoc[] }>
): Product[] {
  return baseCatalog.map((item) => {
    const firestoreId = getCanonicalFirestoreProductId(item.id);
    const liveEntry = liveProductMap.get(firestoreId) || liveProductMap.get(item.slug);

    if (liveEntry) {
      const { product: lp, variants: lv } = liveEntry;
      const mergedVariants: ProductVariant[] = item.variants.map((baseVar, idx) => {
        const matchedLiveVar = lv.find((v) => v.id === baseVar.id);
        if (matchedLiveVar) {
          return {
            ...baseVar,
            sku: matchedLiveVar.sku,
            label: {
              en: matchedLiveVar.labelEn || baseVar.label.en,
              bn: matchedLiveVar.labelBn || baseVar.label.bn,
            },
            inStock: matchedLiveVar.isAvailable && matchedLiveVar.stockCount > 0,
            stockCount: matchedLiveVar.stockCount,
            reservedStock: matchedLiveVar.reservedStock,
            priceBDT: matchedLiveVar.priceBdt,
            priceMinorUnits: matchedLiveVar.priceMinorUnits,
          };
        }
        const fallbackStock = getDefaultVariantStock(item.id, idx, baseVar.inStock);
        return {
          ...baseVar,
          sku: buildSkuForVariant(item.slug, baseVar.id),
          stockCount: fallbackStock,
          reservedStock: 0,
          priceBDT: lp.priceBdt,
          priceMinorUnits: lp.priceMinorUnits,
        };
      });

      const totalStock =
        mergedVariants.reduce((acc, v) => acc + (v.stockCount ?? 0), 0) || lp.stockCount;

      return {
        ...item,
        firestoreId: lp.id,
        name: {
          en: lp.nameEn || item.name.en,
          bn: lp.nameBn || item.name.bn,
        },
        priceBDT: lp.priceBdt,
        priceMinorUnits: lp.priceMinorUnits,
        isDemoData: lp.isDemoData,
        isPublished: lp.isPublished,
        verificationStatus: lp.verificationStatus,
        stockCount: totalStock,
        reservedStock: lp.reservedStock ?? 0,
        variants: mergedVariants,
      };
    }

    // Fallback to catalog item (clearly marked as demo_only until verified in Firestore)
    const fallbackVariants: ProductVariant[] = item.variants.map((v, idx) => {
      const stockCount = v.stockCount ?? getDefaultVariantStock(item.id, idx, v.inStock);
      return {
        ...v,
        sku: v.sku || buildSkuForVariant(item.slug, v.id),
        inStock: stockCount > 0,
        stockCount,
        reservedStock: 0,
        priceBDT: v.priceBDT ?? item.priceBDT,
        priceMinorUnits: bdtToPoisha(v.priceBDT ?? item.priceBDT),
      };
    });

    const fallbackTotalStock = fallbackVariants.reduce((sum, v) => sum + (v.stockCount ?? 0), 0);

    return {
      ...item,
      firestoreId,
      priceMinorUnits: bdtToPoisha(item.priceBDT),
      isDemoData: item.isDemoData ?? true,
      isPublished: item.isPublished ?? false,
      verificationStatus: item.verificationStatus ?? 'demo_only',
      stockCount: fallbackTotalStock,
      reservedStock: 0,
      variants: fallbackVariants,
    };
  });
}

export interface ProductFilterOptions {
  searchQuery?: string;
  category?: CraftCategory;
  region?: RegionName;
  useCase?: string;
  artisanId?: string | null;
  availabilityOnly?: boolean;
  verifiedOnly?: boolean;
  indigenousOnly?: boolean;
  sortBy?: 'featured' | 'price-asc' | 'price-desc' | 'artisan';
}

/**
 * Pure, deterministic product search, filter, and sort helper.
 * Supports bilingual English & Bangla search across product names, descriptions,
 * villages, categories, and artisan names.
 */
export function filterAndSortProducts(
  products: Product[],
  options: ProductFilterOptions
): Product[] {
  const {
    searchQuery = '',
    category = 'All',
    region = 'All',
    useCase = 'All',
    artisanId = null,
    availabilityOnly = false,
    verifiedOnly = false,
    indigenousOnly = false,
    sortBy = 'featured',
  } = options;

  const q = searchQuery.trim().toLowerCase();

  const filtered = products.filter((p) => {
    if (category !== 'All' && p.category !== category) return false;
    if (region !== 'All' && p.regionTag !== region) return false;
    if (useCase !== 'All' && p.useCase !== useCase) return false;
    if (artisanId && p.artisanId !== artisanId) return false;
    if (indigenousOnly && !p.isIndigenousCommunityCraft) return false;

    if (verifiedOnly) {
      if (p.isDemoData || !p.isPublished || p.verificationStatus !== 'verified') {
        return false;
      }
    }

    if (availabilityOnly) {
      const hasStock = p.variants.some((v) => v.inStock && (v.stockCount ?? 1) > 0);
      if (!hasStock) return false;
    }

    if (q) {
      const searchableFields = [
        p.name.en,
        p.name.bn,
        p.shortDescription.en,
        p.shortDescription.bn,
        p.artisanName.en,
        p.artisanName.bn,
        p.village.en,
        p.village.bn,
        p.category,
        p.regionTag,
        p.materials.en,
        p.materials.bn,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (!searchableFields.includes(q)) {
        return false;
      }
    }

    return true;
  });

  return [...filtered].sort((a, b) => {
    if (sortBy === 'price-asc') return a.priceBDT - b.priceBDT;
    if (sortBy === 'price-desc') return b.priceBDT - a.priceBDT;
    if (sortBy === 'artisan') return a.artisanName.en.localeCompare(b.artisanName.en);
    // Featured default: verified live products first, then seasonal featured, then id
    const aVerified = !a.isDemoData && a.verificationStatus === 'verified' ? 1 : 0;
    const bVerified = !b.isDemoData && b.verificationStatus === 'verified' ? 1 : 0;
    if (aVerified !== bVerified) return bVerified - aVerified;
    return (b.isSeasonalFeatured ? 1 : 0) - (a.isSeasonalFeatured ? 1 : 0) || a.id - b.id;
  });
}

/**
 * Subscribes to verified, published products in Firestore (or all products if isAdmin is true)
 * and loads their variants.
 */
export function subscribeToFirestoreCatalog(
  isAdmin: boolean,
  onUpdate: (products: Product[], liveCount: number) => void
): () => void {
  const productsCol = collection(db, 'products');
  const q = isAdmin
    ? query(productsCol)
    : query(
        productsCol,
        where('isPublished', '==', true),
        where('isDemoData', '==', false),
        where('verificationStatus', '==', 'verified')
      );

  return onSnapshot(
    q,
    async (snapshot) => {
      try {
        const liveMap = new Map<
          string,
          { product: FirestoreProductDoc; variants: FirestoreVariantDoc[] }
        >();

        await Promise.all(
          snapshot.docs.map(async (docSnap) => {
            const prodData = docSnap.data() as FirestoreProductDoc;
            let variants: FirestoreVariantDoc[] = [];
            try {
              const variantsSnap = await getDocs(collection(db, 'products', docSnap.id, 'variants'));
              variants = variantsSnap.docs.map(
                (vDoc) => vDoc.data() as FirestoreVariantDoc
              );
            } catch {
              variants = [];
            }
            liveMap.set(docSnap.id, { product: prodData, variants });
          })
        );

        const merged = mergeLiveAndCatalogProducts(PRODUCTS_DATA, liveMap);
        const verifiedCount = merged.filter(
          (m) => !m.isDemoData && m.isPublished && m.verificationStatus === 'verified'
        ).length;
        onUpdate(merged, verifiedCount);
      } catch {
        const fallback = mergeLiveAndCatalogProducts(PRODUCTS_DATA, new Map());
        onUpdate(fallback, 0);
      }
    },
    () => {
      // On error or empty collection, fall back to static catalog cleanly
      const fallback = mergeLiveAndCatalogProducts(PRODUCTS_DATA, new Map());
      onUpdate(fallback, 0);
    }
  );
}

/**
 * Admin Action: Seeds and marks all heritage catalog products, variants, and artisans
 * as Verified & Published in Firestore so live Cash on Delivery (COD) orders can be placed.
 */
export async function seedAndVerifyCatalogInFirestore(
  selectedProductIds?: number[]
): Promise<{ seededProducts: number; seededVariants: number; seededArtisans: number }> {
  const targetProducts = selectedProductIds
    ? PRODUCTS_DATA.filter((p) => selectedProductIds.includes(p.id))
    : PRODUCTS_DATA;

  let seededProducts = 0;
  let seededVariants = 0;
  let seededArtisans = 0;

  try {
    const batch = writeBatch(db);

    for (const artisan of ARTISANS_DATA) {
      const artisanRef = doc(db, 'artisans', artisan.id);
      batch.set(artisanRef, {
        id: artisan.id,
        nameEn: artisan.name.en.slice(0, 140),
        nameBn: artisan.name.bn.slice(0, 140),
        community: (artisan.communityContext?.en || artisan.title.en).slice(0, 120),
        region: artisan.location.en.slice(0, 120),
        specialty: artisan.craftSpecialization.slice(0, 160),
        bioEn: artisan.biography.en,
        bioBn: artisan.biography.bn,
        quoteEn: artisan.quote.en,
        quoteBn: artisan.quote.bn,
        isVerified: true,
        isPublished: true,
        isDemoData: false,
        updatedAt: serverTimestamp(),
      });
      seededArtisans++;
    }

    for (const prod of targetProducts) {
      const firestoreId = getCanonicalFirestoreProductId(prod.id);
      const prodRef = doc(db, 'products', firestoreId);
      const priceBdt = Math.round(prod.priceBDT);
      const priceMinorUnits = bdtToPoisha(priceBdt);

      let totalProductStock = 0;
      const variantPayloads: Array<{ ref: ReturnType<typeof doc>; data: Record<string, unknown> }> = [];

      prod.variants.forEach((v, idx) => {
        const vStock = getDefaultVariantStock(prod.id, idx, v.inStock);
        totalProductStock += vStock;
        const sku = buildSkuForVariant(prod.slug, v.id);
        const vRef = doc(db, 'products', firestoreId, 'variants', v.id);
        variantPayloads.push({
          ref: vRef,
          data: {
            id: v.id,
            productId: firestoreId,
            sku,
            labelEn: v.label.en.slice(0, 100),
            labelBn: v.label.bn.slice(0, 100),
            priceBdt,
            priceMinorUnits,
            stockCount: vStock,
            reservedStock: 0,
            isAvailable: vStock > 0,
            updatedAt: serverTimestamp(),
          },
        });
      });

      batch.set(prodRef, {
        id: firestoreId,
        slug: prod.slug.slice(0, 120),
        nameEn: prod.name.en.slice(0, 160),
        nameBn: prod.name.bn.slice(0, 160),
        category: prod.category.slice(0, 80),
        region: prod.regionTag.slice(0, 100),
        artisanId: prod.artisanId.slice(0, 80),
        priceBdt,
        priceMinorUnits,
        currency: 'BDT',
        stockCount: totalProductStock,
        reservedStock: 0,
        isPublished: true,
        isDemoData: false,
        verificationStatus: 'verified',
        taglineEn: prod.makingTime.en,
        taglineBn: prod.makingTime.bn,
        descriptionEn: prod.shortDescription.en,
        descriptionBn: prod.shortDescription.bn,
        craftStoryEn: prod.storyAndSignificance.en,
        craftStoryBn: prod.storyAndSignificance.bn,
        materialsEn: prod.materials.en,
        materialsBn: prod.materials.bn,
        careEn: prod.careInstructions.en,
        careBn: prod.careInstructions.bn,
        originEn: prod.village.en,
        originBn: prod.village.bn,
        deliveryBdt: 80,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      seededProducts++;

      for (const vp of variantPayloads) {
        batch.set(vp.ref, vp.data);
        seededVariants++;
      }
    }

    await batch.commit();
    return { seededProducts, seededVariants, seededArtisans };
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'products');
  }
}

/**
 * Admin Action: Update a variant's stock or price in Firestore and recalculate parent product stock.
 */
export async function adminUpdateVariantStockAndPrice(
  productId: number,
  variantId: string,
  newStockCount: number,
  newPriceBdt: number
): Promise<void> {
  const firestoreId = getCanonicalFirestoreProductId(productId);
  const variantRef = doc(db, 'products', firestoreId, 'variants', variantId);
  const prodRef = doc(db, 'products', firestoreId);

  try {
    const cleanStock = Math.max(0, Math.floor(newStockCount));
    const cleanPriceBdt = Math.max(1, Math.round(newPriceBdt));
    const cleanMinorUnits = bdtToPoisha(cleanPriceBdt);

    const existingVarSnap = await getDocs(collection(db, 'products', firestoreId, 'variants'));
    let totalStock = 0;

    for (const vDoc of existingVarSnap.docs) {
      if (vDoc.id === variantId) {
        totalStock += cleanStock;
        await setDoc(
          variantRef,
          {
            ...vDoc.data(),
            priceBdt: cleanPriceBdt,
            priceMinorUnits: cleanMinorUnits,
            stockCount: cleanStock,
            isAvailable: cleanStock > 0,
            updatedAt: serverTimestamp(),
          }
        );
      } else {
        totalStock += Number(vDoc.data().stockCount ?? 0);
      }
    }

    const allProdsSnap = await getDocs(query(collection(db, 'products'), where('id', '==', firestoreId)));
    if (!allProdsSnap.empty) {
      const currentProd = allProdsSnap.docs[0].data();
      await setDoc(prodRef, {
        ...currentProd,
        priceBdt: cleanPriceBdt,
        priceMinorUnits: cleanMinorUnits,
        stockCount: totalStock,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(
      err,
      OperationType.UPDATE,
      `products/${firestoreId}/variants/${variantId}`
    );
  }
}
