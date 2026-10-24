import React from 'react';
import { Package, ShoppingBag, ShieldCheck, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { OrderRecord, Product } from '../../types/heritage';
import { AppUserProfile } from '../../lib/firebaseAuth';

interface AdminDashboardProps {
  products: Product[];
  orders: OrderRecord[];
  verifiedLiveCount: number;
  userProfile: AppUserProfile;
  onNavigateSubpath: (subpath: 'products' | 'orders') => void;
  onAdminSeedCatalog: () => Promise<void>;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  products,
  orders,
  verifiedLiveCount,
  userProfile,
  onNavigateSubpath,
  onAdminSeedCatalog,
}) => {
  const [isSeeding, setIsSeeding] = React.useState(false);

  const pendingCodOrders = orders.filter((o) => o.orderStatus === 'pending_verification');
  const confirmedOrders = orders.filter((o) => o.orderStatus === 'confirmed' || o.orderStatus === 'packed' || o.orderStatus === 'shipped');
  const deliveredOrders = orders.filter((o) => o.orderStatus === 'delivered');

  const totalLiveInventoryStock = products.reduce((acc, p) => acc + (p.stockCount ?? 0), 0);

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      await onAdminSeedCatalog();
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="craft-card p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-[#8a4b2a] font-bold">
            <span>Verified Crafts</span>
            <Package className="w-4 h-4 text-[#5d7a4a]" />
          </div>
          <div className="font-editorial text-3xl text-[#3b2a1a]">
            {verifiedLiveCount} / {products.length}
          </div>
          <p className="text-[11px] text-[#3b2a1a]/70">
            {verifiedLiveCount === products.length
              ? 'All 12 crafts verified in live Firestore'
              : `${products.length - verifiedLiveCount} item(s) pending Firestore publication`}
          </p>
        </div>

        <div className="craft-card p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-[#8a4b2a] font-bold">
            <span>Available Stock</span>
            <ShieldCheck className="w-4 h-4 text-[#8a4b2a]" />
          </div>
          <div className="font-editorial text-3xl text-[#3b2a1a]">
            {totalLiveInventoryStock} units
          </div>
          <p className="text-[11px] text-[#3b2a1a]/70">
            Across active batch variants
          </p>
        </div>

        <div className="craft-card p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-[#8a4b2a] font-bold">
            <span>Pending COD Verification</span>
            <AlertTriangle className="w-4 h-4 text-[#b5502d]" />
          </div>
          <div className="font-editorial text-3xl text-[#b5502d]">
            {pendingCodOrders.length}
          </div>
          <p className="text-[11px] text-[#3b2a1a]/70">
            Requires phone confirmation before dispatch
          </p>
        </div>

        <div className="craft-card p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-[#8a4b2a] font-bold">
            <span>In Transit & Delivered</span>
            <ShoppingBag className="w-4 h-4 text-[#5d7a4a]" />
          </div>
          <div className="font-editorial text-3xl text-[#5d7a4a]">
            {confirmedOrders.length + deliveredOrders.length}
          </div>
          <p className="text-[11px] text-[#3b2a1a]/70">
            {deliveredOrders.length} COD payments collected
          </p>
        </div>
      </div>

      {/* Catalog Seed Banner if incomplete */}
      {verifiedLiveCount < products.length && (
        <div className="bg-[#f6ecd4] border-2 border-[#5d7a4a] p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="font-editorial text-2xl text-[#3b2a1a] flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#5d7a4a]" />
              <span>One-Click Catalog Synchronization</span>
            </h2>
            <p className="text-xs text-[#3b2a1a]/85 max-w-2xl leading-relaxed">
              Populate and verify all 12 heritage products, variants, SKUs, and stock quantities into Cloud Firestore so customers can immediately place verified Cash on Delivery (COD) orders.
            </p>
          </div>
          <button
            type="button"
            disabled={isSeeding}
            onClick={handleSeed}
            className="craft-btn px-5 py-2.5 text-xs whitespace-nowrap cursor-pointer shrink-0"
          >
            {isSeeding ? 'Publishing to Firestore...' : 'Publish & Verify All Crafts'}
          </button>
        </div>
      )}

      {/* Quick Navigation Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#f6ecd4] border border-[#8a4b2a] p-6 space-y-4">
          <h3 className="font-editorial text-2xl text-[#3b2a1a]">
            Catalog & Live Inventory
          </h3>
          <p className="text-xs text-[#3b2a1a]/80 leading-relaxed">
            Manage variant SKUs, set real small-batch stock counts, update prices in integer BDT, and enforce live availability.
          </p>
          <button
            type="button"
            onClick={() => onNavigateSubpath('products')}
            className="craft-btn px-4 py-2 text-xs inline-flex items-center gap-2 cursor-pointer"
          >
            <span>Manage Catalog & Stock</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="bg-[#f6ecd4] border border-[#8a4b2a] p-6 space-y-4">
          <h3 className="font-editorial text-2xl text-[#3b2a1a]">
            Orders & Cash on Delivery (COD)
          </h3>
          <p className="text-xs text-[#3b2a1a]/80 leading-relaxed">
            Review pending Bangladesh orders, verify recipient phone numbers, transition lifecycle states (`pending_verification` → `confirmed` → `delivered`), and record payment collection.
          </p>
          <button
            type="button"
            onClick={() => onNavigateSubpath('orders')}
            className="craft-btn px-4 py-2 text-xs inline-flex items-center gap-2 cursor-pointer"
          >
            <span>Manage Customer Orders ({orders.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
