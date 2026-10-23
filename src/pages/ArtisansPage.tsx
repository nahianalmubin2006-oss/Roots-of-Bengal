import React, { useState } from 'react';
import { MapPin, ShieldAlert } from 'lucide-react';
import {
  ArtisanProfile,
  LanguageCode,
  MarketCode,
  Product,
} from '../types/heritage';
import { tText } from '../data/translations';
import { CraftArtwork } from '../components/CraftArtwork';
import { ProductCard } from '../components/ProductCard';

interface ArtisansPageProps {
  language: LanguageCode;
  market: MarketCode;
  artisans: ArtisanProfile[];
  products: Product[];
  wishlist: number[];
  onSelectProduct: (productId: number) => void;
  onToggleWishlist: (productId: number, e: React.MouseEvent) => void;
  onQuickView: (product: Product, e: React.MouseEvent) => void;
  onAddToCart: (productId: number, variantId: string, quantity: number, e: React.MouseEvent) => void;
}

export const ArtisansPage: React.FC<ArtisansPageProps> = ({
  language,
  market,
  artisans,
  products,
  wishlist,
  onSelectProduct,
  onToggleWishlist,
  onQuickView,
  onAddToCart,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'indigenous' | 'bd' | 'in'>('all');
  const [selectedArtisanId, setSelectedArtisanId] = useState<string>(artisans[0]?.id || 'rahima-begum');

  const visibleArtisans = artisans.filter((a) => {
    if (filterMode === 'indigenous') return Boolean(a.isIndigenousCollective);
    if (filterMode === 'bd') return a.country === 'Bangladesh';
    if (filterMode === 'in') return a.country === 'India (West Bengal)';
    return true;
  });

  const activeArtisan =
    visibleArtisans.find((a) => a.id === selectedArtisanId) || visibleArtisans[0] || artisans[0];

  const artisanProducts = products.filter((p) => p.artisanId === activeArtisan.id);

  const artworkMap: Record<ArtisanProfile['artworkType'], number> = {
    kantha_loom: 0,
    jamdani_weave: 1,
    terracotta_kiln: 2,
    cane_work: 3,
    brass_workshop: 4,
    folk_fan: 5,
    chakma_backstrap: 6,
    baul_instrument: 7,
    santal_mat: 3,
    baluchari_silk: 1,
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-8 py-10 sm:py-12 space-y-10">
      {/* Centered Crafty Heading */}
      <div className="text-center section-ornament">
        <h1 className="font-editorial text-4xl sm:text-[44px] text-[#3b2a1a]">
          {language === 'bn'
            ? 'যাঁদের হাতের ছোঁয়ায় বেঁচে আছে বাংলার ঐতিহ্য'
            : 'Our Artisans & Living Communities'}
        </h1>
        <p className="text-sm text-[#3b2a1a]/75 max-w-2xl mx-auto mt-1">
          {language === 'bn'
            ? 'জামালপুরের নকশিকাঁথা শিল্পী থেকে শুরু করে রূপগঞ্জের জামদানি তাঁতি এবং পার্বত্য চট্টগ্রাম ও বীরভূমের আদিবাসী কারুশিল্পী।'
            : 'Meet the village workshops, family looms, and indigenous collectives across Bangladesh and West Bengal.'}
        </p>
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {[
          { id: 'all', label: 'All Makers & Collectives (6)' },
          { id: 'indigenous', label: 'Indigenous Communities (Chakma & Santal)' },
          { id: 'bd', label: 'Bangladesh Lineages' },
          { id: 'in', label: 'West Bengal (India) Lineages' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilterMode(tab.id as 'all' | 'indigenous' | 'bd' | 'in')}
            className={`px-3.5 py-1.5 text-[13px] border border-[#8a4b2a] transition-colors cursor-pointer ${
              filterMode === tab.id
                ? 'bg-[#8a4b2a] text-[#fff3dc]'
                : 'bg-[#f6ecd4] text-[#3b2a1a] hover:bg-[#e4d3ad]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active Maker Feature Box (.story from Prototype) */}
      {activeArtisan && (
        <section className="bg-[#e4d3ad] border-2 border-[#8a4b2a] grid grid-cols-1 lg:grid-cols-12 items-center">
          <div className="lg:col-span-5 p-6">
            <div className="craft-frame aspect-square">
              <CraftArtwork
                artworkIndex={artworkMap[activeArtisan.artworkType]}
                className="w-full h-full"
                showArchivalCaption
                captionText="Archival Craft Motif · Demo Visual"
              />
            </div>
          </div>

          <div className="lg:col-span-7 p-6 sm:p-8 space-y-4">
            <small className="text-xs font-bold tracking-widest text-[#b5502d] uppercase block">
              {activeArtisan.craftSpecialization} · {activeArtisan.verificationStatus}
            </small>

            <h2 className="font-editorial text-3xl sm:text-[40px] text-[#3b2a1a] leading-tight">
              {tText(activeArtisan.name, language)}
            </h2>

            <div className="text-sm italic text-[#3b2a1a]/75">
              {tText(activeArtisan.location, language)}
            </div>

            <blockquote className="italic bg-[#f6ecd4] p-4 border border-[#8a4b2a]/45 text-[#3b2a1a]">
              {tText(activeArtisan.quote, language)}
            </blockquote>

            {activeArtisan.communityContext && (
              <div className="p-3.5 bg-[#f6ecd4] border border-[#5d7a4a] text-xs text-[#3b2a1a] leading-relaxed">
                {tText(activeArtisan.communityContext, language)}
              </div>
            )}

            <p className="text-sm text-[#3b2a1a]/85 leading-relaxed">
              {tText(activeArtisan.biography, language)}
            </p>

            {/* Step-by-Step Craft Process */}
            <div className="pt-2 space-y-2">
              <b className="block text-xs uppercase tracking-wider text-[#8a4b2a]">
                Documented Craft Process
              </b>
              <ol className="space-y-1.5 text-xs text-[#3b2a1a]/90">
                {activeArtisan.craftProcess.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 bg-[#f6ecd4] p-2.5 border border-[#8a4b2a]/35">
                    <span className="font-bold text-[#b5502d]">0{idx + 1}.</span>
                    <span>{tText(step, language)}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>
      )}

      {/* Associated Crafts by This Maker */}
      {artisanProducts.length > 0 && (
        <div className="space-y-6">
          <div className="text-center section-ornament">
            <h2 className="font-editorial text-3xl sm:text-4xl text-[#3b2a1a]">
              Work by {tText(activeArtisan.name, language).split('&')[0]}
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {artisanProducts.map((product) => (
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
        </div>
      )}

      {/* Maker Directory Switcher */}
      <div className="space-y-6 pt-4">
        <div className="text-center section-ornament">
          <h2 className="font-editorial text-3xl sm:text-4xl text-[#3b2a1a]">
            Explore All Makers & Collectives
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {visibleArtisans.map((artisan) => {
            const isSelected = artisan.id === activeArtisan.id;
            return (
              <button
                key={artisan.id}
                type="button"
                onClick={() => {
                  setSelectedArtisanId(artisan.id);
                  window.scrollTo({ top: 140, behavior: 'smooth' });
                }}
                className={`text-left p-5 transition-transform cursor-pointer ${
                  isSelected
                    ? 'bg-[#8a4b2a] text-[#fff3dc] border-2 border-[#3b2a1a]'
                    : 'craft-card text-[#3b2a1a]'
                }`}
              >
                <div className="space-y-1.5">
                  <div className={`text-xs ${isSelected ? 'text-[#efe2c6]' : 'text-[#b5502d] font-bold'}`}>
                    {artisan.craftSpecialization} · {artisan.country}
                  </div>
                  <h3 className="font-editorial text-2xl">
                    {tText(artisan.name, language)}
                  </h3>
                  <p className={`text-xs italic ${isSelected ? 'text-[#fff3dc]/85' : 'text-[#3b2a1a]/75'}`}>
                    {tText(artisan.title, language)}
                  </p>
                </div>

                <div
                  className={`text-xs flex items-center gap-1 pt-3 mt-3 border-t border-dashed ${
                    isSelected ? 'border-[#fff3dc]/30 text-[#fff3dc]/90' : 'border-[#8a4b2a]/35 text-[#3b2a1a]/75'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{tText(artisan.location, language)}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Data Integrity Banner */}
        <div className="p-4 bg-[#f6ecd4] border border-dashed border-[#8a4b2a] flex items-start gap-3 text-xs text-[#3b2a1a]/85">
          <ShieldAlert className="w-4 h-4 text-[#b5502d] shrink-0 mt-0.5" />
          <div>
            <strong>Data Integrity & Verification Policy:</strong> Profiles are structured demonstration records based on real regional craft traditions. Unverified financial impact percentages from early mockups have been omitted until verified with community consent.
          </div>
        </div>
      </div>
    </div>
  );
};
