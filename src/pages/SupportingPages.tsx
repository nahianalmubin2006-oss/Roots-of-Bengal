import React, { useState } from 'react';
import {
  Heart,
  Package,
  Mail,
  HelpCircle,
  CheckCircle2,
  ArrowRight,
  LogIn,
  LogOut,
  XCircle,
} from 'lucide-react';
import {
  LanguageCode,
  MarketCode,
  OrderRecord,
  PageView,
  Product,
} from '../types/heritage';
import { AppUserProfile } from '../lib/firebaseAuth';
import { cancelLiveCodOrder } from '../lib/firebaseOrders';
import { ProductCard } from '../components/ProductCard';

interface SupportingPagesProps {
  activePage: 'wishlist' | 'orders' | 'contact' | 'policies';
  language: LanguageCode;
  market: MarketCode;
  products: Product[];
  wishlist: number[];
  liveOrders: OrderRecord[];
  demoOrders: OrderRecord[];
  onNavigate: (view: PageView) => void;
  onSelectProduct: (productId: number) => void;
  onToggleWishlist: (productId: number, e: React.MouseEvent) => void;
  onQuickView: (product: Product, e: React.MouseEvent) => void;
  onAddToCart: (productId: number, variantId: string, quantity: number, e: React.MouseEvent) => void;
  userProfile?: AppUserProfile | null;
  onSignIn?: () => Promise<void>;
  onSignOut?: () => Promise<void>;
  onTriggerToast?: (msg: string) => void;
}

