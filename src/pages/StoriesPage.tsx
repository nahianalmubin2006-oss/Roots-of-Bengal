import React, { useState } from 'react';
import { ArrowLeft, BookOpen, Clock } from 'lucide-react';
import {
  LanguageCode,
  MarketCode,
  Product,
  StoryArticle,
} from '../types/heritage';
import { tText } from '../data/translations';
import { CraftArtwork } from '../components/CraftArtwork';
import { ProductCard } from '../components/ProductCard';

interface StoriesPageProps {
  language: LanguageCode;
  market: MarketCode;
  stories: StoryArticle[];
  products: Product[];
  activeStoryId: string | null;
  wishlist: number[];
  onSelectStory: (storyId: string | null) => void;
  onSelectProduct: (productId: number) => void;
  onToggleWishlist: (productId: number, e: React.MouseEvent) => void;
  onQuickView: (product: Product, e: React.MouseEvent) => void;
  onAddToCart: (productId: number, variantId: string, quantity: number, e: React.MouseEvent) => void;
}

export const StoriesPage: React.FC<StoriesPageProps> = ({
  language,
  market,
  stories,
  products,
  activeStoryId,
  wishlist,
  onSelectStory,
  onSelectProduct,
  onToggleWishlist,
  onQuickView,
  onAddToCart,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const activeStory = stories.find((s) => s.id === activeStoryId);

  if (activeStory) {
    const relatedProducts = products.filter((p) => activeStory.relatedProductIds.includes(p.id));

    return (
      <article className="max-w-[980px] mx-auto px-4 sm:px-8 py-10 sm:py-12 space-y-10">
        <button
          type="button"
          onClick={() => onSelectStory(null)}
          className="inline-flex items-center gap-2 text-xs font-bold text-[#8a4b2a] hover:text-[#b5502d] underline cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Cultural Journal</span>
        </button>

        <header className="space-y-3 border-b border-dashed border-[#8a4b2a] pb-6">
          <div className="flex items-center flex-wrap gap-2 text-xs text-[#b5502d] font-bold">
            <span>{activeStory.category}</span>
            <span aria-hidden="true">·</span>
            <span>{tText(activeStory.publishedSeason, language)}</span>
            <span aria-hidden="true">·</span>
            <span className="font-tabular inline-flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {activeStory.readingTimeMinutes} min read
            </span>
          </div>

          <h1 className="font-editorial text-3xl sm:text-5xl text-[#3b2a1a] leading-tight">
            {tText(activeStory.title, language)}
          </h1>

          <p className="text-base sm:text-lg text-[#3b2a1a]/85 italic">
            {tText(activeStory.subtitle, language)}
          </p>

          <p className="text-xs text-[#3b2a1a]/70">
            Attribution: {tText(activeStory.attribution, language)}
          </p>
        </header>

        <div className="craft-frame aspect-16/9 w-full">
          <CraftArtwork
            artworkIndex={activeStory.artworkIndex}
            className="w-full h-full"
            showArchivalCaption
            captionText="Editorial Heritage Study · Roots of Bengal Archive"
          />
        </div>

        <div className="max-w-[70ch] mx-auto space-y-6 text-base sm:text-lg text-[#3b2a1a]/90 leading-relaxed">
          {activeStory.bodyParagraphs.map((para, idx) => (
            <React.Fragment key={idx}>
              <p>{tText(para, language)}</p>
              {idx === 0 && (
                <blockquote className="my-8 p-6 bg-[#f6ecd4] border-2 border-[#8a4b2a] italic text-xl text-[#b5502d] font-editorial">
                  {tText(activeStory.pullQuote, language)}
                </blockquote>
              )}
            </React.Fragment>
          ))}
        </div>

        {relatedProducts.length > 0 && (
          <section className="pt-10 border-t border-dashed border-[#8a4b2a] space-y-6">
            <div className="text-center section-ornament">
              <h2 className="font-editorial text-3xl text-[#3b2a1a]">
                Crafts Connected to This Story
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {relatedProducts.map((product) => (
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
          </section>
        )}
      </article>
    );
  }

  const categories = [
    'All',
    'Folk Music & Instruments',
    'Traditional Clothing & Textiles',
    'Indigenous Communities & Living Traditions',
  ];

  const filteredStories =
    selectedCategory === 'All'
      ? stories
      : stories.filter((s) => s.category === selectedCategory);

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-8 py-10 sm:py-12 space-y-10">
      <div className="text-center section-ornament">
        <h1 className="font-editorial text-4xl sm:text-[44px] text-[#3b2a1a]">
          {language === 'bn'
            ? 'বাংলার লোকসঙ্গীত, বয়নশিল্প ও জনপদের আখ্যান'
            : 'Cultural Journal & Folklore'}
        </h1>
        <p className="text-sm text-[#3b2a1a]/75 max-w-2xl mx-auto mt-1">
          {language === 'bn'
            ? 'আমাদের প্রতিটি পণ্যের পেছনে রয়েছে শতাব্দীর পুরাতন লোকজ দর্শন ও কারিগরদের জীবনের গল্প।'
            : 'Essays on the Baul Ektara and Alpana geometry, Nakshi Kantha oral history, and indigenous weaving lineages.'}
        </p>
      </div>

      {/* Category Filter Chips */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 text-[13px] border border-[#8a4b2a] transition-colors cursor-pointer ${
              selectedCategory === cat
                ? 'bg-[#8a4b2a] text-[#fff3dc]'
                : 'bg-[#f6ecd4] text-[#3b2a1a] hover:bg-[#e4d3ad]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Featured Lead Story */}
      {filteredStories.length > 0 && (
        <div
          onClick={() => onSelectStory(filteredStories[0].id)}
          className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-[#e4d3ad] border-2 border-[#8a4b2a] p-6 items-center cursor-pointer group"
        >
          <div className="lg:col-span-6 craft-frame aspect-16/9">
            <CraftArtwork artworkIndex={filteredStories[0].artworkIndex} className="w-full h-full" />
          </div>
          <div className="lg:col-span-6 space-y-3">
            <div className="flex items-center gap-2 text-xs text-[#b5502d] font-bold">
              <span>Featured Essay</span>
              <span aria-hidden="true">·</span>
              <span>{filteredStories[0].category}</span>
              <span aria-hidden="true">·</span>
              <span className="font-tabular">{filteredStories[0].readingTimeMinutes} min read</span>
            </div>
            <h2 className="font-editorial text-3xl sm:text-4xl text-[#3b2a1a] group-hover:text-[#b5502d] transition-colors">
              {tText(filteredStories[0].title, language)}
            </h2>
            <p className="text-sm text-[#3b2a1a]/85 leading-relaxed">
              {tText(filteredStories[0].excerpt, language)}
            </p>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8a4b2a] underline">
              <BookOpen className="w-4 h-4" />
              <span>Read Full Essay</span>
            </span>
          </div>
        </div>
      )}

      {/* All Journal Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {filteredStories.map((story) => (
          <article
            key={story.id}
            onClick={() => onSelectStory(story.id)}
            className="craft-card p-3.5 flex flex-col justify-between cursor-pointer group"
          >
            <div>
              <div className="aspect-4/3 border border-[#8a4b2a]/40 overflow-hidden">
                <CraftArtwork artworkIndex={story.artworkIndex} className="w-full h-full" />
              </div>
              <div className="pt-3.5 space-y-2">
                <div className="text-xs text-[#8a4b2a] flex items-center gap-1.5 flex-wrap">
                  <span>{story.category}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-tabular">{story.readingTimeMinutes} min read</span>
                </div>
                <h3 className="font-editorial text-2xl text-[#3b2a1a] group-hover:text-[#b5502d] transition-colors">
                  {tText(story.title, language)}
                </h3>
                <p className="text-xs text-[#3b2a1a]/80 leading-relaxed">
                  {tText(story.excerpt, language)}
                </p>
              </div>
            </div>

            <div className="pt-3 mt-3 border-t border-dashed border-[#8a4b2a]/40 text-xs font-bold text-[#b5502d] underline">
              Open Essay →
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};
