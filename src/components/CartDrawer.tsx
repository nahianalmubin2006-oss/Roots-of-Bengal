import React from 'react';
import { X, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { CartItem, LanguageCode, MarketCode, Product } from '../types/heritage';
import { tText } from '../data/translations';
import {
  getCurrencySymbol,
  getStandardShippingFee,
  getUnitPriceForMarket,
} from '../utils/currency';
import { CraftArtwork } from './CraftArtwork';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  products: Product[];
  language: LanguageCode;
  market: MarketCode;
  onUpdateQuantity: (productId: number, variantId: string, delta: number) => void;
  onRemoveItem: (productId: number, variantId: string) => void;
  onProceedToCheckout: () => void;
  onBrowseShop: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  products,
  language,
  market,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToCheckout,
  onBrowseShop,
}) => {
  if (!isOpen) return null;

  const currencySymbol = getCurrencySymbol(market);

  const detailedItems = cart
    .map((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) return null;
      const variant = product.variants.find((v) => v.id === item.variantId) || product.variants[0];
      const unitPrice = getUnitPriceForMarket(product, market, variant?.id);
      const maxStock = typeof variant?.stockCount === 'number' ? variant.stockCount : 10;
      return {
        ...item,
        product,
        variant,
        unitPrice,
        maxStock,
        lineTotal: unitPrice * item.quantity,
      };
    })
    .filter(Boolean) as {
    productId: number;
    variantId: string;
    quantity: number;
    product: Product;
    variant: Product['variants'][0];
    unitPrice: number;
    maxStock: number;
    lineTotal: number;
  }[];

  const subtotal = detailedItems.reduce((acc, item) => acc + item.lineTotal, 0);
  const shipping = subtotal === 0 ? 0 : getStandardShippingFee(market);
  const total = subtotal + shipping;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#3b2a1a]/60 backdrop-blur-xs">
      <div
        className="w-full max-w-md paper-grain h-full flex flex-col justify-between border-l-2 border-[#8a4b2a] shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Shopping Bag"
      >
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-[#8a4b2a]/40 flex items-center justify-between bg-[#e4d3ad]">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-[#b5502d]" />
            <h2 className="font-editorial text-2xl text-[#3b2a1a]">
              {language === 'bn' ? 'আপনার ঝুলি' : 'Your Bag'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[#3b2a1a]/75 hover:text-[#b5502d] transition-colors cursor-pointer"
            aria-label="Close shopping bag"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Bangladesh COD Delivery Banner */}
        {detailedItems.length > 0 && (
          <div className="px-6 py-2 bg-[#f6ecd4] border-b border-dashed border-[#8a4b2a]/40 text-xs text-[#3b2a1a]">
            {market === 'BD' ? (
              <p>
                <strong>Bangladesh Cash on Delivery (COD):</strong> ৳80 Inside Dhaka Metro · ৳150 Outside Dhaka.
              </p>
            ) : (
              <p>
                Primary live COD checkout is configured for <strong>Bangladesh (৳ BDT)</strong>.
              </p>
            )}
          </div>
        )}

        {/* Drawer Items List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {detailedItems.length === 0 ? (
            <div className="text-center py-14 px-4 bg-[#f6ecd4] border-2 border-dashed border-[#8a4b2a] space-y-4">
              <p className="font-editorial text-3xl text-[#3b2a1a]">
                {language === 'bn' ? 'আপনার ঝুলি খালি' : 'Your bag is empty'}
              </p>
              <p className="text-sm text-[#3b2a1a]/75">
                {language === 'bn'
                  ? 'হাতে গড়া শিল্পকর্ম খুঁজে নিন।'
                  : 'Find something made slowly by hand.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onBrowseShop();
                }}
                className="craft-btn px-5 py-2.5 text-xs rounded-[3px] cursor-pointer"
              >
                Shop crafts
              </button>
            </div>
          ) : (
            detailedItems.map(({ productId, variantId, quantity, product, variant, maxStock, lineTotal }) => {
              const isVerified =
                !product.isDemoData && product.isPublished && product.verificationStatus === 'verified';
              return (
                <div
                  key={`${productId}-${variantId}`}
                  className="flex gap-3.5 p-3 bg-[#f6ecd4] border border-[#8a4b2a]/45"
                >
                  <div className="w-20 h-20 shrink-0 border border-[#8a4b2a]/45">
                    <CraftArtwork
                      artworkIndex={product.artworkIndex}
                      variantShift={product.id % 3}
                      className="w-full h-full"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-editorial text-xl text-[#3b2a1a] truncate">
                      {tText(product.name, language)}
                    </h3>
                    <p className="text-xs italic text-[#3b2a1a]/75">
                      {tText(variant.label, language)} · {tText(product.village, language)}
                    </p>
                    <p className="text-[11px] text-[#8a4b2a] mt-0.5">
                      {variant.sku ? `SKU: ${variant.sku} · ` : ''}
                      {isVerified ? (
                        <span className="text-[#5d7a4a] font-bold">Verified Stock ({maxStock})</span>
                      ) : (
                        <span>Demo Preview</span>
                      )}
                    </p>

                    <div className="mt-2 flex items-center justify-between">
                      <div className="inline-flex items-center border-2 border-[#8a4b2a] bg-[#f6ecd4]">
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(productId, variantId, -1)}
                          className="px-2.5 py-0.5 text-xs font-bold text-[#3b2a1a] hover:bg-[#e4d3ad] cursor-pointer"
                          aria-label="Decrease quantity"
                        >
                          −
                        </button>
                        <span className="font-tabular px-2.5 py-0.5 text-xs text-[#3b2a1a]">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          disabled={quantity >= maxStock}
                          onClick={() => onUpdateQuantity(productId, variantId, 1)}
                          className={`px-2.5 py-0.5 text-xs font-bold ${
                            quantity >= maxStock
                              ? 'text-[#3b2a1a]/30 cursor-not-allowed'
                              : 'text-[#3b2a1a] hover:bg-[#e4d3ad] cursor-pointer'
                          }`}
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-tabular text-sm font-bold text-[#b5502d]">
                          {currencySymbol}
                          {lineTotal.toLocaleString()}
                        </span>
                        <button
                          type="button"
                          onClick={() => onRemoveItem(productId, variantId)}
                          className="text-xs underline text-[#8a4b2a] hover:text-[#b5502d] cursor-pointer"
                          aria-label="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Drawer Footer */}
        {detailedItems.length > 0 && (
          <div className="p-5 bg-[#e4d3ad] border-t-2 border-[#8a4b2a] space-y-4">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between py-1 border-b border-dashed border-[#8a4b2a]">
                <span>Subtotal</span>
                <span className="font-tabular">
                  {currencySymbol}
                  {subtotal.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-dashed border-[#8a4b2a]">
                <span>Estimated Courier (Dhaka Metro)</span>
                <span className="font-tabular">
                  {market === 'INTL' ? 'Quoted on Inquiry' : `${currencySymbol}${shipping}`}
                </span>
              </div>
              <div className="pt-1 flex justify-between font-bold text-lg text-[#b5502d]">
                <span>Estimated Total</span>
                <span className="font-tabular">
                  {currencySymbol}
                  {total.toLocaleString()}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                onProceedToCheckout();
              }}
              className="craft-btn w-full py-3 px-5 text-sm rounded-[3px] flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Review Bag & Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