export const SupportingPages: React.FC<SupportingPagesProps> = ({
  activePage,
  language,
  market,
  products,
  wishlist,
  liveOrders,
  demoOrders,
  onNavigate,
  onSelectProduct,
  onToggleWishlist,
  onQuickView,
  onAddToCart,
  userProfile,
  onSignIn,
  onSignOut,
  onTriggerToast,
}) => {
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactTopic, setContactTopic] = useState('Artisan / Weaver Collective Onboarding');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSent, setContactSent] = useState(false);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);

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

  // 2. Customer Order History & Profile View (100% public, no admin controls)
  if (activePage === 'orders') {
    const handleCancelOrder = async (orderId: string) => {
      setCancellingOrderId(orderId);
      try {
        await cancelLiveCodOrder(orderId, 'Cancelled by customer from Order History');
        onTriggerToast?.(`Order ${orderId} cancelled and inventory restored.`);
      } catch (err) {
        onTriggerToast?.(err instanceof Error ? err.message : 'Could not cancel order');
      } finally {
        setCancellingOrderId(null);
      }
    };

    return (
      <div className="max-w-[1000px] mx-auto px-4 sm:px-8 py-10 sm:py-12 space-y-10">
        <div className="text-center section-ornament">
          <h1 className="font-editorial text-4xl sm:text-[44px] text-[#3b2a1a]">
            {language === 'bn'
              ? 'অর্ডার ইতিহাস ও অ্যাকাউন্ট'
              : 'Your Order History & Account'}
          </h1>
          <p className="text-sm text-[#3b2a1a]/75 mt-1">
            Real-time status of your handcrafted orders
          </p>
        </div>

        {/* Customer Account Status Card */}
        <div className="craft-card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {userProfile ? (
            <>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <strong className="text-base text-[#3b2a1a]">{userProfile.displayName}</strong>
                </div>
                <p className="text-[#3b2a1a]/80">
                  Email: {userProfile.email}
                </p>
                {userProfile.phone && (
                  <p className="text-[#3b2a1a]/80">
                    Saved Delivery Contact: {userProfile.phone} ({userProfile.thana}, {userProfile.district})
                  </p>
                )}
              </div>
              {onSignOut && (
                <button
                  type="button"
                  onClick={onSignOut}
                  className="craft-btn-outline px-4 py-2 text-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              )}
            </>
          ) : (
            <>
              <div className="space-y-1 text-xs">
                <strong className="text-base text-[#3b2a1a] block">
                  Sign in with Google to view your live Bangladesh COD orders
                </strong>
                <p className="text-[#3b2a1a]/75">
                  Your order history is securely linked to your Google patron account.
                </p>
              </div>
              {onSignIn && (
                <button
                  type="button"
                  onClick={onSignIn}
                  className="craft-btn px-5 py-2.5 text-xs inline-flex items-center gap-2 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In with Google</span>
                </button>
              )}
            </>
          )}
        </div>

        {/* Live Customer Orders Section */}
        <div className="space-y-4">
          <h2 className="font-editorial text-3xl text-[#3b2a1a]">
            Your Live Orders ({liveOrders.length})
          </h2>

          {liveOrders.length === 0 ? (
            <div className="bg-[#f6ecd4] border-2 border-dashed border-[#8a4b2a] p-10 text-center space-y-3">
              <Package className="w-8 h-8 text-[#b5502d] mx-auto" />
              <h3 className="font-editorial text-2xl text-[#3b2a1a]">
                No orders placed yet
              </h3>
              <p className="text-xs text-[#3b2a1a]/75 max-w-md mx-auto">
                Discover authentic Nakshi Kantha quilts, Jamdani weaves, and terracotta crafts made slowly by hand.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('shop')}
                className="craft-btn px-6 py-2 text-xs rounded-[3px] cursor-pointer"
              >
                Browse Crafts
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {liveOrders.map((order) => (
                <div key={order.orderId} className="craft-card p-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-dashed border-[#8a4b2a] pb-3">
                    <div>
                      <span className="font-tabular text-sm font-bold text-[#b5502d]">
                        Reference #{order.orderReference || order.orderId}
                      </span>
                      <span className="text-xs text-[#3b2a1a]/75">
                        {' '}
                        · Placed on {order.createdAt}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="px-2.5 py-0.5 bg-[#e4d3ad] border border-[#8a4b2a] font-bold text-[#3b2a1a]">
                        Status: {order.orderStatus || 'pending_verification'}
                      </span>
                      <span className="px-2.5 py-0.5 bg-[#f6ecd4] border border-[#8a4b2a] font-bold text-[#b5502d]">
                        Payment: {order.paymentStatus || 'unpaid_cod'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <strong className="block text-[#3b2a1a]">Delivery Address</strong>
                      <p className="text-[#3b2a1a]/80">
                        {order.customerName} ({order.customerPhone}) · {order.shippingAddress},{' '}
                        {order.cityOrDistrict} {order.postalCode ? `(${order.postalCode})` : ''}
                      </p>
                    </div>
                    <div>
                      <strong className="block text-[#3b2a1a]">Courier & Payment Mode</strong>
                      <p className="text-[#3b2a1a]/80">
                        {order.deliveryMethodLabel} · {order.paymentMethodLabel}
                      </p>
                    </div>
                  </div>

                  {order.items.length > 0 && (
                    <div className="bg-[#e4d3ad]/60 p-3 border border-[#8a4b2a]/30 space-y-1 text-xs">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span>
                            {item.quantity}× {item.name} ({item.variantLabel})
                          </span>
                          <span className="font-tabular font-bold">
                            ৳{(item.unitPrice * item.quantity).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-2 border-t border-dashed border-[#8a4b2a] flex flex-wrap items-center justify-between gap-4 text-xs">
                    <div>
                      {order.orderStatus === 'pending_verification' && (
                        <button
                          type="button"
                          disabled={cancellingOrderId === order.orderId}
                          onClick={() => handleCancelOrder(order.orderId)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 border border-[#b5502d] text-[#b5502d] hover:bg-[#b5502d] hover:text-[#fff3dc] transition-colors font-bold cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>
                            {cancellingOrderId === order.orderId
                              ? 'Cancelling...'
                              : 'Cancel Order Prior to Dispatch'}
                          </span>
                        </button>
                      )}
                    </div>

                    <span className="font-tabular text-sm font-bold text-[#b5502d]">
                      Total: ৳{order.total.toLocaleString()} (incl. ৳{order.shippingCost} Courier)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Local Demonstration Preview Receipts */}
        {demoOrders.length > 0 && (
          <div className="pt-6 border-t-2 border-dashed border-[#8a4b2a]/40 space-y-4">
            <h2 className="font-editorial text-2xl text-[#3b2a1a]/80">
              Local Demonstration Preview Receipts ({demoOrders.length})
            </h2>
            <div className="space-y-3">
              {demoOrders.map((order) => (
                <div key={order.orderId} className="p-4 bg-[#f6ecd4]/80 border border-dashed border-[#8a4b2a] text-xs space-y-2">
                  <div className="flex justify-between font-bold">
                    <span>Demo Preview #{order.orderId} · {order.createdAt}</span>
                    <span className="text-[#8a4b2a]">Demonstration Only</span>
                  </div>
                  <p className="text-[#3b2a1a]/75">
                    {order.customerName} · {order.shippingAddress}, {order.cityOrDistrict} · Total:{' '}
                    {order.currencySymbol}
                    {order.total.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
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
                  Inquiry Recorded
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
                Official Contact Coordinates
              </h2>
              <p className="text-[#3b2a1a]/80 leading-relaxed">
                Roots of Bengal Artisan & Regional Curation Desk:
              </p>
              <div className="pt-2 space-y-1 font-bold text-[#8a4b2a]">
                <p>Dhaka Curation Desk: Dhanmondi, Dhaka, Bangladesh</p>
                <p>Inquiries: contact@rootsofbengal.org</p>
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
          Bangladesh Cash on Delivery (COD) policy and heritage craft care guidelines.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs sm:text-sm">
        <div className="craft-card p-6 space-y-2">
          <h2 className="font-editorial text-2xl text-[#3b2a1a]">
            Bangladesh Delivery & COD Policy
          </h2>
          <p className="text-[#3b2a1a]/85 leading-relaxed">
            • <strong>Inside Dhaka Metro:</strong> ৳80 flat courier fee (2–3 business days).
          </p>
          <p className="text-[#3b2a1a]/85 leading-relaxed">
            • <strong>Outside Dhaka Nationwide:</strong> ৳150 courier fee (4–6 business days).
          </p>
          <p className="text-[#3b2a1a]/85 leading-relaxed">
            • <strong>Cash on Delivery (COD):</strong> All orders begin in <code>pending_verification</code> and <code>unpaid_cod</code> status. Payment is collected in cash upon physical delivery.
          </p>
        </div>

        <div className="craft-card p-6 space-y-2">
          <h2 className="font-editorial text-2xl text-[#3b2a1a]">
            Returns & Handmade Variations
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
