export type LanguageCode = 'en' | 'bn' | 'as';

export type MarketCode = 'BD' | 'IN' | 'INTL';

export interface LocalizedString {
  en: string;
  bn: string;
  as?: string;
}

export type CraftCategory =
  | 'All'
  | 'Nakshi Kantha'
  | 'Jamdani & Weaving'
  | 'Pottery & Terracotta'
  | 'Cane & Bamboo'
  | 'Jewelry & Metalwork'
  | 'Folk Art & Home'
  | 'Traditional Instruments'
  | 'Indigenous Crafts';

export type RegionName =
  | 'All'
  | 'Jamalpur, Mymensingh'
  | 'Rupganj, Narayanganj'
  | 'Dhamrai, Dhaka'
  | 'Sylhet'
  | 'Old Dhaka'
  | 'Rajshahi'
  | 'Bishnupur, West Bengal'
  | 'Rangamati, Chittagong Hill Tracts'
  | 'Kushtia & Birbhum'
  | 'Santiniketan, Birbhum';

export interface ProductVariant {
  id: string;
  label: LocalizedString;
  colorHex?: string;
  inStock: boolean;
}

export interface Product {
  id: number;
  slug: string;
  name: LocalizedString;
  category: Exclude<CraftCategory, 'All'>;
  useCase: 'Textiles & Apparel' | 'Home & Living' | 'Folk Instruments' | 'Jewelry & Personal' | 'Everyday Utility';
  artisanId: string;
  artisanName: LocalizedString;
  village: LocalizedString;
  regionTag: RegionName;
  countryOrigin: 'Bangladesh' | 'India (West Bengal)' | 'Shared Bengal Heritage';
  isIndigenousCommunityCraft?: boolean;
  communityName?: LocalizedString;
  // Market-specific demonstration prices (never invented live exchange rates)
  priceBDT: number;
  priceINR: number;
  availableMarkets: MarketCode[];
  artworkIndex: number; // Maps to bespoke SVG heritage plates
  statusLabel?: LocalizedString; // Maximum 1 subtle unboxed text tag
  makingTime: LocalizedString;
  materials: LocalizedString;
  dimensions: string;
  shortDescription: LocalizedString;
  storyAndSignificance: LocalizedString;
  howItIsMade: LocalizedString;
  careInstructions: LocalizedString;
  variants: ProductVariant[];
  isSeasonalFeatured?: boolean;
  isDemoData: boolean;
}

export interface ArtisanProfile {
  id: string;
  name: LocalizedString;
  title: LocalizedString;
  location: LocalizedString;
  country: 'Bangladesh' | 'India (West Bengal)';
  craftSpecialization: Exclude<CraftCategory, 'All'>;
  isIndigenousCollective?: boolean;
  communityContext?: LocalizedString;
  quote: LocalizedString;
  biography: LocalizedString;
  craftProcess: LocalizedString[];
  collectiveSize?: string;
  yearsOfPractice?: string;
  verificationStatus: 'Demo Profile — Field Verification Pending';
  artworkType: 'kantha_loom' | 'jamdani_weave' | 'terracotta_kiln' | 'cane_work' | 'brass_workshop' | 'folk_fan' | 'chakma_backstrap' | 'baul_instrument' | 'santal_mat' | 'baluchari_silk';
}

export interface StoryArticle {
  id: string;
  slug: string;
  title: LocalizedString;
  subtitle: LocalizedString;
  category:
    | 'Handicrafts & Artisan Stories'
    | 'Folk Music & Instruments'
    | 'Traditional Clothing & Textiles'
    | 'Indigenous Communities & Living Traditions'
    | 'Festivals & Rituals'
    | 'Folklore & Oral History';
  readingTimeMinutes: number;
  attribution: LocalizedString;
  publishedSeason: LocalizedString;
  artworkIndex: number;
  excerpt: LocalizedString;
  bodyParagraphs: LocalizedString[];
  pullQuote: LocalizedString;
  relatedProductIds: number[];
  relatedArtisanId?: string;
}

export interface CartItem {
  productId: number;
  variantId: string;
  quantity: number;
}

export interface OrderRecord {
  orderId: string;
  createdAt: string;
  market: MarketCode;
  currencySymbol: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  cityOrDistrict: string;
  postalCode: string;
  deliveryMethodLabel: string;
  paymentMethodLabel: string;
  items: {
    productId: number;
    name: string;
    variantLabel: string;
    quantity: number;
    unitPrice: number;
  }[];
  subtotal: number;
  shippingCost: number;
  total: number;
  isDemoOrder: boolean;
}

export type PageView =
  | 'home'
  | 'shop'
  | 'product'
  | 'artisans'
  | 'stories'
  | 'story-detail'
  | 'about'
  | 'cart'
  | 'wishlist'
  | 'orders'
  | 'contact'
  | 'policies';
