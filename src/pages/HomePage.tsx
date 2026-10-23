import React, { useState } from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import {
  ArtisanProfile,
  CraftCategory,
  LanguageCode,
  MarketCode,
  PageView,
  Product,
  StoryArticle,
} from '../types/heritage';
import { tText } from '../data/translations';
import { CRAFT_CATEGORIES, SEASONAL_COLLECTION_META } from '../data/catalogData';
import { ProductCard } from '../components/ProductCard';
import { CraftArtwork } from '../components/CraftArtwork';

interface HomePageProps {
  language: LanguageCode;
  market: MarketCode;
  products: Product[];
  artisans: ArtisanProfile[];
  stories: StoryArticle[];
  wishlist: number[];
  onNavigate: (view: PageView, filterCategory?: CraftCategory) => void;
  onSelectProduct: (productId: number) => void;
  onSelectStory: (storyId: string) => void;
  onToggleWishlist: (productId: number, e: React.MouseEvent) => void;
  onQuickView: (product: Product, e: React.MouseEvent) => void;
  onAddToCart: (productId: number, variantId: string, quantity: number, e: React.MouseEvent) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  language,
  market,
  products,
  artisans,
  stories,
  wishlist,
  onNavigate,
  onSelectProduct,
  onSelectStory,
  onToggleWishlist,
  onQuickView,
  onAddToCart,
}) => {
  const [activeHeroPlate, setActiveHeroPlate] = useState<number>(0);
  const [selectedHomeCategory, setSelectedHomeCategory] = useState<CraftCategory>('All');
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);

  const heroPlates = [
    {
      artworkIndex: 0,
      title: { en: 'Jamalpur Nakshi Kantha', bn: 'জামালপুরের নকশিকাঁথা' },
      region: { en: 'Mymensingh · Running-Stitch Heirloom', bn: 'ময়মনসিংহ · সূচিশিল্প' },
      productId: 1,
    },
    {
      artworkIndex: 7,
      title: { en: 'Kushtia & Birbhum Baul Ektara', bn: 'কুষ্টিয়া ও বীরভূমের বাউল একতারা' },
      region: { en: 'Shared Bengal Oral Tradition · Gourd & Bamboo', bn: 'বাংলার বাউল ঐতিহ্য · লোকবাদ্যযন্ত্র' },
      productId: 10,
    },
    {
      artworkIndex: 1,
      title: { en: 'Rupganj Dhakai Jamdani', bn: 'রূপগঞ্জের ঢাকাই জামদানি' },
      region: { en: 'Shitalakshya Riverbank · Pit-Loom Muslin', bn: 'শীতলক্ষ্যা তীর · গর্ত-তাঁত বুনন' },
      productId: 2,
    },
  ];

  const filteredFeaturedProducts =
    selectedHomeCategory === 'All'
      ? products.slice(0, 8)
      : products.filter((p) => p.category === selectedHomeCategory).slice(0, 8);

  const indigenousProducts = products.filter((p) => p.isIndigenousCommunityCraft);
  const featuredArtisan = artisans[0];

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newsletterEmail.trim()) {
      setNewsletterSubscribed(true);
      setNewsletterEmail('');
    }
  };

  return (
    <div className="space-y-16 sm:space-y-24 pb-20">
      {/* 1. Rustic Heritage Hero Section */}
      <section className="pt-8 sm:pt-12 px-4 sm:px-8 max-w-[1200px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* Left Column: Woodblock Headline & Crafty Stamp Buttons */}
          <div className="lg:col-span-6 space-y-5">
            <p className="text-xs sm:text-sm text-[#8a4b2a] italic">
              {language === 'bn'
                ? 'ঐতিহ্যের শিকড়ে গাঁথা, প্রতিটি সৃষ্টি বলে নিজস্ব গল্প'
                : 'Rooted in Tradition · Every Piece Tells a Story'}
            </p>

            {language === 'bn' ? (
              <h1 className="font-editorial text-4xl sm:text-5xl text-[#3b2a1a] leading-tight">
                বাংলার <em className="text-[#b5502d] not-italic">মাটি ও তাঁতে</em> বোনা জীবন্ত ঐতিহ্য
              </h1>
            ) : (
              <h1 className="font-editorial text-[42px] sm:text-[56px] text-[#3b2a1a] leading-[1.03]">
                Woven from the <em className="text-[#b5502d] italic">soil</em> of Bengal
              </h1>
            )}

            <p className="text-base text-[#3b2a1a]/85 leading-relaxed max-w-md">
              {language === 'bn'
                ? 'নকশিকাঁথা, জামদানি, পোড়ামাটি, বেত-বাঁশ এবং আদিবাসী ও গ্রামীণ কারিগরদের হাতে ধীরে ধীরে গড়া ঐতিহ্যবাহী শিল্পকর্ম।'
                : 'Nakshi kantha, Jamdani, terracotta, folk instruments, and indigenous weaves—made slowly by hand in the villages where each tradition was born.'}
            </p>

            {/* Tactile Crafty CTAs */}
            <div className="pt-2 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => onNavigate('shop')}
                className="craft-btn px-6 py-3 text-sm rounded-[3px] cursor-pointer whitespace-nowrap shrink-0"
              >
                {language === 'bn' ? 'সংগ্রহ দেখুন' : 'Shop the Collection'}
              </button>

              <button
                type="button"
                onClick={() => onNavigate('artisans')}
                className="craft-btn-outline px-6 py-3 text-sm rounded-[3px] cursor-pointer whitespace-nowrap shrink-0"
              >
                {language === 'bn' ? 'কারিগরদের জানুন' : 'Meet the Makers'}
              </button>
            </div>
          </div>

          {/* Right Column: Double-Bordered Tilted Craft Frame (.fr from Prototype) */}
          <div className="lg:col-span-6">
            <div className="craft-frame lg:rotate-1 transition-transform hover:rotate-0">
              <div
                onClick={() => onSelectProduct(heroPlates[activeHeroPlate].productId)}
                className="aspect-[1.4/1] w-full border border-[#8a4b2a]/40 overflow-hidden cursor-pointer relative"
              >
                <CraftArtwork
                  artworkIndex={heroPlates[activeHeroPlate].artworkIndex}
                  className="w-full h-full"
                  showArchivalCaption
                />
              </div>

              <div className="pt-3 px-1 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs italic text-[#8a4b2a]">
                    {tText(heroPlates[activeHeroPlate].region, language)}
                  </p>
                  <h2 className="font-editorial text-xl text-[#3b2a1a]">
                    {tText(heroPlates[activeHeroPlate].title, language)}
                  </h2>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {heroPlates.map((plate, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveHeroPlate(idx)}
                      className={`px-2.5 py-1 text-xs border border-[#8a4b2a] transition-colors cursor-pointer ${
                        activeHeroPlate === idx
                          ? 'bg-[#8a4b2a] text-[#fff3dc]'
                          : 'bg-[#f6ecd4] text-[#3b2a1a] hover:bg-[#e4d3ad]'
                      }`}
                      aria-label={`Show ${plate.title.en}`}
                    >
                      0{idx + 1}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Hand-Picked from the Villages (Matching Screenshot 2 Typography & Ornament) */}
      <section className="px-4 sm:px-8 max-w-[1200px] mx-auto space-y-6">
        <div className="text-center section-ornament">
          <h2 className="font-editorial text-3xl sm:text-[40px] text-[#3b2a1a]">
            {language === 'bn' ? 'গ্রামীণ উঠোন ও তাঁতঘর থেকে সংগৃহীত' : 'Hand-Picked from the Villages'}
          </h2>
          <p className="text-sm text-[#3b2a1a]/70 mt-1">
            {language === 'bn' ? 'প্রতিটি শিল্পকর্মই অনন্য এবং হাতে তৈরি' : 'Each piece is one of a kind'}
          </p>
        </div>

        {/* Interactive Craft Category Filter Chips */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          {CRAFT_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedHomeCategory(cat.id)}
              className={`px-3.5 py-1.5 text-[13px] border border-[#8a4b2a] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                selectedHomeCategory === cat.id
                  ? 'bg-[#8a4b2a] text-[#fff3dc]'
                  : 'bg-[#f6ecd4] text-[#3b2a1a] hover:bg-[#e4d3ad]'
              }`}
            >
              {tText(cat.label, language)}
            </button>
          ))}
        </div>

        {/* 4-Column Rustic Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 pt-2">
          {filteredFeaturedProducts.map((product) => (
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

        <div className="text-center pt-4">
          <button
            type="button"
            onClick={() => onNavigate('shop')}
            className="craft-btn-outline px-6 py-2.5 text-sm rounded-[3px] cursor-pointer"
          >
            {language === 'bn' ? 'সকল ১২টি শিল্পকর্ম দেখুন →' : 'View all crafts →'}
          </button>
        </div>
      </section>

      {/* 3. Artisan Spotlight Box (.story from Prototype) */}
      <section className="px-4 sm:px-8 max-w-[1200px] mx-auto">
        <div className="bg-[#e4d3ad] border-2 border-[#8a4b2a] grid grid-cols-1 lg:grid-cols-12 items-center">
          <div className="lg:col-span-5 p-6">
            <div className="craft-frame aspect-square">
              <CraftArtwork artworkIndex={0} variantShift={0} className="w-full h-full" showArchivalCaption />
            </div>
          </div>

          <div className="lg:col-span-7 p-6 sm:p-8 space-y-4">
            <div className="text-xs font-bold tracking-widest text-[#b5502d]">
              MAKER & COLLECTIVE SPOTLIGHT · {featuredArtisan.verificationStatus.toUpperCase()}
            </div>

            <h2 className="font-editorial text-3xl sm:text-[38px] text-[#3b2a1a] leading-tight">
              {tText(featuredArtisan.name, language)}
            </h2>

            <div className="text-sm italic text-[#3b2a1a]/75">
              {tText(featuredArtisan.location, language)}
            </div>

            <blockquote className="italic bg-[#f6ecd4] p-4 border border-[#8a4b2a]/40 text-[#3b2a1a]">
              {tText(featuredArtisan.quote, language)}
            </blockquote>

            <p className="text-sm text-[#3b2a1a]/85 leading-relaxed">
              {tText(featuredArtisan.biography, language)}
            </p>

            <div className="flex flex-wrap gap-8 pt-2">
              <div>
                <b className="block font-editorial text-3xl text-[#b5502d]">32</b>
                <span className="text-xs text-[#3b2a1a]/75">women in the collective (demo)</span>
              </div>
              <div>
                <b className="block font-editorial text-3xl text-[#b5502d]">3–6</b>
                <span className="text-xs text-[#3b2a1a]/75">weeks per hand-stitched piece</span>
              </div>
              <div>
                <b className="block font-editorial text-3xl text-[#b5502d]">100%</b>
                <span className="text-xs text-[#3b2a1a]/75">hand-embroidered reclaimed mulmul</span>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => onNavigate('artisans')}
                className="craft-btn px-5 py-2.5 text-xs rounded-[3px] cursor-pointer"
              >
                Explore All 6 Makers & Communities
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Indigenous & Ethnic-Community Crafts + Seasonal Harvest Edit */}
      <section className="px-4 sm:px-8 max-w-[1200px] mx-auto space-y-8">
        <div className="text-center section-ornament">
          <h2 className="font-editorial text-3xl sm:text-[38px] text-[#3b2a1a]">
            {language === 'bn'
              ? 'পার্বত্য চট্টগ্রাম ও রাঢ় বাংলার আদিবাসী কারুশিল্প'
              : 'Indigenous & Ethnic-Community Traditions'}
          </h2>
          <p className="text-sm text-[#3b2a1a]/75 max-w-2xl mx-auto mt-1">
            {language === 'bn'
              ? 'চাকমা কোমর-তাঁত (বইন) এবং বীরভূমের সাঁওতাল নারীদের সাবাই ঘাসের বুনন—প্রতিটি জনগোষ্ঠীর নিজস্ব নাম ও প্রেক্ষাপটসহ।'
              : 'Chakma backstrap-loom weaves from Rangamati and Santal Sabai-grass basketry from Birbhum—documented with community attribution.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {indigenousProducts.map((product) => (
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

        {/* Seasonal Sharodiya & Nabanna Banner */}
        <div className="bg-[#e4d3ad] border-2 border-dashed border-[#8a4b2a] p-6 sm:p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-2xl">
            <p className="text-xs font-bold text-[#5d7a4a]">
              {tText(SEASONAL_COLLECTION_META.kicker, language)}
            </p>
            <h3 className="font-editorial text-2xl sm:text-3xl text-[#3b2a1a]">
              {tText(SEASONAL_COLLECTION_META.title, language)}
            </h3>
            <p className="text-sm text-[#3b2a1a]/80">
              {tText(SEASONAL_COLLECTION_META.description, language)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('shop')}
            className="craft-btn px-5 py-2.5 text-xs rounded-[3px] whitespace-nowrap shrink-0 cursor-pointer"
          >
            Explore Seasonal Edit
          </button>
        </div>
      </section>

      {/* 5. Cultural Journal Essays */}
      <section className="px-4 sm:px-8 max-w-[1200px] mx-auto space-y-8">
        <div className="text-center section-ornament">
          <h2 className="font-editorial text-3xl sm:text-[38px] text-[#3b2a1a]">
            {language === 'bn' ? 'সংস্কৃতি ও ঐতিহ্য পত্রিকা' : 'From the Cultural Journal'}
          </h2>
          <p className="text-sm text-[#3b2a1a]/70 mt-1">
            {language === 'bn'
              ? 'বাউলের একতারা, উঠোনের আলপনা ও বয়নকথা'
              : 'Folklore, oral history, and the living hands of Bengal'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stories.map((story) => (
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
                  <p className="text-xs text-[#3b2a1a]/80 leading-relaxed line-clamp-3">
                    {tText(story.excerpt, language)}
                  </p>
                </div>
              </div>
              <div className="pt-3 mt-3 border-t border-dashed border-[#8a4b2a]/35 text-xs font-bold text-[#b5502d] flex items-center gap-1">
                <span>Read Story</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </article>
          ))}
        </div>

        {/* Newsletter Dispatch */}
        <div className="bg-[#e4d3ad] border-2 border-[#8a4b2a] p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-7 space-y-2">
            <h3 className="font-editorial text-2xl sm:text-3xl text-[#3b2a1a]">
              {language === 'bn'
                ? 'বাংলার লোকসংস্কৃতি ও নতুন সংগ্রহের চিঠি'
                : 'Letters from the Courtyards & Looms'}
            </h3>
            <p className="text-sm text-[#3b2a1a]/80">
              {language === 'bn'
                ? 'নতুন হস্তশিল্প, কারিগরদের গল্প এবং ঋতুভিত্তিক উৎসবের খবর পেতে যুক্ত হোন।'
                : 'Receive quiet dispatches on seasonal weaves, field notes from artisan workshops, and essays from our cultural archive.'}
            </p>
          </div>

          <div className="lg:col-span-5">
            {newsletterSubscribed ? (
              <div className="p-3.5 bg-[#f6ecd4] border border-[#5d7a4a] flex items-center gap-2.5 text-xs text-[#3b2a1a]">
                <CheckCircle2 className="w-4 h-4 text-[#5d7a4a] shrink-0" />
                <span>Dhonnobad! Subscribed for cultural dispatches (demo session).</span>
              </div>
            ) : (
              <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-3">
                <label htmlFor="newsletter-input" className="sr-only">
                  Email address
                </label>
                <input
                  id="newsletter-input"
                  type="email"
                  required
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="Your email address..."
                  className="flex-1 bg-[#f6ecd4] border border-[#8a4b2a] text-[#3b2a1a] px-3.5 py-2.5 text-sm focus:outline-none"
                />
                <button
                  type="submit"
                  className="craft-btn px-5 py-2.5 text-xs rounded-[3px] whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Subscribe
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
