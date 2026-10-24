import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  LogIn,
  Lock,
} from 'lucide-react';
import {
  CartItem,
  DeliveryZoneCode,
  LanguageCode,
  MarketCode,
  OrderRecord,
  PageView,
  Product,
} from '../types/heritage';
import {
  getBangladeshDeliveryFeeBdt,
  getCurrencySymbol,
  getUnitPriceForMarket,
  isValidBangladeshPhone,
} from '../utils/currency';
import { validateCartAgainstCatalog } from '../lib/firebaseCart';
import { createLiveCodOrder } from '../lib/firebaseOrders';
import { AppUserProfile, saveUserPrivateContact } from '../lib/firebaseAuth';
import { CraftArtwork } from '../components/CraftArtwork';
import { tText } from '../data/translations';

const BANGLADESH_DISTRICTS = [
  'Dhaka',
  'Chattogram',
  'Sylhet',
  'Rajshahi',
  'Khulna',
  'Barishal',
  'Rangpur',
  'Mymensingh',
  'Narayanganj',
  'Gazipur',
  'Cumilla',
  'Bogura',
  'Kushtia',
  'Jashore',
  'Dinajpur',
  'Tangail',
  'Jamalpur',
  'Rangamati',
  'Bandarban',
  'Khagrachhari',
  'Cox’s Bazar',
  'Brahmanbaria',
  'Noakhali',
  'Feni',
  'Pabna',
  'Sirajganj',
  'Narsingdi',
  'Munshiganj',
  'Manikganj',
  'Faridpur',
];

