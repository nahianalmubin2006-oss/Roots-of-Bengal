import React, { useState } from 'react';
import { X, ArrowRight } from 'lucide-react';
import { LanguageCode, MarketCode, Product } from '../types/heritage';
import { tText, UI_STRINGS } from '../data/translations';
import { formatMarketPrice } from '../utils/currency';
import { CraftArtwork } from './CraftArtwork';

interface QuickViewModalProps {
  product: Product | null;
  language: LanguageCode;
  market: MarketCode;
  onClose: () => void;
  onAddToCart: (productId: number, variantId: string, quantity: number) => void;
  onOpenFullProduct: (productId: number) => void;
}

export const QuickViewModal: React.FC<QuickViewModalProps> = ({
  product,
  language,
  market,
  onClose,
  onAddToCart,
  onOpenFullProduct,
}) => {
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [qty, setQty] = useState(1);

  if (!product) return null;

  const activeVariantId = selectedVariantId || product.variants[0]?.id || 'default';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3b2a1a]/65 backdrop-blur-xs">
      <div
        className="paper-grain border-2 border-[#8a4b2a] max-w-3xl w-full overflow-hidden shadow-2xl grid grid-cols-1 md:grid-cols-2"
        role="dialog"
        aria-modal="true"
        aria-label={tText(product.name, language)}
      >
        <div className="p-4 bg-[#e4d3ad] border-b md:border-b-0 md:border-r border-[#8a4b2a]/50 flex items-center justify-center">
          <div className="craft-frame aspect-square w-full">
            <CraftArtwork
              artworkIndex={product.artworkIndex}
              variantShift={product.id % 3}
              className="w-full h-full"
              showArchivalCaption
            />
          </div>
        </div>

        <div className="p-6 sm:p-7 flex flex-col justify-between space-y-4">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <small className="text-xs font-bold tracking-widest text-[#b5502d] uppercase">
                {product.category}
              </small>
              <button
                type="button"
                onClick={onClose}
                className="p-1 text-[#3b2a1a]/75 hover:text-[#b5502d] cursor-pointer"
                aria-label="Close preview"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <h2 className="font-editorial text-3xl text-[#3b2a1a]">
              {tText(product.name, language)}
            </h2>

            <p className="text-xs italic text-[#3b2a1a]/75">
              by {tText(product.artisanName, language)}, {tText(product.village, language)}
            </p>

            <div className="font-tabular text-2xl font-bold text-[#b5502d]">
              {formatMarketPrice(product.priceBDT, product.priceINR, market)}
            </div>

            <p className="text-sm text-[#3b2a1a]/85 leading-relaxed">
              {tText(product.shortDescription, language)}
            </p>

            {/* Variant Selector */}
            <div className="pt-2 space-y-1.5">
              <b className="block text-xs uppercase tracking-wider text-[#3b2a1a]">
                Colourway / Option
              </b>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSelectedVariantId(v.id)}
                    className={`px-3 py-1 text-xs border border-[#8a4b2a] transition-colors cursor-pointer ${
                      activeVariantId === v.id
                        ? 'bg-[#8a4b2a] text-[#fff3dc]'
                        : 'bg-[#f6ecd4] text-[#3b2a1a] hover:bg-[#e4d3ad]'
                    }`}
                  >
                    {tText(v.label, language)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-dashed border-[#8a4b2a]/50 space-y-3">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center border-2 border-[#8a4b2a] bg-[#f6ecd4]">
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="px-3 py-1.5 text-sm font-bold text-[#3b2a1a] cursor-pointer"
                >
                  −
                </button>
                <span className="font-tabular px-3 py-1.5 text-sm text-[#3b2a1a]">
                  {qty}
                </span>
                <button
                  type="button"
                  onClick={() => setQty((q) => q + 1)}
                  className="px-3 py-1.5 text-sm font-bold text-[#3b2a1a] cursor-pointer"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  onAddToCart(product.id, activeVariantId, qty);
                  onClose();
                }}
                className="craft-btn flex-1 py-2.5 px-4 text-xs sm:text-sm rounded-[3px] cursor-pointer"
              >
                {tText(UI_STRINGS.addToBag, language)}
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenFullProduct(product.id);
              }}
              className="w-full py-1.5 text-xs font-bold text-[#8a4b2a] hover:text-[#b5502d] underline flex items-center justify-center gap-1 cursor-pointer"
            >
              <span>Open full craft story & details</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
