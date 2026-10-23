import React from 'react';
import { LanguageCode, MarketCode, PageView } from '../types/heritage';
import { tText, UI_STRINGS } from '../data/translations';

interface FooterProps {
  language: LanguageCode;
  market: MarketCode;
  onNavigate: (view: PageView, filterCategory?: string) => void;
  onLanguageChange: (lang: LanguageCode) => void;
  onMarketChange: (market: MarketCode) => void;
}

export const Footer: React.FC<FooterProps> = ({
  language,
  market,
  onNavigate,
  onLanguageChange,
  onMarketChange,
}) => {
  return (
    <footer className="bg-[#3b2a1a] text-[#efe2c6]/85 border-t border-[#8a4b2a]">
      {/* Woven Craft Frieze Strip */}
      <div className="craft-frieze" aria-hidden="true" />

      <div className="max-w-[1200px] mx-auto px-4 sm:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-10 border-b border-dashed border-[#efe2c6]/25">
          {/* Column 1-2: Brand Identity & Logo */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3.5">
              <img
                src="/assets/aistudio/Logo_of_Roots_of_bengal_b83453ca.jpg"
                alt="Roots of Bengal Official Logo"
                className="w-14 h-14 object-contain bg-[#f6ecd4] p-0.5 border border-[#c9973f] shrink-0"
              />
              <div>
                <h2 className="font-editorial text-2xl text-[#c9973f]">
                  {tText(UI_STRINGS.brandName, language)}
                </h2>
                <p className="text-xs text-[#efe2c6]/85 tracking-wide">
                  {tText(UI_STRINGS.brandTagline, language)}
                </p>
              </div>
            </div>

            <p className="text-sm text-[#efe2c6]/80 leading-relaxed max-w-md">
              {language === 'bn'
                ? 'বাংলার আবহমান লোকশিল্প, তাঁত বুনন, পোড়ামাটি এবং আদিবাসী ও গ্রামীণ কারিগরদের সৃষ্টির এক নির্ভরযোগ্য সাংস্কৃতিক মঞ্চ ও বিপণন কেন্দ্র।'
                : 'Preserving Bengali heritage, one craft at a time. Celebrating handmade traditions, everyday heritage objects, and indigenous community crafts across Bangladesh and West Bengal.'}
            </p>
          </div>

          {/* Column 3: Crafts & Collections */}
          <div className="space-y-3">
            <h3 className="font-editorial text-xl text-[#c9973f]">
              {language === 'bn' ? 'শিল্প ও সংগ্রহ' : 'Crafts & Heritage'}
            </h3>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('shop', 'Nakshi Kantha')}
                  className="hover:text-[#c9973f] transition-colors cursor-pointer"
                >
                  Nakshi Kantha Quilts
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('shop', 'Jamdani & Weaving')}
                  className="hover:text-[#c9973f] transition-colors cursor-pointer"
                >
                  Dhakai Jamdani & Handloom
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('shop', 'Pottery & Terracotta')}
                  className="hover:text-[#c9973f] transition-colors cursor-pointer"
                >
                  Dhamrai & Bishnupur Terracotta
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('shop', 'Indigenous Crafts')}
                  className="hover:text-[#c9973f] transition-colors cursor-pointer"
                >
                  Indigenous Community Crafts
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('shop', 'Traditional Instruments')}
                  className="hover:text-[#c9973f] transition-colors cursor-pointer"
                >
                  Baul Folk Instruments
                </button>
              </li>
            </ul>
          </div>

          {/* Column 4: Cultural Platform */}
          <div className="space-y-3">
            <h3 className="font-editorial text-xl text-[#c9973f]">
              {language === 'bn' ? 'সংস্কৃতি ও কারিগর' : 'Stories & Makers'}
            </h3>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('artisans')}
                  className="hover:text-[#c9973f] transition-colors cursor-pointer"
                >
                  Artisans & Collectives
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('stories')}
                  className="hover:text-[#c9973f] transition-colors cursor-pointer"
                >
                  Cultural Journal
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('about')}
                  className="hover:text-[#c9973f] transition-colors cursor-pointer"
                >
                  About Roots of Bengal
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('about')}
                  className="hover:text-[#c9973f] transition-colors cursor-pointer"
                >
                  Launch Readiness & Architecture
                </button>
              </li>
            </ul>
          </div>

          {/* Column 5: Customer Care & Policies */}
          <div className="space-y-3">
            <h3 className="font-editorial text-xl text-[#c9973f]">
              {language === 'bn' ? 'গ্রাহক সেবা ও নীতিমালা' : 'Care & Policies'}
            </h3>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('orders')}
                  className="hover:text-[#c9973f] transition-colors cursor-pointer"
                >
                  Order History & Tracking
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('wishlist')}
                  className="hover:text-[#c9973f] transition-colors cursor-pointer"
                >
                  Saved Wishlist
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('policies')}
                  className="hover:text-[#c9973f] transition-colors cursor-pointer"
                >
                  Shipping, Returns & FAQs
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('contact')}
                  className="hover:text-[#c9973f] transition-colors cursor-pointer"
                >
                  Contact & Maker Onboarding
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Legal, Regional Settings & Transparency Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#efe2c6]/75">
          <div className="space-y-1">
            <p>
              <b className="text-[#c9973f]">Roots of Bengal</b> · Preserving Bengali heritage, one craft at a time.
            </p>
            <p className="text-[#c9973f]/90">
              {tText(UI_STRINGS.demoDataNotice, language)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <span>
              Active Market:{' '}
              <strong className="text-[#efe2c6]">
                {market === 'BD' ? 'Bangladesh (৳ BDT)' : market === 'IN' ? 'India (₹ INR)' : 'International'}
              </strong>
            </span>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => onLanguageChange(language === 'en' ? 'bn' : 'en')}
              className="underline hover:text-[#c9973f] cursor-pointer"
            >
              {language === 'en' ? 'বাংলায় দেখুন' : 'Switch to English'}
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => onMarketChange(market === 'BD' ? 'IN' : 'BD')}
              className="underline hover:text-[#c9973f] cursor-pointer"
            >
              {market === 'BD' ? 'Switch to India (₹ INR)' : 'Switch to Bangladesh (৳ BDT)'}
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
