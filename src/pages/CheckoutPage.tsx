import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, AlertTriangle, Trash2, ShieldAlert } from 'lucide-react';
import {
  CartItem,
  LanguageCode,
  MarketCode,
  OrderRecord,
  PageView,
  Product,
} from '../types/heritage';
import { tText } from '../data/translations';
import {
  getCurrencySymbol,
  getFreeShippingThreshold,
  getStandardShippingFee,
  getUnitPriceForMarket,
} from '../utils/currency';
import { CraftArtwork } from '../components/CraftArtwork';

interface CheckoutPageProps {
  cart: CartItem[];
  products: Product[];
  language: LanguageCode;
  market: MarketCode;
  onMarketChange: (market: MarketCode) => void;
  onUpdateQuantity: (productId: number, variantId: string, delta: number) => void;
  onRemoveItem: (productId: number, variantId: string) => void;
  onPlaceDemoOrder: (order: OrderRecord) => void;
  onNavigate: (view: PageView) => void;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({
  cart,
  products,
  language,
  market,
  onMarketChange,
  onUpdateQuantity,
  onRemoveItem,
  onPlaceDemoOrder,
  onNavigate,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [cityOrDistrict, setCityOrDistrict] = useState(
    market === 'BD' ? 'Dhaka' : market === 'IN' ? 'Kolkata, West Bengal' : ''
  );
  const [postalCode, setPostalCode] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<'standard' | 'workshop-pickup'>('standard');
  const [paymentMethod, setPaymentMethod] = useState<string>('cod');
  const [formError, setFormError] = useState<string>('');
  const [confirmedOrder, setConfirmedOrder] = useState<OrderRecord | null>(null);

  const currencySymbol = getCurrencySymbol(market);
  const freeThreshold = getFreeShippingThreshold(market);

  const detailedItems = cart
    .map((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) return null;
      const variant = product.variants.find((v) => v.id === item.variantId) || product.variants[0];
      const unitPrice = getUnitPriceForMarket(product, market);
      return {
        ...item,
        product,
        variant,
        unitPrice,
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
    lineTotal: number;
  }[];

  const subtotal = detailedItems.reduce((acc, item) => acc + item.lineTotal, 0);
  const baseShipping =
    deliveryMethod === 'workshop-pickup' || subtotal >= freeThreshold || subtotal === 0
      ? 0
      : getStandardShippingFee(market);
  const total = subtotal + baseShipping;

  if (confirmedOrder) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-12 sm:py-16">
        <div className="bg-[#f6ecd4] border-2 border-dashed border-[#8a4b2a] p-8 sm:p-10 space-y-6 text-center">
          <CheckCircle2 className="w-8 h-8 text-[#5d7a4a] mx-auto" />
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-[#8a4b2a]">
              Demonstration Order Receipt · Reference #{confirmedOrder.orderId}
            </p>
            <h1 className="font-editorial text-4xl text-[#5d7a4a]">
              {confirmedOrder.market === 'INTL'
                ? 'International Shipping Inquiry Recorded'
                : 'Dhonnobad! Demonstration Order Recorded'}
            </h1>
          </div>

          <div className="p-4 bg-[#e4d3ad] border border-[#8a4b2a] text-xs text-[#3b2a1a] text-left leading-relaxed">
            <strong>Important Frontend Notice:</strong> This is a client-side demonstration flow. No live payment gateway (bKash, Nagad, UPI, or Card) was charged, and no physical shipment has been dispatched. Your demonstration receipt has been saved locally under <strong>Order History & Tracking</strong>.
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => onNavigate('orders')}
              className="craft-btn px-6 py-2.5 text-xs rounded-[3px] cursor-pointer"
            >
              View Order Tracking & History
            </button>
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="craft-btn-outline px-6 py-2.5 text-xs rounded-[3px] cursor-pointer"
            >
              Continue exploring
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (detailedItems.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-16 text-center">
        <div className="bg-[#f6ecd4] border-2 border-dashed border-[#8a4b2a] p-12 space-y-4">
          <h1 className="font-editorial text-4xl text-[#3b2a1a]">
            {language === 'bn' ? 'আপনার ঝুলি খালি' : 'Your bag is empty'}
          </h1>
          <p className="text-sm text-[#3b2a1a]/75 max-w-md mx-auto">
            Find something made slowly by hand.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('shop')}
            className="craft-btn px-6 py-2.5 text-sm rounded-[3px] cursor-pointer"
          >
            Shop crafts
          </button>
        </div>
      </div>
    );
  }

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerEmail.trim() || !customerPhone.trim() || !shippingAddress.trim() || !postalCode.trim()) {
      setFormError('Please complete all required customer contact and regional address fields.');
      return;
    }
    setFormError('');

