import React, { useState, useMemo } from 'react';
import { Search, SlidersHorizontal, RotateCcw } from 'lucide-react';
import { CraftCategory, LanguageCode, MarketCode, Product, RegionName } from '../types/heritage';
import { tText, UI_STRINGS } from '../data/translations';
import { CRAFT_CATEGORIES, REGIONS_LIST } from '../data/catalogData';
import { getUnitPriceForMarket } from '../utils/currency';
import { ProductCard } from '../components/ProductCard';

interface ShopPageProps {
  language: LanguageCode;
  market: MarketCode;
  products: Product[];
  initialCategory: CraftCategory;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  wishlist: number[];
  onSelectProduct: (productId: number) => void;
  onToggleWishlist: (productId: number, e: React.MouseEvent) => void;
  onQuickView: (product: Product, e: React.MouseEvent) => void;
  onAddToCart: (productId: number, variantId: string, quantity: number, e: React.MouseEvent) => void;
}

export const ShopPage: React.FC<ShopPageProps> = ({
  language,
  market,
  products,
  initialCategory,
  searchQuery,
  onSearchChange,
  wishlist,
  onSelectProduct,
  onToggleWishlist,
  onQuickView,
  onAddToCart,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<CraftCategory>(initialCategory);
  const [selectedRegion, setSelectedRegion] = useState<RegionName>('All');
  const [selectedUseCase, setSelectedUseCase] = useState<string>('All');
  const [onlyIndigenous, setOnlyIndigenous] = useState<boolean>(false);
  const [onlyMarketAvailable, setOnlyMarketAvailable] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc'>('featured');

  React.useEffect(() => {
    setSelectedCategory(initialCategory);
  }, [initialCategory]);

  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        if (selectedCategory !== 'All' && p.category !== selectedCategory) return false;
        if (selectedRegion !== 'All' && p.regionTag !== selectedRegion) return false;
        if (selectedUseCase !== 'All' && p.useCase !== selectedUseCase) return false;
        if (onlyIndigenous && !p.isIndigenousCommunityCraft) return false;
        if (onlyMarketAvailable && !p.availableMarkets.includes(market)) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchEn = p.name.en.toLowerCase().includes(q) || p.shortDescription.en.toLowerCase().includes(q);
          const matchBn = p.name.bn.includes(q) || p.shortDescription.bn.includes(q);
          const matchVillage = p.village.en.toLowerCase().includes(q) || p.artisanName.en.toLowerCase().includes(q);
          const matchCat = p.category.toLowerCase().includes(q);
          return matchEn || matchBn || matchVillage || matchCat;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') {
          return getUnitPriceForMarket(a, market) - getUnitPriceForMarket(b, market);
        }
        if (sortBy === 'price-desc') {
          return getUnitPriceForMarket(b, market) - getUnitPriceForMarket(a, market);
        }
        return a.id - b.id;
      });
  }, [
    products,
    selectedCategory,
    selectedRegion,
    selectedUseCase,
    onlyIndigenous,
    onlyMarketAvailable,
    searchQuery,
    sortBy,
    market,
  ]);

  const resetAllFilters = () => {
    setSelectedCategory('All');
    setSelectedRegion('All');
    setSelectedUseCase('All');
    setOnlyIndigenous(false);
    setOnlyMarketAvailable(false);
    onSearchChange('');
    setSortBy('featured');
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-8 py-10 sm:py-12 space-y-8">
      {/* Centered Crafty Section Heading */}
      <div className="text-center section-ornament">
        <h1 className="font-editorial text-4xl sm:text-[44px] text-[#3b2a1a]">
          {language === 'bn' ? 'শিল্পসম্ভার ও লোকজ সংগ্রহ' : 'Shop by Craft'}
        </h1>
        <p className="text-sm text-[#3b2a1a]/75 mt-1">
          {filteredProducts.length} handmade pieces · Demonstration Catalogue
        </p>
      </div>

      {/* Category Filter Chips (.chips from Prototype) */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {CRAFT_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3.5 py-1.5 text-[13px] border border-[#8a4b2a] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              selectedCategory === cat.id
                ? 'bg-[#8a4b2a] text-[#fff3dc]'
                : 'bg-[#f6ecd4] text-[#3b2a1a] hover:bg-[#e4d3ad]'
            }`}
          >
            {tText(cat.label, language)}
          </button>
        ))}
      </div>

      {/* Multi-Attribute Filter & Search Toolbar */}
      <div className="bg-[#e4d3ad] border border-[#8a4b2a]/50 p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[#8a4b2a] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={tText(UI_STRINGS.searchPlaceholder, language)}
              className="w-full pl-9 pr-3 py-2 bg-[#f6ecd4] border border-[#8a4b2a]/50 text-xs text-[#3b2a1a] focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="region-filter" className="sr-only">
              Filter by Region
            </label>
            <select
              id="region-filter"
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value as RegionName)}
              className="w-full px-3 py-2 bg-[#f6ecd4] border border-[#8a4b2a]/50 text-xs text-[#3b2a1a]"
            >
              {REGIONS_LIST.map((reg) => (
                <option key={reg} value={reg}>
                  {reg === 'All' ? 'All Regions (BD & WB)' : reg}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="usecase-filter" className="sr-only">
              Filter by Use
            </label>
            <select
              id="usecase-filter"
              value={selectedUseCase}
              onChange={(e) => setSelectedUseCase(e.target.value)}
              className="w-full px-3 py-2 bg-[#f6ecd4] border border-[#8a4b2a]/50 text-xs text-[#3b2a1a]"
            >
              <option value="All">All Uses & Contexts</option>
              <option value="Textiles & Apparel">Textiles & Apparel</option>
              <option value="Home & Living">Home & Living</option>
              <option value="Everyday Utility">Everyday Utility</option>
              <option value="Folk Instruments">Traditional Folk Instruments</option>
              <option value="Jewelry & Personal">Jewelry & Personal</option>
            </select>
          </div>

          <div>
            <label htmlFor="sort-select" className="sr-only">
              Sort products
            </label>
            <select
              id="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'featured' | 'price-asc' | 'price-desc')}
              className="w-full px-3 py-2 bg-[#f6ecd4] border border-[#8a4b2a]/50 text-xs text-[#3b2a1a]"
            >
              <option value="featured">Sort: Curated Heritage Order</option>
              <option value="price-asc">Sort: Price (Low to High)</option>
              <option value="price-desc">Sort: Price (High to Low)</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-dashed border-[#8a4b2a]/40 text-xs">
          <div className="flex flex-wrap items-center gap-5">
            <span className="inline-flex items-center gap-1.5 text-[#8a4b2a] font-bold">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Refine:</span>
            </span>

            <label className="inline-flex items-center gap-2 cursor-pointer text-[#3b2a1a]">
              <input
                type="checkbox"
                checked={onlyIndigenous}
                onChange={(e) => setOnlyIndigenous(e.target.checked)}
                className="accent-[#b5502d]"
              />
              <span>Indigenous & Ethnic-Community Crafts Only</span>
            </label>

            <label className="inline-flex items-center gap-2 cursor-pointer text-[#3b2a1a]">
              <input
                type="checkbox"
                checked={onlyMarketAvailable}
                onChange={(e) => setOnlyMarketAvailable(e.target.checked)}
                className="accent-[#b5502d]"
              />
              <span>Available for {market === 'BD' ? 'Bangladesh' : market === 'IN' ? 'India' : 'International'} Shipping</span>
            </label>
          </div>

          <button
            type="button"
            onClick={resetAllFilters}
            className="inline-flex items-center gap-1 text-[#b5502d] hover:underline font-bold cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Filters</span>
          </button>
        </div>
      </div>

      {/* Product Grid or Empty State */}
      {filteredProducts.length === 0 ? (
        <div className="bg-[#f6ecd4] border-2 border-dashed border-[#8a4b2a] p-12 text-center space-y-4">
          <h2 className="font-editorial text-3xl text-[#3b2a1a]">
            No crafts match your current filter selection
          </h2>
          <p className="text-sm text-[#3b2a1a]/75 max-w-md mx-auto">
            Try clearing your search term or selecting “All Crafts” to explore handmade pieces across Bangladesh and West Bengal.
          </p>
          <button
            type="button"
            onClick={resetAllFilters}
            className="craft-btn px-5 py-2.5 text-xs rounded-[3px] cursor-pointer"
          >
            Show All 12 Heritage Crafts
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              language={language}
              market={market}
              isWishlisted={wishlist.includes(product.id)}
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
};
