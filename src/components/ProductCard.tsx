import React from 'react';
import { Heart, Eye } from 'lucide-react';
import { LanguageCode, MarketCode, Product } from '../types/heritage';
import { tText, UI_STRINGS } from '../data/translations';
import { formatMarketPrice } from '../utils/currency';
import { CraftArtwork } from './CraftArtwork';

interface ProductCardProps {
  product: Product;
  language: LanguageCode;
  market: MarketCode;
  isWishlisted: boolean;
  onSelectProduct: (productId: number) => void;
  onToggleWishlist: (productId: number, e: React.MouseEvent) => void;
  onQuickView: (product: Product, e: React.MouseEvent) => void;
  onAddToCart: (productId: number, variantId: string, quantity: number, e: React.MouseEvent) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  language,
  market,
  isWishlisted,
  onSelectProduct,
  onToggleWishlist,
  onQuickView,
  onAddToCart,
}) => {
  const defaultVariant = product.variants[0]?.id || 'default';
  const isAvailableInMarket = product.availableMarkets.includes(market);

  return (
    <article
      onClick={() => onSelectProduct(product.id)}
      className="craft-card p-3 flex flex-col justify-between cursor-pointer group"
    >
      <div>
        {/* Square / 4:3 Craft Artwork Frame */}
        <div className="relative aspect-square w-full border border-[#8a4b2a]/40 overflow-hidden bg-[#e4d3ad]">
          <CraftArtwork
            artworkIndex={product.artworkIndex}
            variantShift={product.id % 3}
            className="w-full h-full transition-transform duration-200 group-hover:scale-[1.02]"
          />

          {/* Functional Wishlist & Quick View Controls */}
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
            <button
              type="button"
              onClick={(e) => onQuickView(product, e)}
              className="w-8 h-8 bg-[#f6ecd4]/95 hover:bg-[#8a4b2a] text-[#3b2a1a] hover:text-[#fff3dc] flex items-center justify-center border border-[#8a4b2a]/50 transition-colors cursor-pointer"
              aria-label={`Quick view ${tText(product.name, language)}`}
              title={tText(UI_STRINGS.quickPreview, language)}
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => onToggleWishlist(product.id, e)}
              className={`w-8 h-8 flex items-center justify-center border border-[#8a4b2a]/50 transition-colors cursor-pointer ${
                isWishlisted
                  ? 'bg-[#b5502d] text-[#fff3dc]'
                  : 'bg-[#f6ecd4]/95 text-[#3b2a1a] hover:bg-[#8a4b2a] hover:text-[#fff3dc]'
              }`}
              aria-label={isWishlisted ? 'Remove from saved' : 'Save to wishlist'}
            >
              <Heart className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>

        {/* Clean Unboxed Metadata & IM Fell English Woodblock Heading */}
        <div className="pt-3 pb-2 space-y-1">
          <div className="flex items-center flex-wrap gap-1.5 text-xs text-[#8a4b2a]">
            <span>{product.category}</span>
            {product.statusLabel && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-semibold text-[#5d7a4a]">
                  {tText(product.statusLabel, language)}
                </span>
              </>
            )}
          </div>

          <h3 className="font-editorial text-[21px] leading-snug text-[#3b2a1a] group-hover:text-[#b5502d] transition-colors">
            {tText(product.name, language)}
          </h3>

          <p className="text-xs italic text-[#3b2a1a]/75">
            {tText(product.artisanName, language)} · {tText(product.village, language)}
          </p>
        </div>
      </div>

      {/* Price & Crafty Add to Bag Button */}
      <div className="pt-2.5 mt-1 border-t border-dashed border-[#8a4b2a]/35 flex items-center justify-between gap-2">
        <div>
          <span className="font-tabular text-base font-bold text-[#b5502d]">
            {formatMarketPrice(product.priceBDT, product.priceINR, market)}
          </span>
          {!isAvailableInMarket && (
            <span className="block text-[11px] text-[#8a4b2a]">
              {product.countryOrigin} domestic
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={(e) => onAddToCart(product.id, defaultVariant, 1, e)}
          className="px-3 py-1 text-xs border border-[#8a4b2a] text-[#8a4b2a] bg-[#f6ecd4] hover:bg-[#8a4b2a] hover:text-[#fff3dc] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          {tText(UI_STRINGS.addToBag, language)}
        </button>
      </div>
    </article>
  );
};
