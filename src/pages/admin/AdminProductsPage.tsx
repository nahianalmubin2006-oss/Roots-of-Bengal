import React, { useState } from 'react';
import { RefreshCw, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Product } from '../../types/heritage';
import { adminUpdateVariantStockAndPrice } from '../../lib/firebaseProducts';

interface AdminProductsPageProps {
  products: Product[];
  verifiedLiveCount: number;
  onAdminSeedCatalog: () => Promise<void>;
  onTriggerToast: (msg: string) => void;
}

export const AdminProductsPage: React.FC<AdminProductsPageProps> = ({
  products,
  verifiedLiveCount,
  onAdminSeedCatalog,
  onTriggerToast,
}) => {
  const [selectedProductId, setSelectedProductId] = useState<number>(1);
  const [selectedVariantId, setSelectedVariantId] = useState<string>(products[0]?.variants[0]?.id || 'terracotta');
  const [stockInput, setStockInput] = useState<number>(5);
  const [priceInput, setPriceInput] = useState<number>(4800);
  const [isSaving, setIsSaving] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  const selectedProduct = products.find((p) => p.id === selectedProductId) || products[0];

  const handleSelectProduct = (pid: number) => {
    setSelectedProductId(pid);
    const prod = products.find((p) => p.id === pid);
    if (prod && prod.variants[0]) {
      setSelectedVariantId(prod.variants[0].id);
      setStockInput(prod.variants[0].stockCount ?? 5);
      setPriceInput(prod.variants[0].priceBDT ?? prod.priceBDT);
    }
  };

  const handleSelectVariant = (vid: string) => {
    setSelectedVariantId(vid);
    const v = selectedProduct?.variants.find((item) => item.id === vid);
    if (v) {
      setStockInput(v.stockCount ?? 5);
      setPriceInput(v.priceBDT ?? selectedProduct.priceBDT);
    }
  };

  const handleSaveVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await adminUpdateVariantStockAndPrice(
        selectedProductId,
        selectedVariantId,
        stockInput,
        priceInput
      );
      onTriggerToast(`Updated "${selectedProduct.name.en}" variant in live Firestore.`);
    } catch (err) {
      onTriggerToast(err instanceof Error ? err.message : 'Update failed.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSeedAll = async () => {
    setIsSeeding(true);
    try {
      await onAdminSeedCatalog();
      onTriggerToast('Published all 12 crafts to live Firestore!');
    } catch (err) {
      onTriggerToast(err instanceof Error ? err.message : 'Seed failed.');
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dashed border-[#8a4b2a] pb-4">
        <div>
          <h1 className="font-editorial text-3xl text-[#3b2a1a]">
            Catalog & Inventory Management
          </h1>
          <p className="text-xs text-[#3b2a1a]/75 mt-0.5">
            {verifiedLiveCount} of {products.length} crafts verified in live Firestore
          </p>
        </div>
        <button
          type="button"
          disabled={isSeeding}
          onClick={handleSeedAll}
          className="craft-btn px-4 py-2 text-xs inline-flex items-center gap-2 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSeeding ? 'animate-spin' : ''}`} />
          <span>{isSeeding ? 'Seeding...' : 'Seed & Verify All 12 Crafts in Firestore'}</span>
        </button>
      </div>

      {/* Variant Editor Box */}
      <div className="bg-[#e4d3ad] border-2 border-[#8a4b2a] p-6 space-y-4">
        <h2 className="font-editorial text-2xl text-[#3b2a1a] flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[#5d7a4a]" />
          <span>Quick Stock & Price Editor</span>
        </h2>

        <form onSubmit={handleSaveVariant} className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end text-xs">
          <div className="sm:col-span-2">
            <label className="block font-bold text-[#3b2a1a] mb-1">Product</label>
            <select
              value={selectedProductId}
              onChange={(e) => handleSelectProduct(Number(e.target.value))}
              className="w-full px-3 py-2 bg-[#f6ecd4] border border-[#8a4b2a]"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  #{p.id} · {p.name.en} ({p.isDemoData ? 'Demo Preview' : 'Verified Live'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-[#3b2a1a] mb-1">Variant</label>
            <select
              value={selectedVariantId}
              onChange={(e) => handleSelectVariant(e.target.value)}
              className="w-full px-3 py-2 bg-[#f6ecd4] border border-[#8a4b2a]"
            >
              {selectedProduct?.variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label.en} (Stock: {v.stockCount ?? 0})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-[#3b2a1a] mb-1">Stock & Price (৳ BDT)</label>
            <div className="grid grid-cols-2 gap-1.5">
              <input
                type="number"
                min={0}
                max={5000}
                value={stockInput}
                onChange={(e) => setStockInput(Number(e.target.value))}
                className="w-full px-2 py-2 bg-[#f6ecd4] border border-[#8a4b2a]"
                title="Stock Count"
              />
              <input
                type="number"
                min={50}
                max={500000}
                value={priceInput}
                onChange={(e) => setPriceInput(Number(e.target.value))}
                className="w-full px-2 py-2 bg-[#f6ecd4] border border-[#8a4b2a]"
                title="Price in BDT"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isSaving}
              className="craft-btn w-full py-2 px-3 text-xs cursor-pointer"
            >
              {isSaving ? 'Updating...' : 'Save to Firestore'}
            </button>
          </div>
        </form>
      </div>

      {/* Catalog Table */}
      <div className="bg-[#f6ecd4] border border-[#8a4b2a] overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#e4d3ad] border-b border-[#8a4b2a] font-bold text-[#3b2a1a]">
              <th className="p-3">ID</th>
              <th className="p-3">Craft Name</th>
              <th className="p-3">Category</th>
              <th className="p-3">Region</th>
              <th className="p-3">Price (BDT)</th>
              <th className="p-3">Total Stock</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#8a4b2a]/30">
            {products.map((p) => {
              const isVerified = !p.isDemoData && p.isPublished && p.verificationStatus === 'verified';
              return (
                <tr key={p.id} className="hover:bg-[#efe2c6]/60">
                  <td className="p-3 font-tabular font-bold">#{p.id}</td>
                  <td className="p-3">
                    <strong className="block text-[#3b2a1a]">{p.name.en}</strong>
                    <span className="text-[11px] text-[#3b2a1a]/70">{p.name.bn}</span>
                  </td>
                  <td className="p-3">{p.category}</td>
                  <td className="p-3">{p.regionTag}</td>
                  <td className="p-3 font-tabular font-bold text-[#b5502d]">
                    ৳{p.priceBDT.toLocaleString()}
                  </td>
                  <td className="p-3 font-tabular">
                    {p.stockCount ?? 0} units
                  </td>
                  <td className="p-3">
                    {isVerified ? (
                      <span className="inline-flex items-center gap-1 font-bold text-[#5d7a4a]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Verified Live</span>
                      </span>
                    ) : (
                      <span className="text-[#8a4b2a]">Demo Preview</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
