import React, { useState, useMemo } from 'react';
import { Search, SlidersHorizontal, RotateCcw, X, CheckCircle2 } from 'lucide-react';
import { CraftCategory, LanguageCode, MarketCode, Product, RegionName } from '../types/heritage';
import { tText, UI_STRINGS } from '../data/translations';
import { ARTISANS_DATA, CRAFT_CATEGORIES, REGIONS_LIST } from '../data/catalogData';
import { filterAndSortProducts } from '../lib/firebaseProducts';
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
  verifiedLiveCount?: number;
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
  verifiedLiveCount = 0,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<CraftCategory>(initialCategory);
  const [selectedRegion, setSelectedRegion] = useState<RegionName>('All');
  const [selectedUseCase, setSelectedUseCase] = useState<string>('All');
  const [selectedArtisanId, setSelectedArtisanId] = useState<string>('All');
  const [onlyIndigenous, setOnlyIndigenous] = useState<boolean>(false);
  const [onlyAvailable, setOnlyAvailable] = useState<boolean>(false);
  const [onlyVerifiedLive, setOnlyVerifiedLive] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'artisan'>('featured');

  React.useEffect(() => {
    setSelectedCategory(initialCategory);
  }, [initialCategory]);

  const filteredProducts = useMemo(() => {
    return filterAndSortProducts(products, {
      searchQuery,
      category: selectedCategory,
      region: selectedRegion,
      useCase: selectedUseCase,
      artisanId: selectedArtisanId === 'All' ? null : selectedArtisanId,
      availabilityOnly: onlyAvailable,
      verifiedOnly: onlyVerifiedLive,
      indigenousOnly: onlyIndigenous,
      sortBy,
    });
  }, [
    products,
    searchQuery,
    selectedCategory,
    selectedRegion,
    selectedUseCase,
    selectedArtisanId,
    onlyAvailable,
    onlyVerifiedLive,
    onlyIndigenous,
    sortBy,
  ]);

  const activeFilters: Array<{ key: string; label: string; onClear: () => void }> = [];
  if (searchQuery.trim()) {
    activeFilters.push({
      key: 'search',
      label: `Search: "${searchQuery.trim()}"`,
      onClear: () => onSearchChange(''),
    });
  }
  if (selectedCategory !== 'All') {
    activeFilters.push({
      key: 'category',
      label: `Craft: ${selectedCategory}`,
      onClear: () => setSelectedCategory('All'),
    });
  }
  if (selectedRegion !== 'All') {
    activeFilters.push({
      key: 'region',
      label: `Region: ${selectedRegion}`,
      onClear: () => setSelectedRegion('All'),
    });
  }
  if (selectedArtisanId !== 'All') {
    const artisanObj = ARTISANS_DATA.find((a) => a.id === selectedArtisanId);
    activeFilters.push({
      key: 'artisan',
      label: `Maker: ${artisanObj ? artisanObj.name.en : selectedArtisanId}`,
      onClear: () => setSelectedArtisanId('All'),
    });
  }
  if (selectedUseCase !== 'All') {
    activeFilters.push({
      key: 'usecase',
      label: `Use: ${selectedUseCase}`,
      onClear: () => setSelectedUseCase('All'),
    });
  }
  if (onlyAvailable) {
    activeFilters.push({
      key: 'available',
      label: 'In-Stock Only',
      onClear: () => setOnlyAvailable(false),
    });
  }
  if (onlyVerifiedLive) {
    activeFilters.push({
      key: 'verified',
      label: 'Verified Live Only',
      onClear: () => setOnlyVerifiedLive(false),
    });
  }
  if (onlyIndigenous) {
    activeFilters.push({
      key: 'indigenous',
      label: 'Indigenous Crafts Only',
      onClear: () => setOnlyIndigenous(false),
    });
  }

  const resetAllFilters = () => {
    setSelectedCategory('All');
    setSelectedRegion('All');
    setSelectedUseCase('All');
    setSelectedArtisanId('All');
    setOnlyIndigenous(false);
    setOnlyAvailable(false);
    setOnlyVerifiedLive(false);
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
          Showing <strong className="font-tabular">{filteredProducts.length}</strong> of{' '}
          <strong className="font-tabular">{products.length}</strong> handmade pieces ·{' '}
          {verifiedLiveCount > 0 ? (
            <span className="text-[#5d7a4a] font-bold">
              {verifiedLiveCount} Verified Live in Bangladesh
            </span>
          ) : (
            <span>Authentic Heritage Collection</span>
          )}
        </p>
      </div>

      {/* Category Filter Chips */}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
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
            <label htmlFor="artisan-filter" className="sr-only">
              Filter by Artisan / Maker
            </label>
            <select
              id="artisan-filter"
              value={selectedArtisanId}
              onChange={(e) => setSelectedArtisanId(e.target.value)}
              className="w-full px-3 py-2 bg-[#f6ecd4] border border-[#8a4b2a]/50 text-xs text-[#3b2a1a]"
            >
              <option value="All">All Artisans & Collectives</option>
              {ARTISANS_DATA.map((art) => (
                <option key={art.id} value={art.id}>
                  {tText(art.name, language)}
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
              onChange={(e) =>
                setSortBy(e.target.value as 'featured' | 'price-asc' | 'price-desc' | 'artisan')
              }
              className="w-full px-3 py-2 bg-[#f6ecd4] border border-[#8a4b2a]/50 text-xs text-[#3b2a1a]"
            >
              <option value="featured">Sort: Curated Heritage Order</option>
              <option value="price-asc">Sort: Price (Low to High)</option>
              <option value="price-desc">Sort: Price (High to Low)</option>
              <option value="artisan">Sort: Artisan Name (A–Z)</option>
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
                checked={onlyAvailable}
                onChange={(e) => setOnlyAvailable(e.target.checked)}
                className="accent-[#b5502d]"
              />
              <span>In-Stock Only</span>
            </label>

            <label className="inline-flex items-center gap-2 cursor-pointer text-[#3b2a1a]">
              <input
                type="checkbox"
                checked={onlyVerifiedLive}
                onChange={(e) => setOnlyVerifiedLive(e.target.checked)}
                className="accent-[#5d7a4a]"
              />
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#5d7a4a]" />
                <span>Verified Live Inventory Only</span>
              </span>
            </label>

            <label className="inline-flex items-center gap-2 cursor-pointer text-[#3b2a1a]">
              <input
                type="checkbox"
                checked={onlyIndigenous}
                onChange={(e) => setOnlyIndigenous(e.target.checked)}
                className="accent-[#b5502d]"
              />
              <span>Indigenous & Ethnic-Community Crafts Only</span>
            </label>
          </div>

          <button
            type="button"
            onClick={resetAllFilters}
            className="inline-flex items-center gap-1 text-[#b5502d] hover:underline font-bold cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear All Filters</span>
          </button>
        </div>

        {/* Active Filter Indicators */}
        {activeFilters.length > 0 && (
          <div className="pt-2 border-t border-dashed border-[#8a4b2a]/30 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-[#3b2a1a]/75 font-bold">Active Filters:</span>
            {activeFilters.map((af) => (
              <button
                key={af.key}
                type="button"
                onClick={af.onClear}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#f6ecd4] border border-[#8a4b2a] text-[#3b2a1a] hover:bg-[#b5502d] hover:text-[#fff3dc] transition-colors cursor-pointer"
              >
                <span>{af.label}</span>
                <X className="w-3 h-3" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Product Grid or Empty State */}
      {filteredProducts.length === 0 ? (
        <div className="bg-[#f6ecd4] border-2 border-dashed border-[#8a4b2a] p-12 text-center space-y-4">
          <h2 className="font-editorial text-3xl text-[#3b2a1a]">
            No crafts match your current filter selection
          </h2>
          <p className="text-sm text-[#3b2a1a]/75 max-w-md mx-auto">
            Try clearing your search term, unchecking “Verified Live Inventory Only”, or selecting “All Crafts” to explore handmade pieces across Bangladesh and West Bengal.
          </p>
          <button
            type="button"
            onClick={resetAllFilters}
            className="craft-btn px-5 py-2.5 text-xs rounded-[3px] cursor-pointer"
          >
            Clear All Filters & Show All Crafts
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
