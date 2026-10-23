import React from 'react';
import { CheckCircle2, Clock, AlertCircle, Layers, Globe2, ShieldCheck } from 'lucide-react';
import { LanguageCode, PageView } from '../types/heritage';
import { tText, UI_STRINGS } from '../data/translations';

interface AboutPageProps {
  language: LanguageCode;
  onNavigate: (view: PageView) => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({ language, onNavigate }) => {
  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-8 py-10 sm:py-12 space-y-14">
      {/* 1. Brand Story Header */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-[#e4d3ad] border-2 border-[#8a4b2a] p-6 sm:p-10">
        <div className="lg:col-span-7 space-y-4">
          <small className="text-xs font-bold tracking-widest text-[#b5502d] uppercase block">
            {language === 'bn'
              ? 'আমাদের কথা · সংস্কৃতি ও কারুশিল্পের সেতুবন্ধন'
              : 'About Roots of Bengal · Cultural Stewardship'}
          </small>
          <h1 className="font-editorial text-3xl sm:text-5xl text-[#3b2a1a] leading-tight">
            {tText(UI_STRINGS.brandTagline, language)}
          </h1>
          <p className="text-base text-[#3b2a1a]/85 leading-relaxed">
            {language === 'bn'
              ? 'রুটস অব বেঙ্গল কেবল একটি ই-কমার্স বিপণি নয়; এটি বাংলার আবেগ, লোকজ ঐতিহ্য, কারিগরদের সম্মান এবং আদিবাসী ও গ্রামীণ সমাজের নিত্যদিনের সৃষ্টির এক জীবন্ত সংরক্ষণাগার।'
              : 'Roots of Bengal exists to bridge living Bengali heritage with contemporary homes—celebrating artisans, rural craft lineages, and indigenous communities across Bangladesh, West Bengal, and neighboring regions.'}
          </p>
        </div>

        <div className="lg:col-span-5 craft-frame p-6 flex flex-col items-center text-center space-y-3">
          <img
            src="/assets/aistudio/Logo_of_Roots_of_bengal_b83453ca.jpg"
            alt="Roots of Bengal Emblem — Ektara and Alpana Mandala"
            className="w-36 h-36 object-contain border border-[#8a4b2a]/35 bg-[#f6ecd4] p-2"
          />
          <div className="space-y-1">
            <h2 className="font-editorial text-2xl text-[#b5502d]">
              The Ektara & The Alpana
            </h2>
            <p className="text-xs text-[#3b2a1a]/80 max-w-sm leading-relaxed">
              Our emblem unites the wandering Baul’s single-stringed Ektara with the sacred geometry of courtyard Alpana drawings.
            </p>
          </div>
        </div>
      </section>

      {/* 2. Core Brand Pillars */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="craft-card p-6 space-y-2.5">
          <Globe2 className="w-5 h-5 text-[#b5502d]" />
          <h2 className="font-editorial text-2xl text-[#3b2a1a]">
            Regional & Community Pluralism
          </h2>
          <p className="text-xs sm:text-sm text-[#3b2a1a]/80 leading-relaxed">
            From Jamdani weavers in Rupganj and terracotta potters in Dhamrai to Bishnupur silk weavers, Chakma Bain-loom collectives in Rangamati, and Santal fiber artisans in Birbhum, each community is credited in its specific geographic and cultural context.
          </p>
        </div>

        <div className="craft-card p-6 space-y-2.5">
          <ShieldCheck className="w-5 h-5 text-[#b5502d]" />
          <h2 className="font-editorial text-2xl text-[#3b2a1a]">
            Honest Sourcing & Zero Hype
          </h2>
          <p className="text-xs sm:text-sm text-[#3b2a1a]/80 leading-relaxed">
            We do not publish unverified fair-trade claims, invented artisan income percentages, or fabricated customer reviews. Every maker profile and product specification clearly distinguishes verified field documentation from demonstration placeholders.
          </p>
        </div>

        <div className="craft-card p-6 space-y-2.5">
          <Layers className="w-5 h-5 text-[#b5502d]" />
          <h2 className="font-editorial text-2xl text-[#3b2a1a]">
            Everyday Living, Not a Museum
          </h2>
          <p className="text-xs sm:text-sm text-[#3b2a1a]/80 leading-relaxed">
            Heritage survives when it is used, worn, and loved daily—a clay kolshi cooling drinking water, a cane basket holding household linens, or a hand-stitched Nakshi Kantha passed down across generations.
          </p>
        </div>
      </section>

      {/* 3. Prototype Audit & Architectural Improvements */}
      <section className="bg-[#e4d3ad] border-2 border-[#8a4b2a] p-6 sm:p-8 space-y-6">
        <div className="border-b border-dashed border-[#8a4b2a] pb-4 space-y-1">
          <small className="text-xs font-bold tracking-widest text-[#b5502d] uppercase block">
            Engineering & Launch Readiness Documentation
          </small>
          <h2 className="font-editorial text-3xl sm:text-4xl text-[#3b2a1a]">
            Prototype Transformation, System Status & Pre-Launch Checklist
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 text-xs">
          <div className="bg-[#f6ecd4] border border-[#8a4b2a]/50 p-5 space-y-3">
            <div className="flex items-center gap-2 text-[#5d7a4a] font-bold text-sm">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <h3>Functional in This Frontend</h3>
            </div>
            <ul className="space-y-2 text-[#3b2a1a]/85 leading-relaxed">
              <li>• Authentic rustic craft palette (`#efe2c6` dotted paper, `#f6ecd4`, `#b5502d` terracotta, `#8a4b2a` clay) and `IM Fell English` woodblock display typography.</li>
              <li>• Decoupled Language Switcher (English, বাংলা Bengali, অসমীয়া Assamese Beta) & Market Switcher (`BD · ৳ BDT`, `IN · ₹ INR`, `INTL`).</li>
              <li>• Multi-attribute Shop filtering, persistent Shopping Bag, Wishlist, Quick View, and Country-specific Checkout forms.</li>
            </ul>
          </div>

          <div className="bg-[#f6ecd4] border border-[#8a4b2a]/50 p-5 space-y-3">
            <div className="flex items-center gap-2 text-[#8a4b2a] font-bold text-sm">
              <Clock className="w-4 h-4 shrink-0" />
              <h3>Awaiting Backend Integration</h3>
            </div>
            <ul className="space-y-2 text-[#3b2a1a]/85 leading-relaxed">
              <li>• <strong>Payment Gateways:</strong> Server-side integration with SSLCommerz / bKash / Nagad (BDT) and Razorpay / UPI (INR).</li>
              <li>• <strong>Live Inventory & CMS:</strong> Database synchronization for one-of-a-kind textiles across markets.</li>
              <li>• <strong>Courier APIs:</strong> Automated waybill generation with domestic and international carriers.</li>
            </ul>
          </div>

          <div className="bg-[#f6ecd4] border border-[#8a4b2a]/50 p-5 space-y-3">
            <div className="flex items-center gap-2 text-[#b5502d] font-bold text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <h3>Required Business Assets Before Launch</h3>
            </div>
            <ul className="space-y-2 text-[#3b2a1a]/85 leading-relaxed">
              <li>• <strong>Verified Product Photography:</strong> High-resolution photographs of physical inventory to replace archival SVG plates.</li>
              <li>• <strong>Signed Maker Consent:</strong> Field-verified artisan profiles and community permissions.</li>
              <li>• <strong>Legal Registration:</strong> Trade license, tax numbers, and counsel-reviewed policies.</li>
            </ul>
          </div>
        </div>

        <div className="pt-2 flex flex-wrap items-center justify-between gap-4 border-t border-dashed border-[#8a4b2a] text-xs text-[#3b2a1a]/80">
          <span>
            <strong>Local Setup:</strong> <code className="bg-[#f6ecd4] px-1.5 py-0.5 border border-[#8a4b2a]/40">npm install</code> → <code className="bg-[#f6ecd4] px-1.5 py-0.5 border border-[#8a4b2a]/40">npm run dev</code>
          </span>
          <button
            type="button"
            onClick={() => onNavigate('shop')}
            className="craft-btn px-5 py-2.5 text-xs rounded-[3px] cursor-pointer"
          >
            Explore Demonstration Catalogue →
          </button>
        </div>
      </section>
    </div>
  );
};