    const order: OrderRecord = {
      orderId: `ROB-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      market,
      currencySymbol,
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim(),
      customerPhone: customerPhone.trim(),
      shippingAddress: shippingAddress.trim(),
      cityOrDistrict: cityOrDistrict.trim(),
      postalCode: postalCode.trim(),
      deliveryMethodLabel:
        market === 'INTL'
          ? 'International Customs & Freight Quote Request'
          : deliveryMethod === 'workshop-pickup'
          ? 'Dhaka / Kolkata Cultural Hub Pickup'
          : 'Domestic Standard Artisan Parcel (3–5 Days)',
      paymentMethodLabel:
        market === 'INTL'
          ? 'No Payment Collected (Awaiting Freight Quote)'
          : paymentMethod === 'cod'
          ? 'Cash on Delivery (Demo Verification)'
          : 'Gateway Integration Pending (UI Demo Only)',
      items: detailedItems.map((i) => ({
        productId: i.productId,
        name: i.product.name.en,
        variantLabel: i.variant.label.en,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
      subtotal,
      shippingCost: baseShipping,
      total,
      isDemoOrder: true,
    };

    setConfirmedOrder(order);
    onPlaceDemoOrder(order);
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-8 py-10 sm:py-12 space-y-8">
      <div className="text-center section-ornament">
        <h1 className="font-editorial text-4xl sm:text-[44px] text-[#3b2a1a]">
          {language === 'bn' ? 'আপনার ঝুলি ও অর্ডার নিশ্চিতকরণ' : 'Your Bag & Regional Checkout'}
        </h1>
      </div>

      {/* Market Switcher */}
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
        <span className="text-[#3b2a1a]/80 font-bold">Shipping Market:</span>
        {(['BD', 'IN', 'INTL'] as MarketCode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              onMarketChange(m);
              setCityOrDistrict(
                m === 'BD' ? 'Dhaka' : m === 'IN' ? 'Kolkata, West Bengal' : 'London / Toronto / Global'
              );
            }}
            className={`px-3.5 py-1.5 border border-[#8a4b2a] transition-colors cursor-pointer ${
              market === m
                ? 'bg-[#8a4b2a] text-[#fff3dc]'
                : 'bg-[#f6ecd4] text-[#3b2a1a] hover:bg-[#e4d3ad]'
            }`}
          >
            {m === 'BD' ? 'Bangladesh (৳)' : m === 'IN' ? 'India (₹)' : 'International'}
          </button>
        ))}
      </div>

      {/* Main Split (.cart from Prototype) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Bag Items (.line from Prototype) */}
          <div className="space-y-3">
            {detailedItems.map(({ productId, variantId, quantity, product, variant, lineTotal }) => (
              <div
                key={`${productId}-${variantId}`}
                className="p-3 bg-[#f6ecd4] border border-[#8a4b2a]/50 grid grid-cols-1 sm:grid-cols-[80px_1fr_auto] gap-4 items-center"
              >
                <div className="w-20 h-20 border border-[#8a4b2a]/50">
                  <CraftArtwork artworkIndex={product.artworkIndex} variantShift={product.id % 3} className="w-full h-full" />
                </div>

                <div>
                  <h3 className="font-editorial text-xl text-[#3b2a1a]">
                    {tText(product.name, language)}
                  </h3>
                  <small className="text-xs italic text-[#3b2a1a]/75 block">
                    {tText(variant.label, language)} · {tText(product.artisanName, language)}, {tText(product.village, language)}
                  </small>

                  <div className="mt-2 flex items-center gap-3">
                    <div className="inline-flex border-2 border-[#8a4b2a] bg-[#f6ecd4]">
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(productId, variantId, -1)}
                        className="px-2.5 py-0.5 text-xs font-bold text-[#3b2a1a] cursor-pointer"
                      >
                        −
                      </button>
                      <i className="px-2.5 py-0.5 not-italic text-xs font-tabular text-[#3b2a1a]">
                        {quantity}
                      </i>
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(productId, variantId, 1)}
                        className="px-2.5 py-0.5 text-xs font-bold text-[#3b2a1a] cursor-pointer"
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => onRemoveItem(productId, variantId)}
                      className="text-xs underline text-[#8a4b2a] hover:text-[#b5502d] cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                <b className="font-tabular text-base text-[#b5502d]">
                  {currencySymbol}
                  {lineTotal.toLocaleString()}
                </b>
              </div>
            ))}
          </div>

          {/* 2. Country-Specific Shipping & Customer Form */}
          <form id="checkout-form" onSubmit={handleCheckoutSubmit} className="bg-[#f6ecd4] border border-[#8a4b2a]/50 p-6 space-y-4">
            <h2 className="font-editorial text-2xl text-[#3b2a1a]">
              Customer & {market === 'BD' ? 'Bangladesh' : market === 'IN' ? 'India' : 'International'} Delivery Details
            </h2>

            {market === 'INTL' && (
              <div className="p-3.5 bg-[#e4d3ad] border border-[#8a4b2a] flex items-start gap-2.5 text-xs text-[#3b2a1a]">
                <AlertTriangle className="w-4 h-4 text-[#b5502d] shrink-0 mt-0.5" />
                <div>
                  <strong>Cross-Border Notice:</strong> International courier calculation is not yet automated. Submitting this form records a <strong>Reservation & Freight Quote Inquiry</strong>.
                </div>
              </div>
            )}

            {formError && (
              <div className="p-3 bg-[#b5502d] text-[#fff3dc] text-xs font-bold">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-[#3b2a1a] mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g., Ananya Sen / Tanvir Ahmed"
                  className="w-full px-3 py-2 bg-[#efe2c6] border border-[#8a4b2a] text-[#3b2a1a]"
                />
              </div>
              <div>
                <label className="block font-bold text-[#3b2a1a] mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3 py-2 bg-[#efe2c6] border border-[#8a4b2a] text-[#3b2a1a]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-bold text-[#3b2a1a] mb-1">
                  Phone ({market === 'BD' ? '+880' : market === 'IN' ? '+91' : 'Intl'}) *
                </label>
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder={market === 'BD' ? '+880 17XX-XXXXXX' : '+91 98XXX XXXXX'}
                  className="w-full px-3 py-2 bg-[#efe2c6] border border-[#8a4b2a] text-[#3b2a1a]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#3b2a1a] mb-1">
                  {market === 'BD' ? 'District / Division *' : market === 'IN' ? 'City & State *' : 'City & Country *'}
                </label>
                <input
                  type="text"
                  required
                  value={cityOrDistrict}
                  onChange={(e) => setCityOrDistrict(e.target.value)}
                  className="w-full px-3 py-2 bg-[#efe2c6] border border-[#8a4b2a] text-[#3b2a1a]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#3b2a1a] mb-1">
                  {market === 'BD' ? 'Postcode *' : market === 'IN' ? 'PIN Code *' : 'Postal Code *'}
                </label>
                <input
                  type="text"
                  required
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder={market === 'BD' ? '1209' : '700019'}
                  className="w-full px-3 py-2 bg-[#efe2c6] border border-[#8a4b2a] text-[#3b2a1a]"
                />
              </div>
            </div>

            <div className="text-xs">
              <label className="block font-bold text-[#3b2a1a] mb-1">
                Complete Delivery Address *
              </label>
              <input
                type="text"
                required
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                placeholder="House, Road, Para / Upazila..."
                className="w-full px-3 py-2 bg-[#efe2c6] border border-[#8a4b2a] text-[#3b2a1a]"
              />
            </div>

            {market !== 'INTL' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                <label className="p-3 border border-[#8a4b2a] bg-[#efe2c6] cursor-pointer flex items-center gap-2">
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'cod'}
                    onChange={() => setPaymentMethod('cod')}
                    className="accent-[#b5502d]"
                  />
                  <span>
                    <strong>Cash on Delivery (COD)</strong>
                  </span>
                </label>
                <label className="p-3 border border-[#8a4b2a] bg-[#efe2c6] cursor-pointer flex items-center gap-2">
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'gateway-pending'}
                    onChange={() => setPaymentMethod('gateway-pending')}
                    className="accent-[#b5502d]"
                  />
                  <span>
                    <strong>{market === 'BD' ? 'bKash / Nagad / Card' : 'UPI / Card'}</strong> (Demo Only)
                  </span>
                </label>
              </div>
            )}
          </form>
        </div>

        {/* Sticky Order Summary Right (.sum from Prototype) */}
        <aside className="lg:col-span-5 lg:sticky lg:top-28 bg-[#e4d3ad] border-2 border-[#8a4b2a] p-6 space-y-4">
          <h3 className="font-editorial text-2xl text-[#3b2a1a]">
            Order Summary
          </h3>

          <div className="space-y-1 text-sm">
            <div className="flex justify-between py-2 border-b border-dashed border-[#8a4b2a]">
              <span>Subtotal</span>
              <span className="font-tabular">
                {currencySymbol}
                {subtotal.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-dashed border-[#8a4b2a]">
              <span>Delivery</span>
              <span className="font-tabular">
                {market === 'INTL'
                  ? 'Quoted via Email'
                  : baseShipping === 0
                  ? 'Free'
                  : `${currencySymbol}${baseShipping}`}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-dashed border-[#8a4b2a] font-bold text-lg text-[#b5502d]">
              <span>Total</span>
              <span className="font-tabular">
                {currencySymbol}
                {total.toLocaleString()}
              </span>
            </div>
          </div>

          <p className="text-xs text-[#3b2a1a]/75">
            {subtotal < freeThreshold && market !== 'INTL'
              ? `Add ${currencySymbol}${(freeThreshold - subtotal).toLocaleString()} more for free delivery.`
              : 'You’ve unlocked free domestic delivery.'}
          </p>

          <div className="p-3 bg-[#f6ecd4] border border-[#8a4b2a]/50 flex items-start gap-2 text-xs text-[#3b2a1a]/85">
            <ShieldAlert className="w-4 h-4 text-[#b5502d] shrink-0 mt-0.5" />
            <span>
              <strong>Transparent Demo UX:</strong> Submitting records a demonstration order receipt without charging live payment gateways.
            </span>
          </div>

          <button
            type="submit"
            form="checkout-form"
            className="craft-btn w-full py-3 px-6 text-sm rounded-[3px] text-center block cursor-pointer"
          >
            {market === 'INTL'
              ? 'Submit International Inquiry'
              : 'Place Demonstration Order'}
          </button>
        </aside>
      </div>
    </div>
  );
};