interface CheckoutPageProps {
  cart: CartItem[];
  products: Product[];
  language: LanguageCode;
  market: MarketCode;
  onMarketChange: (market: MarketCode) => void;
  onUpdateQuantity: (productId: number, variantId: string, delta: number) => void;
  onRemoveItem: (productId: number, variantId: string) => void;
  onPlaceOrderSuccess: (order: OrderRecord) => void;
  onNavigate: (view: PageView) => void;
  userProfile?: AppUserProfile | null;
  onSignIn?: () => Promise<void>;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({
  cart,
  products,
  language,
  market,
  onMarketChange,
  onUpdateQuantity,
  onRemoveItem,
  onPlaceOrderSuccess,
  onNavigate,
  userProfile,
  onSignIn,
}) => {
  const [customerName, setCustomerName] = useState(userProfile?.displayName || '');
  const [customerEmail, setCustomerEmail] = useState(userProfile?.email || '');
  const [customerPhone, setCustomerPhone] = useState(userProfile?.phone || '');
  const [shippingAddress, setShippingAddress] = useState(userProfile?.defaultAddress || '');
  const [district, setDistrict] = useState(userProfile?.district || 'Dhaka');
  const [thana, setThana] = useState(userProfile?.thana || 'Dhanmondi');
  const [postalCode, setPostalCode] = useState(userProfile?.postalCode || '1209');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [deliveryZone, setDeliveryZone] = useState<DeliveryZoneCode>('dhaka_metro');

  const [formError, setFormError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [confirmedOrder, setConfirmedOrder] = useState<OrderRecord | null>(null);

  // Unique idempotency key per checkout session + cart fingerprint to prevent duplicate submissions
  const idempotencyKey = useMemo(() => {
    const cartFingerprint = cart
      .map((c) => `${c.productId}_${c.variantId}_${c.quantity}`)
      .join('-');
    const sessionNonce = Math.random().toString(36).substring(2, 10);
    return `idem_${cartFingerprint}_${sessionNonce}`.slice(0, 64);
  }, [cart]);

  React.useEffect(() => {
    if (userProfile) {
      setCustomerName((prev) => prev || userProfile.displayName || '');
      setCustomerEmail((prev) => prev || userProfile.email || '');
      setCustomerPhone((prev) => prev || userProfile.phone || '');
      setShippingAddress((prev) => prev || userProfile.defaultAddress || '');
      if (userProfile.district) setDistrict(userProfile.district);
      if (userProfile.thana) setThana(userProfile.thana);
      if (userProfile.postalCode) setPostalCode(userProfile.postalCode);
    }
  }, [userProfile]);

  React.useEffect(() => {
    if (district === 'Dhaka') {
      setDeliveryZone('dhaka_metro');
    } else {
      setDeliveryZone('outside_dhaka');
    }
  }, [district]);

  const validation = useMemo(
    () => validateCartAgainstCatalog(cart, products, deliveryZone),
    [cart, products, deliveryZone]
  );

  const currencySymbol = getCurrencySymbol(market);

  const detailedItems = cart
    .map((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) return null;
      const variant = product.variants.find((v) => v.id === item.variantId) || product.variants[0];
      const unitPrice = getUnitPriceForMarket(product, market, variant?.id);
      const maxStock = typeof variant?.stockCount === 'number' ? variant.stockCount : 10;
      const isVerified =
        !product.isDemoData && product.isPublished && product.verificationStatus === 'verified';
      return {
        ...item,
        product,
        variant,
        unitPrice,
        maxStock,
        isVerified,
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
    isVerified: boolean;
    lineTotal: number;
  }[];

  const subtotal =
    market === 'BD'
      ? validation.subtotalBdt
      : detailedItems.reduce((acc, item) => acc + item.lineTotal, 0);
  const baseShipping =
    market === 'BD'
      ? getBangladeshDeliveryFeeBdt(deliveryZone)
      : market === 'IN'
      ? 150
      : 0;
  const total = subtotal + baseShipping;

  if (confirmedOrder) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-12 sm:py-16">
        <div className="bg-[#f6ecd4] border-2 border-[#8a4b2a] p-8 sm:p-10 space-y-6 text-center">
          <CheckCircle2 className="w-9 h-9 text-[#5d7a4a] mx-auto" />
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-[#8a4b2a]">
              {confirmedOrder.isDemoOrder
                ? `Demonstration Preview Receipt · #${confirmedOrder.orderId}`
                : `Verified Live COD Order · Reference #${confirmedOrder.orderReference || confirmedOrder.orderId}`}
            </p>
            <h1 className="font-editorial text-4xl text-[#5d7a4a]">
              {confirmedOrder.isDemoOrder
                ? 'Demonstration Order Receipt Recorded'
                : 'Dhonnobad! Your Cash on Delivery Order is Recorded'}
            </h1>
          </div>

          <div className="p-4 bg-[#e4d3ad] border border-[#8a4b2a] text-xs text-[#3b2a1a] text-left space-y-2 leading-relaxed">
            {confirmedOrder.isDemoOrder ? (
              <p>
                <strong>Demonstration Mode Notice:</strong> This receipt was created in demonstration preview mode. No live inventory was decremented.
              </p>
            ) : (
              <>
                <p>
                  <strong>Order Reference:</strong>{' '}
                  <span className="font-tabular font-bold text-[#b5502d]">
                    {confirmedOrder.orderReference}
                  </span>{' '}
                  (Firestore ID: <code>{confirmedOrder.orderId}</code>)
                </p>
                <p>
                  <strong>Order Lifecycle Status:</strong>{' '}
                  <span className="font-bold text-[#8a4b2a]">
                    pending_verification (Awaiting Phone Confirmation)
                  </span>
                </p>
                <p>
                  <strong>Payment Status:</strong>{' '}
                  <span className="font-bold text-[#b5502d]">
                    unpaid_cod (Cash on Delivery — Payable in Cash Upon Physical Delivery)
                  </span>
                </p>
                <p>
                  <strong>Server-Confirmed Total:</strong>{' '}
                  <span className="font-tabular font-bold">
                    ৳{confirmedOrder.total.toLocaleString()} ({confirmedOrder.totalMinorUnits?.toLocaleString()} poisha)
                  </span>
                </p>
              </>
            )}
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => onNavigate('orders')}
              className="craft-btn px-6 py-2.5 text-xs rounded-[3px] cursor-pointer"
            >
              View Live Order Status & Tracking
            </button>
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="craft-btn-outline px-6 py-2.5 text-xs rounded-[3px] cursor-pointer"
            >
              Continue Exploring
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

  const handleLiveCodOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setFormError('');

    if (market !== 'BD') {
      setFormError(
        'Live Cash on Delivery (COD) checkout is exclusively enabled for Bangladesh (৳ BDT) in this initial release. Switch market to Bangladesh (BD) above or record an international inquiry below.'
      );
      return;
    }

    if (!userProfile) {
      setFormError('Please sign in with Google before placing a verified live COD order.');
      return;
    }

    if (!validation.isValidForLiveOrder) {
      const firstIssue = validation.issues[0];
      setFormError(
        firstIssue
          ? firstIssue.messageEn
          : 'One or more items in your bag cannot be ordered in live mode.'
      );
      return;
    }

    if (!isValidBangladeshPhone(customerPhone)) {
      setFormError(
        'Please enter a valid Bangladesh mobile number (e.g., 01712345678 or +8801712345678) for COD phone verification.'
      );
      return;
    }

    if (!customerName.trim() || !shippingAddress.trim() || !district.trim() || !thana.trim()) {
      setFormError('Please complete your full name, District, Thana/Upazila, and street address.');
      return;
    }

    setIsSubmitting(true);
    try {
      await saveUserPrivateContact(userProfile.uid, {
        phone: customerPhone.replace(/[\s-]/g, ''),
        defaultAddress: shippingAddress,
        district,
        thana,
        postalCode,
      }).catch(() => {});

      const result = await createLiveCodOrder({
        idempotencyKey,
        customerName,
        customerPhone,
        customerEmail,
        shippingAddress,
        district,
        thana,
        postalCode,
        deliveryInstructions,
        deliveryZone,
        cart,
        catalogProducts: products,
      });

      setConfirmedOrder(result.order);
      onPlaceOrderSuccess(result.order);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to place live order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoPreviewSubmit = () => {
    if (!customerName.trim() || !customerPhone.trim() || !shippingAddress.trim()) {
      setFormError('Please enter your Name, Phone, and Address to generate a demonstration preview receipt.');
      return;
    }
    setFormError('');
    const demoOrder: OrderRecord = {
      orderId: `DEMO-${Math.floor(1000 + Math.random() * 9000)}`,
      orderReference: `DEMO-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
      market,
      currencySymbol,
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim(),
      customerPhone: customerPhone.trim(),
      shippingAddress: shippingAddress.trim(),
      cityOrDistrict: `${thana.trim()}, ${district.trim()}`,
      thana: thana.trim(),
      postalCode: postalCode.trim(),
      deliveryMethodLabel:
        market === 'INTL'
          ? 'International Freight Quote Inquiry (Demo)'
          : deliveryZone === 'dhaka_metro'
          ? 'Inside Dhaka Metro Courier (Demo)'
          : 'Outside Dhaka Courier (Demo)',
      paymentMethodLabel: 'Demonstration Preview Only (No Live Order Created)',
      items: detailedItems.map((i) => ({
        productId: i.productId,
        variantId: i.variantId,
        sku: i.variant.sku,
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

    setConfirmedOrder(demoOrder);
    onPlaceOrderSuccess(demoOrder);
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-8 py-10 sm:py-12 space-y-8">
      <div className="text-center section-ornament">
        <h1 className="font-editorial text-4xl sm:text-[44px] text-[#3b2a1a]">
          {language === 'bn' ? 'আপনার ঝুলি ও বাংলাদেশ ক্যাশ অন ডেলিভারি' : 'Your Bag & Bangladesh COD Checkout'}
        </h1>
        <p className="text-xs text-[#3b2a1a]/75 mt-1">
          Bangladesh Cash on Delivery (COD) with Transactional Cloud Firestore Inventory
        </p>
      </div>

      {/* Market Switcher */}
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
        <span className="text-[#3b2a1a]/80 font-bold">Shipping Region:</span>
        {(['BD', 'IN', 'INTL'] as MarketCode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onMarketChange(m)}
            className={`px-3.5 py-1.5 border border-[#8a4b2a] transition-colors cursor-pointer ${
              market === m
                ? 'bg-[#8a4b2a] text-[#fff3dc]'
                : 'bg-[#f6ecd4] text-[#3b2a1a] hover:bg-[#e4d3ad]'
            }`}
          >
            {m === 'BD'
              ? 'Bangladesh · ৳ BDT (Live COD Active)'
              : m === 'IN'
              ? 'India · ₹ INR (Preview)'
              : 'Global Diaspora (Inquiry)'}
          </button>
        ))}
      </div>

      {/* Validation Notices */}
      {validation.issues.length > 0 && (
        <div className="bg-[#f6ecd4] border-2 border-[#b5502d] p-4 space-y-2 text-xs">
          <div className="flex items-start gap-2.5 text-[#3b2a1a]">
            <AlertTriangle className="w-4 h-4 text-[#b5502d] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="block text-sm text-[#b5502d]">
                Live Checkout Validation Notice
              </strong>
              <ul className="list-disc pl-4 space-y-1">
                {validation.issues.map((iss, idx) => (
                  <li key={idx}>
                    {language === 'bn' ? iss.messageBn : iss.messageEn}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Main Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Bag Items */}
          <div className="space-y-3">
            {detailedItems.map(({ productId, variantId, quantity, product, variant, maxStock, isVerified, lineTotal }) => (
              <div
                key={`${productId}-${variantId}`}
                className="p-3 bg-[#f6ecd4] border border-[#8a4b2a]/50 grid grid-cols-1 sm:grid-cols-[80px_1fr_auto] gap-4 items-center"
              >
                <div className="w-20 h-20 border border-[#8a4b2a]/50">
                  <CraftArtwork
                    artworkIndex={product.artworkIndex}
                    variantShift={product.id % 3}
                    className="w-full h-full"
                  />
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-editorial text-xl text-[#3b2a1a]">
                      {tText(product.name, language)}
                    </h3>
                    {isVerified ? (
                      <span className="text-[11px] font-bold text-[#5d7a4a]">
                        · Verified Stock ({maxStock})
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-[#b5502d]">
                        · Preview Item
                      </span>
                    )}
                  </div>
                  <small className="text-xs italic text-[#3b2a1a]/75 block">
                    {tText(variant.label, language)}
                    {variant.sku ? ` (${variant.sku})` : ''} · {tText(product.artisanName, language)}
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
                        disabled={quantity >= maxStock}
                        onClick={() => onUpdateQuantity(productId, variantId, 1)}
                        className="px-2.5 py-0.5 text-xs font-bold text-[#3b2a1a] disabled:opacity-40 cursor-pointer"
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

          {/* 2. Customer Authentication Box */}
          {!userProfile && (
            <div className="bg-[#e4d3ad] border-2 border-[#8a4b2a] p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1 text-xs">
                <strong className="block text-sm text-[#3b2a1a]">
                  Sign In Required for Verified Live Bangladesh COD Orders
                </strong>
                <p className="text-[#3b2a1a]/80">
                  Live orders are tied to your authenticated Firebase UID so you can track order status and manage your delivery coordinates.
                </p>
              </div>
              {onSignIn && (
                <button
                  type="button"
                  onClick={onSignIn}
                  className="craft-btn px-4 py-2 text-xs inline-flex items-center gap-2 shrink-0 cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In with Google</span>
                </button>
              )}
            </div>
          )}

          {/* 3. Bangladesh Mobile-First Delivery & COD Form */}
          <form
            id="checkout-form"
            onSubmit={handleLiveCodOrderSubmit}
            className="bg-[#f6ecd4] border border-[#8a4b2a]/50 p-6 space-y-4"
          >
            <h2 className="font-editorial text-2xl text-[#3b2a1a]">
              Bangladesh Recipient & Delivery Coordinates
            </h2>

            {formError && (
              <div className="p-3 bg-[#b5502d] text-[#fff3dc] text-xs font-bold">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-[#3b2a1a] mb-1">
                  Recipient Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g., Tanvir Ahmed / Ananya Sen"
                  className="w-full px-3 py-2.5 bg-[#efe2c6] border border-[#8a4b2a] text-[#3b2a1a]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#3b2a1a] mb-1">
                  Bangladesh Mobile Number (for COD Verification) *
                </label>
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="017XXXXXXXX or +88017XXXXXXXX"
                  className="w-full px-3 py-2.5 bg-[#efe2c6] border border-[#8a4b2a] text-[#3b2a1a]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-bold text-[#3b2a1a] mb-1">
                  District (জেলা) *
                </label>
                <select
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#efe2c6] border border-[#8a4b2a] text-[#3b2a1a]"
                >
                  {BANGLADESH_DISTRICTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#3b2a1a] mb-1">
                  Thana / Upazila (থানা/উপজেলা) *
                </label>
                <input
                  type="text"
                  required
                  value={thana}
                  onChange={(e) => setThana(e.target.value)}
                  placeholder="e.g., Dhanmondi / Gulshan / Kotwali"
                  className="w-full px-3 py-2.5 bg-[#efe2c6] border border-[#8a4b2a] text-[#3b2a1a]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#3b2a1a] mb-1">
                  Postal Code (পোস্টকোড)
                </label>
                <input
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="1209"
                  className="w-full px-3 py-2.5 bg-[#efe2c6] border border-[#8a4b2a] text-[#3b2a1a]"
                />
              </div>
            </div>

            <div className="text-xs">
              <label className="block font-bold text-[#3b2a1a] mb-1">
                House, Road, Block / Village Address *
              </label>
              <input
                type="text"
                required
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                placeholder="House 14, Road 5, Dhanmondi..."
                className="w-full px-3 py-2.5 bg-[#efe2c6] border border-[#8a4b2a] text-[#3b2a1a]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-[#3b2a1a] mb-1">
                  Delivery Zone & Courier Rate *
                </label>
                <select
                  value={deliveryZone}
                  onChange={(e) => setDeliveryZone(e.target.value as DeliveryZoneCode)}
                  className="w-full px-3 py-2.5 bg-[#efe2c6] border border-[#8a4b2a] text-[#3b2a1a]"
                >
                  <option value="dhaka_metro">Inside Dhaka Metro — ৳80 (2–3 Days)</option>
                  <option value="outside_dhaka">Outside Dhaka Nationwide — ৳150 (4–6 Days)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#3b2a1a] mb-1">
                  Email Address (Optional Receipt Copy)
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3 py-2.5 bg-[#efe2c6] border border-[#8a4b2a] text-[#3b2a1a]"
                />
              </div>
            </div>

            <div className="text-xs">
              <label className="block font-bold text-[#3b2a1a] mb-1">
                Delivery Instructions / Landmark (Optional)
              </label>
              <input
                type="text"
                value={deliveryInstructions}
                onChange={(e) => setDeliveryInstructions(e.target.value)}
                placeholder="e.g., Call before arrival; leave with security desk..."
                className="w-full px-3 py-2 bg-[#efe2c6] border border-[#8a4b2a] text-[#3b2a1a]"
              />
            </div>

            {/* Payment Method: Strictly Cash on Delivery (COD) for initial release */}
            <div className="pt-2 space-y-2 text-xs">
              <label className="block font-bold text-[#3b2a1a]">
                Payment Method (Initial Bangladesh Release)
              </label>
              <div className="p-3.5 border-2 border-[#8a4b2a] bg-[#efe2c6] flex items-start gap-2.5">
                <input
                  type="radio"
                  name="payment"
                  checked={true}
                  readOnly
                  className="accent-[#b5502d] mt-0.5"
                />
                <div>
                  <strong className="block text-[#3b2a1a]">
                    Cash on Delivery (COD — ক্যাশ অন ডেলিভারি)
                  </strong>
                  <span className="text-[#3b2a1a]/80">
                    Orders start at <code>orderStatus: pending_verification</code> and{' '}
                    <code>paymentStatus: unpaid_cod</code>. Pay in cash only upon receiving your parcel.
                  </span>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Sticky Order Summary Right */}
        <aside className="lg:col-span-5 lg:sticky lg:top-28 bg-[#e4d3ad] border-2 border-[#8a4b2a] p-6 space-y-4">
          <h3 className="font-editorial text-2xl text-[#3b2a1a]">
            Order Summary
          </h3>

          <div className="space-y-1 text-sm">
            <div className="flex justify-between py-2 border-b border-dashed border-[#8a4b2a]">
              <span>Subtotal ({validation.totalItemCount} items)</span>
              <span className="font-tabular">
                {currencySymbol}
                {subtotal.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-dashed border-[#8a4b2a]">
              <span>
                {deliveryZone === 'dhaka_metro' ? 'Inside Dhaka Courier' : 'Outside Dhaka Courier'}
              </span>
              <span className="font-tabular">
                {market === 'INTL' ? 'Quoted via Email' : `${currencySymbol}${baseShipping}`}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-dashed border-[#8a4b2a] font-bold text-lg text-[#b5502d]">
              <span>Total Payable on Delivery</span>
              <span className="font-tabular">
                {currencySymbol}
                {total.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="text-[11px] text-[#3b2a1a]/75 font-tabular">
            Server Minor Units: {validation.totalMinorUnits.toLocaleString()} poisha · Idempotency Key:{' '}
            <code>{idempotencyKey.slice(0, 18)}…</code>
          </div>

          {/* Primary Action: Live Transactional COD Order */}
          <button
            type="submit"
            form="checkout-form"
            disabled={isSubmitting || !userProfile || !validation.isValidForLiveOrder || market !== 'BD'}
            className={`w-full py-3 px-6 text-sm rounded-[3px] text-center flex items-center justify-center gap-2 ${
              !isSubmitting && userProfile && validation.isValidForLiveOrder && market === 'BD'
                ? 'craft-btn cursor-pointer'
                : 'bg-[#efe2c6] border-2 border-[#8a4b2a]/40 text-[#3b2a1a]/50 cursor-not-allowed'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>
              {isSubmitting
                ? 'Recording Transactional Order...'
                : 'Place Verified Live COD Order (৳' + total.toLocaleString() + ')'}
            </span>
          </button>

          {/* Secondary Action: Clearly separated Demonstration Preview Receipt */}
          <div className="pt-3 border-t border-dashed border-[#8a4b2a]/50 space-y-2">
            <div className="flex items-start gap-2 text-xs text-[#3b2a1a]/80">
              <ShieldAlert className="w-4 h-4 text-[#8a4b2a] shrink-0 mt-0.5" />
              <span>
                Testing with unverified preview items or evaluating without signing in? You can generate a local <strong>Demonstration Preview Receipt</strong> (does not decrement live Firestore stock).
              </span>
            </div>
            <button
              type="button"
              onClick={handleDemoPreviewSubmit}
              className="craft-btn-outline w-full py-2 px-4 text-xs rounded-[3px] text-center cursor-pointer"
            >
              Generate Demonstration Preview Receipt Only
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
};
