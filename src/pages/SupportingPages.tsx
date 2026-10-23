import React, { useState } from 'react';
import { Heart, Package, Mail, HelpCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import {
  LanguageCode,
  MarketCode,
  OrderRecord,
  PageView,
  Product,
} from '../types/heritage';
import { ProductCard } from '../components/ProductCard';

interface SupportingPagesProps {
  activePage: 'wishlist' | 'orders' | 'contact' | 'policies';
  language: LanguageCode;
  market: MarketCode;
  products: Product[];
  wishlist: number[];
  orders: OrderRecord[];
  onNavigate: (view: PageView) => void;
  onSelectProduct: (productId: number) => void;
  onToggleWishlist: (productId: number, e: React.MouseEvent) => void;
  onQuickView: (product: Product, e: React.MouseEvent) => void;
  onAddToCart: (productId: number, variantId: string, quantity: number, e: React.MouseEvent) => void;
}

export const SupportingPages: React.FC<SupportingPagesProps> = ({
  activePage,
  language,
  market,
  products,
  wishlist,
  orders,
  onNavigate,
  onSelectProduct,
  onToggleWishlist,
  onQuickView,
  onAddToCart,
}) => {
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactTopic, setContactTopic] = useState('Artisan / Weaver Collective Onboarding');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSent, setContactSent] = useState(false);

  // 1. Saved Wishlist View
  if (activePage === 'wishlist') {
    const savedProducts = products.filter((p) => wishlist.includes(p.id));
    return (
      <div className="max-w-[1200px] mx-auto px-4 sm:px-8 py-10 sm:py-12 space-y-8">
        <div className="text-center section-ornament">
          <h1 className="font-editorial text-4xl sm:text-[44px] text-[#3b2a1a]">
            {language === 'bn' ? 'আপনার পছন্দের তালিকা' : 'Your Saved Wishlist'}
          </h1>
          <p className="text-sm text-[#3b2a1a]/75 mt-1">
            {savedProducts.length} saved {savedProducts.length === 1 ? 'piece' : 'pieces'}
          </p>
        </div>

        {savedProducts.length === 0 ? (
          <div className="bg-[#f6ecd4] border-2 border-dashed border-[#8a4b2a] p-12 text-center space-y-4">
            <Heart className="w-8 h-8 text-[#b5502d] mx-auto" />
            <h2 className="font-editorial text-3xl text-[#3b2a1a]">
              Your wishlist is empty
            </h2>
            <p className="text-sm text-[#3b2a1a]/75 max-w-md mx-auto">
              Save favorite Nakshi Kantha throws, Jamdani weaves, or terracotta vessels while browsing.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('shop')}
              className="craft-btn px-6 py-2.5 text-xs rounded-[3px] cursor-pointer"
            >
              Shop the Collection
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {savedProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                language={language}
                market={market}
                isWishlisted={true}
                onSelectProduct={onSelectProduct}
                onToggleWishlist={onToggleWishlist}
                onQuickView={onQuickView}
                onAddToCart={onAddToCart}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // 2. Order History & Tracking View
  if (activePage === 'orders') {
    return (
      <div className="max-w-[1000px] mx-auto px-4 sm:px-8 py-10 sm:py-12 space-y-8">
        <div className="text-center section-ornament">
          <h1 className="font-editorial text-4xl sm:text-[44px] text-[#3b2a1a]">
            {language === 'bn' ? 'অর্ডার ইতিহাস ও ট্র্যাকিং' : 'Order History & Demonstration Receipts'}
          </h1>
          <p className="text-sm text-[#3b2a1a]/75 mt-1">
            Orders recorded during your session are stored in your browser for evaluation.
          </p>
        </div>

        {orders.length === 0 ? (
          <div className="bg-[#f6ecd4] border-2 border-dashed border-[#8a4b2a] p-12 text-center space-y-4">
            <Package className="w-8 h-8 text-[#b5502d] mx-auto" />
            <h2 className="font-editorial text-3xl text-[#3b2a1a]">
              No demonstration orders recorded yet
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('shop')}
              className="craft-btn px-6 py-2.5 text-xs rounded-[3px] cursor-pointer"
            >
              Browse Crafts
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {orders.map((order) => (
              <div key={order.orderId} className="craft-card p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-dashed border-[#8a4b2a] pb-3">
                  <div>
                    <span className="font-tabular text-xs font-bold text-[#b5502d]">
                      Order #{order.orderId}
                    </span>
                    <span className="text-xs text-[#3b2a1a]/75"> · Placed on {order.createdAt}</span>
                  </div>
                  <span className="text-xs font-bold text-[#5d7a4a]">
                    Status: Demonstration Receipt Recorded ({order.market})
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <strong className="block text-[#3b2a1a]">Recipient & Address</strong>
                    <p className="text-[#3b2a1a]/80">
                      {order.customerName} · {order.shippingAddress}, {order.cityOrDistrict} ({order.postalCode})
                    </p>
                  </div>
                  <div>
                    <strong className="block text-[#3b2a1a]">Delivery & Payment Mode</strong>
                    <p className="text-[#3b2a1a]/80">
                      {order.deliveryMethodLabel} · {order.paymentMethodLabel}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-dashed border-[#8a4b2a] flex items-center justify-between text-xs font-bold">
                  <span>{order.items.length} item(s)</span>
                  <span className="font-tabular text-sm text-[#b5502d]">
                    Total: {order.currencySymbol}
                    {order.total.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 3. Contact & Artisan Onboarding Page
  if (activePage === 'contact') {
    const handleContactSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (contactName.trim() && contactEmail.trim() && contactMessage.trim()) {
        setContactSent(true);
      }
    };

    return (
      <div className="max-w-[1000px] mx-auto px-4 sm:px-8 py-10 sm:py-12 space-y-8">
        <div className="text-center section-ornament">
          <h1 className="font-editorial text-4xl sm:text-[44px] text-[#3b2a1a]">
            {language === 'bn'
              ? 'যোগাযোগ ও কারিগর নিবন্ধন'
              : 'Contact & Maker Onboarding'}
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 craft-card p-6 sm:p-8">
            {contactSent ? (
              <div className="py-10 text-center space-y-3">
                <CheckCircle2 className="w-8 h-8 text-[#5d7a4a] mx-auto" />
                <h2 className="font-editorial text-3xl text-[#3b2a1a]">
                  Message Recorded (Demo Mode)
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setContactSent(false);
                    setContactMessage('');
                  }}
                  className="craft-btn px-5 py-2 text-xs rounded-[3px] cursor-pointer"
                >
                  Send Another Inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-[#3b2a1a] mb-1">Your Name *</label>
                    <input
                      type="text"
                      required
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      className="w-full px-3 py-2 bg-[#efe2c6] border border-[#8a4b2a]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#3b2a1a] mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-[#efe2c6] border border-[#8a4b2a]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[#3b2a1a] mb-1">Inquiry Topic</label>
                  <select
                    value={contactTopic}
                    onChange={(e) => setContactTopic(e.target.value)}
                    className="w-full px-3 py-2 bg-[#efe2c6] border border-[#8a4b2a]"
                  >
                    <option>Artisan / Weaver Collective Onboarding</option>
                    <option>Indigenous Community Representation & Archive</option>
                    <option>Order & Regional Shipping Inquiry (BD / IN / Global)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#3b2a1a] mb-1">Message *</label>
                  <textarea
                    rows={4}
                    required
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    className="w-full p-3 bg-[#efe2c6] border border-[#8a4b2a]"
                  />
                </div>

                <button
                  type="submit"
                  className="craft-btn px-6 py-2.5 text-xs rounded-[3px] cursor-pointer"
                >
                  Submit Inquiry
                </button>
              </form>
            )}
          </div>

          <div className="lg:col-span-5 space-y-4 text-xs">
            <div className="bg-[#e4d3ad] border-2 border-[#8a4b2a] p-6 space-y-2">
              <Mail className="w-5 h-5 text-[#b5502d]" />
              <h2 className="font-editorial text-2xl text-[#3b2a1a]">
                Official Contact Placeholders
              </h2>
              <p className="text-[#3b2a1a]/80 leading-relaxed">
                Replace the placeholders below with verified business coordinates prior to launch:
              </p>
              <div className="pt-2 space-y-1 font-bold text-[#8a4b2a]">
                <p>[PLACEHOLDER: Dhaka Curation Desk Address]</p>
                <p>[PLACEHOLDER: Kolkata Regional Hub Address]</p>
                <p>[PLACEHOLDER: official-email@rootsofbengal.example]</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 4. Policies, Shipping, Returns & FAQs
  return (
    <div className="max-w-[1000px] mx-auto px-4 sm:px-8 py-10 sm:py-12 space-y-10">
      <div className="text-center section-ornament">
        <h1 className="font-editorial text-4xl sm:text-[44px] text-[#3b2a1a]">
          Shipping, Returns & FAQs
        </h1>
        <p className="text-xs text-[#3b2a1a]/75 mt-1">
          Policy templates awaiting final commercial and legal verification.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs sm:text-sm">
        <div className="craft-card p-6 space-y-2">
          <h2 className="font-editorial text-2xl text-[#3b2a1a]">
            Shipping & Cross-Border Policy [Placeholder]
          </h2>
          <p className="text-[#3b2a1a]/85 leading-relaxed">
            • <strong>Bangladesh Domestic (BDT):</strong> Free shipping over ৳3,000 (Demo).
          </p>
          <p className="text-[#3b2a1a]/85 leading-relaxed">
            • <strong>India Domestic (INR):</strong> Free shipping over ₹2,500 (Demo).
          </p>
          <p className="text-[#3b2a1a]/85 leading-relaxed">
            • <strong>International Diaspora:</strong> Custom air freight quotes upon inquiry.
          </p>
        </div>

        <div className="craft-card p-6 space-y-2">
          <h2 className="font-editorial text-2xl text-[#3b2a1a]">
            Returns & Handmade Variations [Placeholder]
          </h2>
          <p className="text-[#3b2a1a]/85 leading-relaxed">
            • Subtle variations in running-stitch density (Nakshi Kantha), pit-loom weave count (Jamdani), and wood-kiln firing marks (Terracotta) are hallmarks of genuine handcraft.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="font-editorial text-3xl text-[#3b2a1a] flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-[#b5502d]" />
          <span>Frequently Asked Questions</span>
        </h2>

        <div className="divide-y divide-dashed divide-[#8a4b2a] bg-[#f6ecd4] border border-[#8a4b2a] px-6">
          <div className="py-4 space-y-1">
            <h3 className="font-bold text-sm text-[#3b2a1a]">
              Does selecting Bengali or English automatically change my shipping country or currency?
            </h3>
            <p className="text-xs text-[#3b2a1a]/80">
              No. Language preference (`English`, `বাংলা`, or `অসমীয়া`) is independent from your shipping market and currency (`Bangladesh · ৳ BDT`, `India · ₹ INR`, or `Global`).
            </p>
          </div>
          <div className="py-4 space-y-1">
            <h3 className="font-bold text-sm text-[#3b2a1a]">
              How are indigenous and ethnic-community crafts represented?
            </h3>
            <p className="text-xs text-[#3b2a1a]/80">
              Each community—such as Chakma weavers in Rangamati or Santal artisans in Birbhum—is credited by name and region.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('shop')}
          className="inline-flex items-center gap-2 text-xs font-bold text-[#b5502d] underline cursor-pointer"
        >
          <span>Return to Shop Crafts</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
