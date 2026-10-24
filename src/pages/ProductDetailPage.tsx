import React, { useState } from 'react';
import { Heart, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  ArtisanProfile,
  CraftCategory,
  LanguageCode,
  MarketCode,
  PageView,
  Product,
} from '../types/heritage';
import { tText, UI_STRINGS } from '../data/translations';
import { formatMarketPrice, getUnitPriceForMarket, getCurrencySymbol } from '../utils/currency';
import { CraftArtwork } from '../components/CraftArtwork';
import { ProductCard } from '../components/ProductCard';

interface ProductDetailPageProps {
  product: Product;
  artisans: ArtisanProfile[];
  allProducts: Product[];
  language: LanguageCode;
  market: MarketCode;
  wishlist: number[];
  onNavigate: (view: PageView, filterCategory?: CraftCategory) => void;
  onSelectProduct: (productId: number) => void;
  onToggleWishlist: (productId: number, e: React.MouseEvent) => void;
  onQuickView: (product: Product, e: React.MouseEvent) => void;
  onAddToCart: (productId: number, variantId: string, quantity: number, e?: React.MouseEvent) => void;
}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({
  product,
  artisans,
  allProducts,
  language,
  market,
  wishlist,
  onNavigate,
  onSelectProduct,
  onToggleWishlist,
  onQuickView,
  onAddToCart,
}) => {
  const [activeThumb, setActiveThumb] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState(product.variants[0]?.id || 'default');
  const [quantity, setQuantity] = useState(1);

  React.useEffect(() => {
    setActiveThumb(0);
    const firstAvailable =
      product.variants.find((v) => v.inStock && (v.stockCount ?? 1) > 0) || product.variants[0];
    setSelectedVariantId(firstAvailable?.id || 'default');
    setQuantity(1);
  }, [product.id, product.variants]);

  const selectedVariant =
    product.variants.find((v) => v.id === selectedVariantId) || product.variants[0];
  const variantStock =
    typeof selectedVariant?.stockCount === 'number'
      ? selectedVariant.stockCount
      : selectedVariant?.inStock
      ? 5
      : 0;
  const isVariantInStock = Boolean(selectedVariant?.inStock && variantStock > 0);
  const isVerifiedLive =
    !product.isDemoData && product.isPublished && product.verificationStatus === 'verified';

  const makerProfile = artisans.find((a) => a.id === product.artisanId);
  const isWishlisted = wishlist.includes(product.id);
  const unitPrice = getUnitPriceForMarket(product, market, selectedVariantId);
  const currencySymbol = getCurrencySymbol(market);
  const isAvailableInMarket = product.availableMarkets.includes(market);

  const relatedProducts = allProducts
    .filter((p) => p.id !== product.id && (p.artisanId === product.artisanId || p.category === product.category))
    .concat(allProducts.filter((p) => p.id !== product.id))
    .filter((v, i, a) => a.findIndex((t) => t.id === v.id) === i)
    .slice(0, 4);

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-8 py-8 sm:py-10 space-y-14 pb-28 sm:pb-16">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="text-xs text-[#3b2a1a]/75">
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="underline hover:text-[#b5502d] cursor-pointer"
        >
          {tText(UI_STRINGS.navHome, language)}
        </button>{' '}
        /{' '}
        <button
          type="button"
          onClick={() => onNavigate('shop')}
          className="underline hover:text-[#b5502d] cursor-pointer"
        >
          Shop
        </button>{' '}
        /{' '}
        <button
          type="button"
          onClick={() => onNavigate('shop', product.category)}
          className="underline hover:text-[#b5502d] cursor-pointer"
        >
          {product.category}
        </button>
      </nav>

      {/* Main Product Detail Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left: Double-Bordered Main Frame + Thumbnails */}
        <div className="lg:col-span-6 space-y-3">
          <div className="craft-frame aspect-square w-full">
            <CraftArtwork
              artworkIndex={(product.artworkIndex + activeThumb * 2) % 8}
              variantShift={(product.id + activeThumb) % 3}
              className="w-full h-full"
              showArchivalCaption
            />
          </div>

          <div className="flex gap-3">
            {[0, 1, 2].map((idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveThumb(idx)}
                className={`w-20 h-20 p-1 bg-[#f6ecd4] border-2 transition-colors cursor-pointer ${
                  activeThumb === idx ? 'border-[#b5502d]' : 'border-[#8a4b2a]/40 hover:border-[#8a4b2a]'
                }`}
                aria-label={`View thumbnail ${idx + 1}`}
              >
                <CraftArtwork
                  artworkIndex={(product.artworkIndex + idx * 2) % 8}
                  variantShift={(product.id + idx) % 3}
                  className="w-full h-full"
                />
              </button>
            ))}
          </div>
        </div>

        {/* Right: Crafty Woodblock Title, Variant Chips, Quantity Stepper & Dashed Details */}
        <div className="lg:col-span-6 space-y-4">
          <div>
            <small className="text-xs font-bold tracking-widest text-[#b5502d] uppercase block">
              {product.category} · {product.countryOrigin}
            </small>
            <h1 className="font-editorial text-4xl sm:text-[44px] text-[#3b2a1a] leading-[1.06] mt-1">
              {tText(product.name, language)}
            </h1>
            <div className="text-sm mt-1">
              by{' '}
              <button
                type="button"
                onClick={() => onNavigate('artisans')}
                className="italic text-[#8a4b2a] underline hover:text-[#b5502d] cursor-pointer"
              >
                {tText(product.artisanName, language)}
              </button>
              , {tText(product.village, language)}
            </div>
          </div>

          {/* Price & Live Verification Status */}
          <div className="flex flex-wrap items-baseline justify-between gap-3 pt-1">
            <div className="font-tabular text-2xl sm:text-[28px] font-bold text-[#b5502d]">
              {formatMarketPrice(unitPrice, product.priceINR, market)}
            </div>

            <div className="text-xs">
              {isVerifiedLive ? (
                <span className="inline-flex items-center gap-1 font-bold text-[#5d7a4a]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Verified Live Inventory · Ready for Bangladesh COD</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[#8a4b2a]">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Demonstration Record · Awaiting Admin Verification for Live COD</span>
                </span>
              )}
            </div>
          </div>

          <p className="text-[15px] text-[#3b2a1a]/85 leading-relaxed">
            {tText(product.shortDescription, language)}
          </p>

          {/* Variant Selector with Stock & SKU Info */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-xs">
              <b className="tracking-wider uppercase text-[#3b2a1a]">
                Colourway / Option
              </b>
              <span className="font-tabular text-[#8a4b2a]">
                {selectedVariant?.sku ? `SKU: ${selectedVariant.sku} · ` : ''}
                {isVariantInStock ? (
                  <strong className="text-[#5d7a4a]">{variantStock} available in batch</strong>
                ) : (
                  <strong className="text-[#b5502d]">Out of Stock</strong>
                )}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {product.variants.map((v) => {
                const vStock = typeof v.stockCount === 'number' ? v.stockCount : v.inStock ? 5 : 0;
                const vAvailable = v.inStock && vStock > 0;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => {
                      setSelectedVariantId(v.id);
                      setQuantity(1);
                    }}
                    className={`px-3.5 py-1.5 text-[13px] border transition-colors cursor-pointer ${
                      selectedVariantId === v.id
                        ? 'border-[#8a4b2a] bg-[#8a4b2a] text-[#fff3dc]'
                        : vAvailable
                        ? 'border-[#8a4b2a] bg-[#f6ecd4] text-[#3b2a1a] hover:bg-[#e4d3ad]'
                        : 'border-[#8a4b2a]/40 bg-[#e4d3ad]/50 text-[#3b2a1a]/50 line-through'
                    }`}
                  >
                    {tText(v.label, language)} ({vStock})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quantity Stepper & Stamp-Shadow Add to Bag Button */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <div className="inline-flex border-2 border-[#8a4b2a] bg-[#f6ecd4]">
              <button
                type="button"
                disabled={!isVariantInStock || quantity <= 1}
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="px-3.5 py-2 font-bold text-[#3b2a1a] hover:bg-[#e4d3ad] disabled:opacity-40 cursor-pointer"
                aria-label="Decrease quantity"
              >
                −
              </button>
              <i className="px-3.5 py-2 not-italic font-tabular min-w-[44px] text-center text-[#3b2a1a]">
                {isVariantInStock ? quantity : 0}
              </i>
              <button
                type="button"
                disabled={!isVariantInStock || quantity >= variantStock}
                onClick={() => setQuantity((q) => Math.min(variantStock, q + 1))}
                className="px-3.5 py-2 font-bold text-[#3b2a1a] hover:bg-[#e4d3ad] disabled:opacity-40 cursor-pointer"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>

            <button
              type="button"
              disabled={!isVariantInStock}
              onClick={(e) => onAddToCart(product.id, selectedVariantId, quantity, e)}
              className={`px-6 py-2.5 text-sm rounded-[3px] ${
                isVariantInStock
                  ? 'craft-btn cursor-pointer'
                  : 'bg-[#e4d3ad] border-2 border-[#8a4b2a]/40 text-[#3b2a1a]/50 cursor-not-allowed'
              }`}
            >
              {isVariantInStock ? (
                <>
                  Add to Bag · {currencySymbol}
                  {(unitPrice * quantity).toLocaleString()}
                </>
              ) : (
                'Variant Out of Stock'
              )}
            </button>

            <button
              type="button"
              onClick={(e) => onToggleWishlist(product.id, e)}
              className={`p-2.5 border-2 border-[#8a4b2a] transition-colors cursor-pointer ${
                isWishlisted ? 'bg-[#b5502d] text-[#fff3dc]' : 'bg-[#f6ecd4] text-[#3b2a1a] hover:bg-[#e4d3ad]'
              }`}
              aria-label="Save to wishlist"
            >
              <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
            </button>
          </div>

          {!isAvailableInMarket && (
            <div className="p-3 bg-[#e4d3ad] border border-[#8a4b2a] text-xs text-[#3b2a1a]">
              <strong>Regional Fragile Craft Notice:</strong> Unglazed river-clay pottery is configured for domestic delivery in Bangladesh and India only.
            </div>
          )}

          {/* Dashed Heritage Details List */}
          <div className="mt-5 border-t border-dashed border-[#8a4b2a] divide-y divide-dashed divide-[#8a4b2a] text-sm">
            <div className="py-3">
              <b className="block text-[#3b2a1a]">Time to make & Materials</b>
              <span className="text-[#3b2a1a]/85">
                {tText(product.makingTime, language)} · {tText(product.materials, language)} ({product.dimensions})
              </span>
            </div>
            <div className="py-3">
              <b className="block text-[#3b2a1a]">Cultural Story & How It Is Made</b>
              <p className="text-[#3b2a1a]/85 mt-0.5 leading-relaxed">
                {tText(product.storyAndSignificance, language)} {tText(product.howItIsMade, language)}
              </p>
            </div>
            <div className="py-3">
              <b className="block text-[#3b2a1a]">Signed by the maker</b>
              <span className="text-[#3b2a1a]/85">
                Includes an origin card with {tText(product.artisanName, language)}’s regional story (
                {isVerifiedLive
                  ? 'Verified Artisan Partner — Field Audited'
                  : makerProfile?.verificationStatus || 'Demo Record'}
                )
              </span>
            </div>
            <div className="py-3">
              <b className="block text-[#3b2a1a]">Bangladesh Delivery & Care</b>
              <span className="text-[#3b2a1a]/85">
                Inside Dhaka Metro: ৳80 (2–3 days) · Outside Dhaka Nationwide: ৳150 (4–6 days) · Cash on Delivery (COD). Care: {tText(product.careInstructions, language)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* More from Maker / Related Crafts */}
      <section className="pt-8 space-y-6">
        <div className="text-center section-ornament">
          <h2 className="font-editorial text-3xl sm:text-4xl text-[#3b2a1a]">
            More from {tText(product.artisanName, language).split(' ')[0]} & Related Crafts
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {relatedProducts.map((rel) => (
            <ProductCard
              key={rel.id}
              product={rel}
              language={language}
              market={market}
              isWishlisted={wishlist.includes(rel.id)}
              onSelectProduct={onSelectProduct}
              onToggleWishlist={onToggleWishlist}
              onQuickView={onQuickView}
              onAddToCart={onAddToCart}
            />
          ))}
        </div>
      </section>
    </div>
  );
};
